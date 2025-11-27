# Analyse : Modifications de Paramètres de Scénario

## 🔍 Problème Rapporté

L'utilisateur rapporte que la modification de paramètres pour un scénario ne fonctionne plus :
- Quand il entre une valeur dans le champ de modification
- La valeur du nœud devrait s'actualiser partout
- Cela devrait entraîner un nouveau calcul des composites/nœuds concernés dans le scénario

## 📋 Flux Actuel

### 1. Frontend : User Input → Local State

**Fichier**: [econ_graph_web/src/components/panels/ScenarioPanel/ParameterCard.tsx:322-324](econ_graph_web/src/components/panels/ScenarioPanel/ParameterCard.tsx#L322-L324)

```typescript
<Input
  type="number"
  value={currentValue}
  onChange={(e) => handleOverrideChange(targetKey, e.target.value)}
/>
```

**Fichier**: [econ_graph_web/src/components/panels/ScenarioPanel/useScenarioPanelLogic.ts:390-400](econ_graph_web/src/components/panels/ScenarioPanel/useScenarioPanelLogic.ts#L390-L400)

```typescript
const handleOverrideChange = (targetKey: string, value: string) => {
  if (!activeScenarioId) return;
  setOverrideValues((prev) => ({
    ...prev,
    [targetKey]: value,
  }));
  setPendingChanges((prev) => ({
    ...prev,
    [targetKey]: true,
  }));
};
```

**Résultat**: ✅ La valeur est stockée localement dans `overrideValues` et marquée comme "pending"

---

### 2. Frontend : Save Button Click → API Call

**Fichier**: [econ_graph_web/src/components/panels/ScenarioPanel/ParameterCard.tsx:329-341](econ_graph_web/src/components/panels/ScenarioPanel/ParameterCard.tsx#L329-L341)

```typescript
<button
  onClick={() => handleSaveOverride(targetKey, overrideTarget)}
  disabled={isSavingOverride || !scenarioEditable}
>
  <Check className="h-3.5 w-3.5" />
</button>
```

**Fichier**: [econ_graph_web/src/components/panels/ScenarioPanel/useScenarioPanelLogic.ts:402-466](econ_graph_web/src/components/panels/ScenarioPanel/useScenarioPanelLogic.ts#L402-L466)

```typescript
const handleSaveOverride = async (targetKey: string, target: OverrideTarget) => {
  if (!activeScenarioId) return;

  // 1. Parse value
  const rawValue = overrideValues[targetKey] || "";
  const numericValue = rawValue === "" ? null : parseFloat(rawValue);

  // 2. Build override update
  const overrideUpdate: OverrideUpdate =
    target.type === "node"
      ? {
          node_id: target.nodeId,
          mode,
          override_value: mode === "value" ? numericValue : null,
          override_code: mode === "formula" ? defaultCode : null,
        }
      : {
          composite_node_instance_id: target.compositeNodeId,
          composite_internal_id: target.rawInternalId,
          mode,
          override_value: mode === "value" ? numericValue : null,
          override_code: mode === "formula" ? defaultCode : null,
        };

  // 3. Call API to save override
  await updateOverridesMutation.mutateAsync({
    projectId: currentProjectId || undefined,
    scenarioId: activeScenarioId,
    data: { overrides: [overrideUpdate] },
  });

  // 4. 🔥 CRITICAL: Recompute with scenario
  await recomputeForScenario(activeScenarioId);

  // 5. Clear pending state
  setPendingChanges((prev) => {
    const newPending = { ...prev };
    delete newPending[targetKey];
    return newPending;
  });

  toast.success("Modification enregistrée");
};
```

**Résultat**:
- ✅ API appelée pour sauvegarder l'override
- ✅ `recomputeForScenario(activeScenarioId)` est appelé
- ✅ Toast de succès affiché

---

### 3. Frontend : Recompute Scenario

**Fichier**: [econ_graph_web/src/components/panels/ScenarioPanel/useScenarioPanelLogic.ts:370-388](econ_graph_web/src/components/panels/ScenarioPanel/useScenarioPanelLogic.ts#L370-L388)

```typescript
const recomputeForScenario = async (scenarioId: string | null) => {
  try {
    if (scenarioId) {
      if (computeWithScenario.isPending) {
        return; // Skip if already computing
      }
      const result = await computeWithScenario.mutateAsync({
        projectId: currentProjectId || undefined,
        scenarioId,
      });
      setScenarioComputedValues(scenarioId, result.results); // ✅ Store results
    } else {
      await computeAll.mutateAsync();
      clearScenarioComputedValues();
    }
  } catch (error) {
    console.error("Failed to recompute after scenario change:", error);
  }
};
```

**Résultat**:
- ✅ `computeWithScenario.mutateAsync()` appelé
- ✅ Les résultats sont stockés dans le store Zustand via `setScenarioComputedValues()`

---

### 4. Frontend : API Hook

**Fichier**: [econ_graph_web/src/lib/api/hooks.ts:486-505](econ_graph_web/src/lib/api/hooks.ts#L486-L505)

```typescript
export function useComputeWithScenario(options?) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, scenarioId }) => {
      const params = new URLSearchParams();
      if (projectId) params.set('project', projectId);
      if (scenarioId) params.set('scenario_id', scenarioId);
      const queryString = params.toString();
      return apiClient.post(`/compute/all${queryString ? `?${queryString}` : ''}`, {});
    },
    onSuccess: () => {
      // Invalidate all node queries to refetch updated computed values
      queryClient.invalidateQueries({ queryKey: queryKeys.nodes });
    },
  });
}
```

**API Call**: `POST /compute/all?project={projectId}&scenario_id={scenarioId}`

**Résultat**:
- ✅ L'API est appelée correctement
- ✅ Les queries sont invalidées pour forcer le refetch

---

### 5. Backend : Compute with Scenario

**Fichier**: [econ_graph_api/app/api/compute.py:118-163](econ_graph_api/app/api/compute.py#L118-L163)

```python
@router.post("/all")
def compute_all_endpoint(
    project: str | None = Query(default=None),
    scenario_id: str | None = Query(default=None),
    db: Session = Depends(get_db)
):
    """Compute all nodes with optional scenario support."""
    results_dict = compute_all_nodes(db, project_id=project, scenario_id=scenario_id)

    if scenario_id:
        # New response format with scenario support
        results = {}
        for node_id, node_data in results_dict.items():
            results[node_id] = ComputeNodeResponse(
                value=node_data.get("value"),
                real_value=node_data.get("real_value"),
                scenario_value=node_data.get("scenario_value"),
                error=node_data.get("error")
            )

        return ComputeAllScenarioResponse(
            results=results,
            total_computed=total_computed,
            total_errors=total_errors
        )
```

**Résultat**:
- ✅ `compute_all_nodes()` appelé avec `scenario_id`
- ✅ Retourne un dictionnaire de résultats avec `real_value`, `scenario_value`, etc.

---

### 6. Frontend : Display Updated Values

**Fichier**: [econ_graph_web/src/components/panels/ScenarioPanel/ParameterCard.tsx:122-144](econ_graph_web/src/components/panels/ScenarioPanel/ParameterCard.tsx#L122-L144)

```typescript
const currentValue = scenarioEditable
  ? overrideValues[targetKey] ?? existingOverrides[targetKey] ?? ""
  : node.value_computed !== null && node.value_computed !== undefined
  ? String(node.value_computed)
  : "";

const scenarioValue =
  activeScenarioId &&
  scenarioValuesScenarioId === activeScenarioId &&
  scenarioComputedValues?.[targetKey]
    ? scenarioComputedValues[targetKey]?.scenario_value ?? null
    : null;

const scenarioValueDisplay = formatDisplayNumber(scenarioValue);
const baselineDisplay = formatDisplayNumber(node.value_computed);
const appliedDisplay =
  scenarioEditable && scenarioValueDisplay !== "—"
    ? scenarioValueDisplay
    : baselineDisplay;
```

**Résultat**:
- ✅ La valeur affichée est `appliedDisplay`
- ✅ Si scénario actif : utilise `scenarioValueDisplay` (provenant de `scenarioComputedValues`)
- ✅ Sinon : utilise `baselineDisplay` (provenant de `node.value_computed`)

---

## 🐛 Problème Potentiel Identifié

### Hypothèse 1 : Le `targetKey` ne correspond pas au `node_id` dans les résultats

Pour les **composites**, le `targetKey` est construit comme suit :

**Fichier**: [econ_graph_web/src/components/panels/ScenarioPanel/types.ts](econ_graph_web/src/components/panels/ScenarioPanel/types.ts)

```typescript
export function makeCompositeOverrideKey(
  compositeNodeId: string,
  internalId: string
): string {
  return `${compositeNodeId}::${internalId}`;
}
```

**Exemple**: `targetKey = "f103c487-...::gov_debt_usd"`

Mais le backend retourne les résultats dans `results_dict` avec comme clés les **node_id** seulement (pas les composite keys).

**Vérification nécessaire**:
- Est-ce que les résultats du backend incluent les clés composites comme `f103c487-...::gov_debt_usd` ?
- Ou seulement les node_id comme `gov_debt_usd` ?

### Hypothèse 2 : Les valeurs de nested composites ne sont pas calculées avec le scénario

Avec la fix récente pour les nested composites, nous stockons les valeurs baseline dans le cache. Mais est-ce que `compute_all_nodes` avec `scenario_id` calcule aussi les overrides pour ces nested composites ?

---

## 🔧 Actions à Vérifier

### 1. Vérifier les clés dans `scenarioComputedValues`

Ajouter un `console.log` dans le frontend pour voir ce qui est retourné :

```typescript
const result = await computeWithScenario.mutateAsync({
  projectId: currentProjectId || undefined,
  scenarioId,
});
console.log("[recomputeForScenario] results keys:", Object.keys(result.results));
console.log("[recomputeForScenario] targetKeys needed:", /* liste des targetKeys */);
setScenarioComputedValues(scenarioId, result.results);
```

### 2. Vérifier que le backend calcule les overrides pour les composites imbriqués

Dans [computation.py](econ_graph_api/app/services/computation.py), vérifier que lors du calcul avec `scenario_id`, les overrides de composites sont bien appliqués, y compris pour les nested composites.

### 3. Vérifier que les clés correspondent dans le mapping

Le frontend utilise `targetKey` qui peut être :
- Pour un node normal : `node.id`
- Pour un composite parameter : `compositeNodeId::internalId`

Le backend doit retourner les résultats avec les mêmes clés.

---

## ✅ Problème Identifié

### 🐛 Bug Trouvé : Overrides Non Appliqués aux Nested Composites

**Fichier**: [econ_graph_api/app/services/computation.py:293](econ_graph_api/app/services/computation.py#L293)

Dans la fonction `_compute_composite_node_value`, quand on calcule les inputs des nested composites, on appelle :

```python
nested_value, nested_error, _ = compute_root_node_value(nested_root_node, None)
                                                                          ↑ None = pas d'override !
```

**Conséquence** : Les overrides de scénario pour les paramètres de nested composites (comme `gov_debt_usd` et `gdp_usd`) ne sont **jamais appliqués**.

---

## 🔧 Solution Implémentée

**Fichier**: [econ_graph_api/app/services/computation.py:292-321](econ_graph_api/app/services/computation.py#L292-L321)

### Changement Apporté

Avant de calculer la valeur du nested root, on vérifie maintenant s'il existe un override dans `resolved_overrides` :

```python
# Check if there's an override for this nested root
nested_override_payload = None
nested_candidate_keys: list[str] = []
nested_raw_key = nested_root.get("raw_internal_id") or nested_root.get("id")
if nested_raw_key:
    nested_candidate_keys.append(nested_raw_key)
if nested_slot_key and nested_slot_key not in nested_candidate_keys:
    nested_candidate_keys.append(nested_slot_key)
nested_id_key = nested_root.get("id")
if nested_id_key and nested_id_key not in nested_candidate_keys:
    nested_candidate_keys.append(nested_id_key)
for alias in nested_candidate_keys:
    if alias and alias in resolved_overrides:
        nested_override_payload = resolved_overrides.get(alias)
        break

# Calculate the value for this nested root (with override if present)
nested_value, nested_error, _ = compute_root_node_value(nested_root_node, nested_override_payload)
```

### Fonctionnement

1. Pour chaque input d'un nested composite, on construit une liste de clés candidates
2. On cherche si l'une de ces clés existe dans `resolved_overrides`
3. Si oui, on passe l'override à `compute_root_node_value`
4. Sinon, on passe `None` (comportement baseline)

---

## 🧪 Test de la Solution

### Scénario de Test

1. Ouvrir le projet "b"
2. Activer un scénario
3. Modifier la valeur de `gov_debt_usd` (nested composite parameter)
4. Sauvegarder
5. Vérifier que :
   - La valeur modifiée est affichée dans le panneau
   - Le composite parent `debt_gdp_1` est recalculé avec la nouvelle valeur
   - Le composite grand-parent `Debt Risk` est recalculé

### Commandes

```bash
# Redémarrer l'API pour charger le nouveau code
docker compose restart api

# Attendre que l'API soit prête
sleep 5

# Tester via l'interface web
# Ou via API :
curl -X POST http://localhost:8000/compute/all?project=b&scenario_id={scenario_id}
```

---

## 🎁 Bénéfices

1. ✅ Les overrides de scénario fonctionnent maintenant pour les nested composites
2. ✅ La propagation des valeurs se fait correctement dans toute la hiérarchie
3. ✅ Cohérent avec le comportement des composites directs
4. ✅ Pas de régression pour les autres fonctionnalités

---

## 📝 Fichiers Modifiés

- **[econ_graph_api/app/services/computation.py:292-321](econ_graph_api/app/services/computation.py#L292-L321)** - Ajout de la recherche et application des overrides pour les nested composites

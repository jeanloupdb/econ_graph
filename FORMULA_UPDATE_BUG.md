# Bug : Modification de Formule de Scénario Ne Met Pas à Jour l'Affichage

## 🐛 Problème Rapporté

Quand l'utilisateur modifie l'**algorithme** (formule) d'un paramètre dans un scénario :

**Exemple** : Paramètre `pib_la` avec formule `return real_value * 0.1`

1. L'utilisateur change la formule à `return real_value * 0.2`
2. L'utilisateur clique sur "Enregistrer"
3. ❌ La valeur dans le panneau "Scenario & Réglages" **ne se met PAS à jour**
4. ❌ La valeur dans le canvas **ne se met PAS à jour**

## 🔍 Analyse du Flux Actuel

### 1. Modification de la Formule

**Fichier** : [ParameterCard.tsx:460-471](econ_graph_web/src/components/panels/ScenarioPanel/ParameterCard.tsx#L460-L471)

```typescript
<CodeEditor
  onChange={(val) => {
    const lines = val.split("\n");
    const bodyLines = lines.slice(1);
    const body = bodyLines
      .map((line) => line.startsWith("    ") ? line.slice(4) : line)
      .join("\n");
    setOverrideCodes((prev) => ({
      ...prev,
      [targetKey]: body,  // Stocke le nouveau code
    }));
  }}
/>
```

**Résultat** : Le code est stocké dans `overrideCodes[targetKey]`

❌ **Problème** : `setPendingChanges` n'est PAS appelé, donc l'utilisateur ne voit pas que la modification est en attente

---

### 2. Sauvegarde de la Formule

**Fichier** : [useScenarioPanelLogic.ts:402-466](econ_graph_web/src/components/panels/ScenarioPanel/useScenarioPanelLogic.ts#L402-L466)

```typescript
const handleSaveOverride = async (targetKey: string, target: OverrideTarget) => {
  // 1. Récupère le code modifié
  const code = overrideCodes[targetKey] ?? persistedOverride?.override_code ?? "";
  const defaultCode = code || "return real_value * 0.8";

  // 2. Construit l'override
  const overrideUpdate: OverrideUpdate = {
    mode: "formula",
    override_code: defaultCode,
    // ...
  };

  // 3. Sauvegarde via API
  await updateOverridesMutation.mutateAsync({
    projectId: currentProjectId,
    scenarioId: activeScenarioId,
    data: { overrides: [overrideUpdate] },
  });

  // 4. ✅ Recalcule le scénario
  await recomputeForScenario(activeScenarioId);

  // 5. Nettoie les pending changes
  setPendingChanges((prev) => {
    const newPending = { ...prev };
    delete newPending[targetKey];
    return newPending;
  });
};
```

**Résultat** :
- ✅ La formule est sauvegardée dans la DB
- ✅ `recomputeForScenario` est appelé
- ✅ Les valeurs sont recalculées côté backend
- ✅ `scenarioComputedValues` est mis à jour

❓ **Question** : Pourquoi l'affichage ne se met pas à jour alors ?

---

### 3. Affichage de la Valeur

**Fichier** : [ParameterCard.tsx:132-152](econ_graph_web/src/components/panels/ScenarioPanel/ParameterCard.tsx#L132-L152)

```typescript
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

const validationResult = validation?.ok && validation.message.includes("Résultat:")
  ? validation.message.replace("Résultat: ", "")
  : null;
const formulaDisplayValue = validationResult ?? appliedDisplay;
```

**En mode formule**, la valeur affichée est :
1. `validationResult` (si l'utilisateur a cliqué sur le bouton "Recalculer" pour tester)
2. Sinon, `appliedDisplay` qui provient de `scenarioComputedValues[targetKey]?.scenario_value`

**Donc** : Si `scenarioComputedValues` est bien mis à jour, l'affichage devrait se mettre à jour !

---

## 🔍 Hypothèses

### Hypothèse 1 : La Clé Ne Correspond Pas

Pour les **nodes normaux** : `targetKey = node.id`
Pour les **composite parameters** : `targetKey = composite::{composite_node_id}::{internal_id}`

Le backend retourne-t-il les résultats avec la bonne clé ?

**Vérification** : Regarder les clés dans `scenarioComputedValues` après `recomputeForScenario`

---

### Hypothèse 2 : Le Composant Ne Se Re-Render Pas

Peut-être que même si `scenarioComputedValues` est mis à jour dans le store Zustand, le composant `ParameterCard` ne se re-render pas ?

**Vérification** :
- `useScenarioPanelLogic` lit `scenarioComputedValues` du store
- Il le passe à `ParameterCard` via props
- Si le store change, `useScenarioPanelLogic` devrait se re-render
- Et donc `ParameterCard` devrait recevoir les nouvelles props

---

### Hypothèse 3 : L'Override N'Est Pas Appliqué Côté Backend

Peut-être que le backend ne calcule pas correctement la valeur avec la nouvelle formule ?

**Vérification** : Regarder les logs backend pour voir si la formule est bien appliquée

---

## 🧪 Tests de Débogage

### Test 1 : Vérifier les Clés dans scenarioComputedValues

Ajouter un `console.log` dans `recomputeForScenario` :

```typescript
const result = await computeWithScenario.mutateAsync({
  projectId: currentProjectId,
  scenarioId,
});
console.log('[recomputeForScenario] result keys:', Object.keys(result.results));
console.log('[recomputeForScenario] looking for targetKey:', targetKey);
console.log('[recomputeForScenario] found:', result.results[targetKey]);
setScenarioComputedValues(scenarioId, result.results);
```

---

### Test 2 : Vérifier le Re-Render

Ajouter un `console.log` dans `ParameterCard` :

```typescript
console.log('[ParameterCard] rendering', {
  targetKey,
  scenarioValue,
  scenarioValueDisplay,
  appliedDisplay,
  formulaDisplayValue,
});
```

---

### Test 3 : Vérifier l'Override Côté Backend

Regarder les logs backend après la sauvegarde :

```bash
docker compose logs api | grep -A 10 "override_code"
```

---

## 🔧 Solutions Potentielles

### Solution 1 : Marquer le Code Comme Pending Change

Modifier `ParameterCard.tsx` pour appeler `setPendingChanges` quand le code change :

```typescript
<CodeEditor
  onChange={(val) => {
    // ... extrait le body ...
    setOverrideCodes((prev) => ({
      ...prev,
      [targetKey]: body,
    }));
    // ✅ Ajouter ceci :
    setPendingChanges((prev) => ({
      ...prev,
      [targetKey]: true,
    }));
  }}
/>
```

**Bénéfice** : L'utilisateur voit que la modification est en attente (bouton "Enregistrer" mis en évidence)

---

### Solution 2 : Forcer le Re-Render Après Sauvegarde

Peut-être que le problème est un timing issue. Essayer de forcer un re-render :

```typescript
await recomputeForScenario(activeScenarioId);

// Force re-render by updating a dummy state
setValidationResults((prev) => ({ ...prev }));
```

---

### Solution 3 : Invalider et Refetch Exposed Roots

Peut-être que le `node.value_computed` (baseline) doit aussi être refetch ?

```typescript
await recomputeForScenario(activeScenarioId);

// Refetch exposed roots to update baseline values
queryClient.invalidateQueries({ queryKey: queryKeys.projectExposedRoots(currentProjectId) });
```

---

## 📝 Prochaines Étapes

1. Ajouter des logs pour identifier le problème exact
2. Vérifier que les clés correspondent
3. Implémenter la solution appropriée

---

## 🎯 Fix Temporaire (Workaround)

En attendant le fix, l'utilisateur peut :
1. Modifier la formule
2. Cliquer sur "Enregistrer"
3. **Cliquer sur le bouton "Recalculer"** (icône refresh) pour voir le résultat
4. OU **Rafraîchir la page** (Ctrl+R) pour recharger toutes les valeurs

Le bouton "Recalculer" exécute la formule et affiche le résultat dans `validationResult`, qui a la priorité sur `appliedDisplay`.

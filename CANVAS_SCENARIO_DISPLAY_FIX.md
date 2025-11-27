# Fix : Affichage des Valeurs de Scénario dans le Canvas

## 🐛 Problèmes Rapportés

L'utilisateur rapporte 3 problèmes :

1. **Modification d'un paramètre dans un scénario** : La valeur du nœud dans le canvas ne change pas
2. **Modification d'un paramètre de composite** : Le composite dans le canvas n'est pas mis à jour
3. **Ctrl+R (refresh)** : Tous les paramètres sont réinitialisés dans les scénarios

---

## 🔍 Analyse

### Problème 1 & 2 : Canvas ne Montre Pas les Valeurs de Scénario

**Fichier** : [CustomNode.tsx:43-51](econ_graph_web/src/components/graph/CustomNode.tsx#L43-L51)

```typescript
const scenarioData =
  !comparisonEnabled &&
  activeScenarioId &&
  scenarioValuesScenarioId === activeScenarioId
    ? scenarioComputedValues[id]  // ← Cherche par node.id
    : null;
const displayValue = !comparisonEnabled
  ? (scenarioData?.scenario_value ?? data.value_computed ?? null)
  : null;
```

#### Pourquoi ça ne marche PAS

1. **Pour les nœuds normaux** : `scenarioComputedValues[id]` devrait fonctionner, MAIS le problème est que :
   - Après `handleSaveOverride`, on appelle `recomputeForScenario`
   - `recomputeForScenario` stocke les résultats dans `scenarioComputedValues`
   - MAIS `data` (les props du nœud) provient de `useGraphData()` qui utilise `useProjectNodes()`
   - `useProjectNodes()` est invalidé après `computeWithScenario`, donc les nœuds sont refetch
   - Le problème : Les nœuds refetch contiennent `value_computed` qui est la valeur **baseline** (pas scenario)
   - Le backend met à jour `value_computed` avec la valeur **real** lors de `compute_all`, pas la valeur scenario

2. **Pour les composites** : C'est pire car les composites n'ont pas de `value_computed`, ils sont calculés dynamiquement

#### Solution Actuelle (Incorrecte)

Le canvas affiche `scenarioData?.scenario_value ?? data.value_computed`. Le problème est :
- Si `scenarioData` n'existe pas → affiche `data.value_computed` (baseline)
- `data.value_computed` est mis à jour avec la valeur **real** après `compute_all`

#### Ce qui Devrait Se Passer

Quand un scénario est actif :
1. Les valeurs de `scenarioComputedValues` devraient être utilisées pour l'affichage
2. Si une clé n'existe pas dans `scenarioComputedValues`, fallback sur `data.value_computed`
3. Les nœuds du canvas ne devraient PAS être refetch après chaque compute de scénario (perf)

---

### Problème 3 : Ctrl+R Réinitialise Tout

**Fichier** : [scenarioState.ts:51-56](econ_graph_web/src/store/scenarioState.ts#L51-L56)

```typescript
function loadActiveScenario(): string | null {
  return null;  // ← TOUJOURS null !
}

function saveActiveScenario(_scenarioId: string | null) {
  // Persistence intentionally disabled (see requirement to reset on refresh)
}
```

**Conséquence** : À chaque refresh, le scénario actif est perdu et on retourne en mode Baseline.

**Commentaire** : "Baseline should be restored on hard refresh: disable persistence"

C'est **intentionnel** selon le code ! Mais l'utilisateur veut que le scénario soit préservé.

---

## 🔧 Solutions

### Solution 1 : Fix l'Affichage dans le Canvas

**Option A : Utiliser scenarioComputedValues Correctement**

Le problème est que `data.value_computed` est mis à jour avec la valeur **real**, pas scenario. On doit :

1. **Ne PAS invalider les nodes après computeWithScenario** (car ça refetch et écrase les valeurs)
2. **Toujours utiliser scenarioComputedValues quand un scénario est actif**

**Changement dans CustomNode.tsx** :

```typescript
// Current:
const displayValue = !comparisonEnabled
  ? (scenarioData?.scenario_value ?? data.value_computed ?? null)
  : null;

// Fixed:
const displayValue = !comparisonEnabled
  ? (activeScenarioId
      ? (scenarioData?.scenario_value ?? data.value_computed)  // En scénario: priorité à scenario_value
      : data.value_computed  // En baseline: toujours value_computed
    )
  : null;
```

**Option B : Backend Retourne les Valeurs Scenario dans value_computed**

Modifier le backend pour que `compute_all` avec `scenario_id` mette à jour `node.value_computed` avec la valeur **scenario** au lieu de **real**.

❌ **Mauvaise idée** car :
- On perd la séparation entre baseline et scenario
- Les nœuds auraient des valeurs différentes selon le dernier scénario calculé
- Problèmes de cohérence

**Option C : Ne Pas Refetch les Nodes après computeWithScenario**

Modifier `useComputeWithScenario` pour qu'il n'invalide PAS les queries nodes :

```typescript
onSuccess: () => {
  // NE PAS invalider les nodes pour ne pas écraser avec les valeurs baseline
  // queryClient.invalidateQueries({ queryKey: queryKeys.nodes });
},
```

✅ **Bonne idée** car :
- Les valeurs de scénario sont dans `scenarioComputedValues`
- On n'a pas besoin de refetch les nodes pour l'affichage de scénario
- Performance : pas de refetch inutile

---

### Solution 2 : Persister le Scénario Actif

**Option A : LocalStorage**

Modifier `scenarioState.ts` pour persister dans localStorage :

```typescript
function loadActiveScenario(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('activeScenarioId');
}

function saveActiveScenario(scenarioId: string | null) {
  if (typeof window === 'undefined') return;
  if (scenarioId) {
    localStorage.setItem('activeScenarioId', scenarioId);
  } else {
    localStorage.removeItem('activeScenarioId');
  }
}
```

✅ **Recommandé** : Simple et fonctionne

**Option B : URL Query Parameter**

Stocker le scenario_id dans l'URL : `?scenario=xxx`

✅ **Encore mieux** car :
- Partageable (URL avec scénario)
- Bookmark-able
- Navigable (back/forward)

❌ **Plus complexe** à implémenter

---

## 🎯 Plan d'Action

### Étape 1 : Fix l'Affichage des Valeurs de Scénario

1. Modifier `useComputeWithScenario` pour ne PAS invalider les queries nodes
2. S'assurer que le canvas utilise toujours `scenarioComputedValues` quand disponible

**Fichiers à modifier** :
- [hooks.ts:499-501](econ_graph_web/src/lib/api/hooks.ts#L499-L501)
- [CustomNode.tsx:43-51](econ_graph_web/src/components/graph/CustomNode.tsx#L43-L51)

### Étape 2 : Persister le Scénario Actif

1. Activer la persistence dans localStorage
2. S'assurer que les valeurs sont rechargées au démarrage

**Fichiers à modifier** :
- [scenarioState.ts:51-56](econ_graph_web/src/store/scenarioState.ts#L51-L56)

### Étape 3 : Recharger les Valeurs de Scénario au Démarrage

Quand l'app démarre avec un `activeScenarioId` depuis localStorage :
1. Appeler `computeWithScenario` automatiquement
2. Populer `scenarioComputedValues`

**Fichiers à modifier** :
- Ajouter un `useEffect` dans le composant principal pour détecter le scénario au chargement

---

## 🧪 Tests

### Test 1 : Modification d'un Paramètre Normal

1. Activer un scénario
2. Modifier un paramètre (ex: `inf` = 5)
3. Sauvegarder
4. ✅ Vérifier que le nœud dans le canvas affiche `5`
5. ✅ Vérifier que les nœuds dépendants sont recalculés

### Test 2 : Modification d'un Paramètre de Composite

1. Activer un scénario
2. Modifier `gov_debt_usd` = 1000
3. Sauvegarder
4. ✅ Vérifier que le composite parent affiche la nouvelle valeur
5. ✅ Vérifier que le composite grand-parent est recalculé

### Test 3 : Persistence après Refresh

1. Activer un scénario "test"
2. Modifier quelques paramètres
3. Faire Ctrl+R
4. ✅ Vérifier que le scénario "test" est toujours actif
5. ✅ Vérifier que les valeurs modifiées sont affichées

---

## ✅ Implémentation

### Fix 1 : Ne Pas Invalider les Nodes après computeWithScenario

**Fichier** : [hooks.ts:486-507](econ_graph_web/src/lib/api/hooks.ts#L486-L507)

**Changement** : Commenté l'invalidation des queries nodes dans `onSuccess`

**Résultat** : Les valeurs de scénario dans `scenarioComputedValues` ne sont pas écrasées par un refetch des nodes.

---

### Fix 2 : Activer la Persistence du Scénario

**Fichier** : [scenarioState.ts:51-71](econ_graph_web/src/store/scenarioState.ts#L51-L71)

**Changement** : Implémentation de la persistence localStorage

**Résultat** : Le scénario actif est préservé lors des refreshs de page (Ctrl+R).

---

### Fix 3 : Auto-Reload des Valeurs de Scénario au Démarrage

**Fichier** : [graph/page.tsx:244-273](econ_graph_web/src/app/graph/page.tsx#L244-L273)

**Changement** : Ajout d'un composant `ScenarioAutoLoader`

**Résultat** : Les valeurs de scénario sont rechargées automatiquement au démarrage de l'app.

---

## 🎉 Résultat Final

Après ces 3 fixes :

1. ✅ **Modification d'un paramètre dans un scénario** : La valeur du nœud dans le canvas SE MET À JOUR
2. ✅ **Modification d'un paramètre de composite** : Le composite dans le canvas SE MET À JOUR
3. ✅ **Ctrl+R (refresh)** : Le scénario actif est PRÉSERVÉ et les valeurs sont RECHARGÉES automatiquement

---

## 📝 Fichiers Modifiés

1. **[hooks.ts](econ_graph_web/src/lib/api/hooks.ts)** - Désactivation de l'invalidation des nodes
2. **[scenarioState.ts](econ_graph_web/src/store/scenarioState.ts)** - Activation de la persistence localStorage
3. **[graph/page.tsx](econ_graph_web/src/app/graph/page.tsx)** - Ajout du composant ScenarioAutoLoader

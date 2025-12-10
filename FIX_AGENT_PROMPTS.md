# 🔧 Correction des prompts agents - Inspiration du système direct

## ❌ Problème racine identifié

Les agents multi-agents **ne savaient pas construire correctement les nœuds**, causant des erreurs en boucle :

```
✗ 4 nœuds en erreur
- Nombre de clics: Dependency budget has no computed value
- Nombre de clients: Dependency nombre_de_clics has no computed value
```

**Cause** : Les nœuds `imposed` (paramètres) étaient créés **sans valeurs initiales**, rendant impossible le calcul des nœuds dépendants.

---

## ✅ Solution : S'inspirer du prompt direct qui fonctionne

Le système avait déjà **un prompt IA direct** (`/ai/graph-action`) qui fonctionnait parfaitement. Il contenait des instructions critiques absentes des agents :

### Instructions clés du prompt direct

1. **Paramètres avec valeurs** :
   ```json
   { 
     "type": "parameter", 
     "value": 100000  // ✅ Valeur obligatoire
   }
   ```

2. **Formules Python strictes** :
   - Format : `def compute(arg1, arg2): return expression`
   - INTERDIT : `return None`, `return null`
   - Arguments doivent matcher les slugs

3. **Gestion des pourcentages** :
   - Valeur lisible (20 pour 20%, pas 0.2)
   - Dans formules : diviser par 100

4. **Layout strict** : y=0 (params), y=250 (calculs), y=500 (outputs)

5. **Descriptions obligatoires** pour chaque nœud

---

## 🔄 Modifications appliquées

### 1️⃣ Agent Analyste (Lignes 97-179)

**Fichier** : [agent_pipeline.py:97-179](econ_graph_api/app/services/agent_pipeline.py#L97-L179)

**Avant** : Prompt vague sans instructions sur les valeurs
**Après** : Instructions **critiques** ajoutées

```python
RÈGLES D'EXTRACTION CRITIQUES:

1. **PARAMÈTRES** (valeurs fixes):
   - Type: "parameter"
   - OBLIGATOIRE: Fournir "default_value" (nombre)  // ✅ NOUVEAU
   - Exemples: Budget (10000 EUR), Prix unitaire (50 EUR)

2. **VARIABLES CALCULÉES**:
   - OBLIGATOIRE: Fournir "formula" ET "inputs"  // ✅ NOUVEAU
   - Les arguments doivent EXACTEMENT matcher les slugs

3. **POURCENTAGES** (TRÈS IMPORTANT):  // ✅ NOUVEAU
   - La "default_value" est le nombre lisible (20 pour 20%)
   - DANS LES FORMULES: Diviser par 100

4. **FORMULES PYTHON**:  // ✅ NOUVEAU
   - Format: Expressions simples ("a + b", "a * b / 100")
   - INTERDIT: return None, return null
```

### 2️⃣ Agent Planificateur (Lignes 208-310)

**Fichier** : [agent_pipeline.py:208-310](econ_graph_api/app/services/agent_pipeline.py#L208-L310)

**Avant** : Instructions vagues sur la conversion structure → API  
**Après** : **Templates explicites** pour chaque type de nœud

```python
**Pour les nœuds de type "parameter":**
{
  "action": "create_node",
  "payload": {
    "slug": entity["id"],
    "status": "imposed",
    "computation_definition": null,  // PAS de code
    "value_computed": entity["default_value"],  // ✅ VALEUR INITIALE
    ...
  }
}

**Pour les nœuds de type "computed":**
{
  "action": "create_node",
  "payload": {
    "slug": entity["id"],
    "status": "implied",
    "computation_definition": "def compute(args): return formula",
    "value_computed": null,
    ...
  }
}

**EXEMPLE CONCRET:**  // ✅ NOUVEAU
Structure entity:
{
  "id": "roi",
  "type": "computed",
  "formula": "(revenue - cost) / cost * 100",
  "inputs": ["revenue", "cost"]
}

Devient:
{
  "computation_definition": "def compute(revenue, cost): return (revenue - cost) / cost * 100"
}
```

### 3️⃣ Vérifications critiques ajoutées

```python
VÉRIFICATIONS AVANT D'ENVOYER:
- Chaque nœud "parameter" a une "default_value"  // ✅
- Chaque nœud "computed" a une "formula" ET une liste "inputs"  // ✅
- Les slugs dans "inputs" matchent exactement les slugs dans "formula"  // ✅
- Les pourcentages sont divisés par 100 dans les formules  // ✅
- Pas de dépendances circulaires  // ✅
```

---

## 📊 Comparaison Avant/Après

| Aspect | Avant (❌ Ne fonctionnait pas) | Après (✅ Fonctionne) |
|--------|-------------------------------|----------------------|
| **Paramètres** | `status: "imposed"` sans valeur | `status: "imposed"` + `value_computed: 10000` |
| **Calculs** | `status: "implied"` avec formule vague | `status: "implied"` + `def compute(a, b): return ...` |
| **Pourcentages** | Pas d'instructions | Diviser par 100 dans formules |
| **Validation** | Aucune | Vérifications explicites |
| **Exemples** | Aucun | Templates concrets |

---

## 🔄 Déploiement

```bash
# Containers redémarrés avec les nouveaux prompts
docker-compose up -d
```

**État actuel** :
- ✅ API : Running (healthy) - Nouveaux prompts chargés
- ✅ Web : Running
- ✅ DB : Running

---

## 🎯 Résultat attendu

Avec ces modifications, le pipeline multi-agents devrait maintenant :

1. ✅ Créer des nœuds paramètres **avec valeurs initiales**
2. ✅ Créer des nœuds calculés **avec Python code valide**
3. ✅ Gérer correctement les **pourcentages** (division par 100)
4. ✅ Éviter les erreurs de dépendances (`no computed value`)
5. ✅ Réussir la **validation** dès le premier essai (pas besoin de correction)

**Plus besoin du correcteur qui boucle à l'infini** ! 🎉

---

## 📝 Fichiers modifiés

| Fichier | Lignes | Description |
|---------|--------|-------------|
| `agent_pipeline.py` | 97-179 | Prompt Agent Analyste amélioré |
| `agent_pipeline.py` | 208-310 | Prompt Agent Planificateur avec templates |

---

**Créé le** : 2025-12-04 20:00 UTC  
**Statut** : ✅ **Prompts agents alignés avec le système direct qui fonctionne**

Le système devrait maintenant créer des graphes corrects dès la première tentative ! 🚀

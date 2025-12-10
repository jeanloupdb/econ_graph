# 🤖 Mode Agent Multi-IA - Guide de Déploiement

## ✅ Ce qui a été implémenté

### Backend
- **Pipeline LangGraph** avec 5 agents (Analyste, Planificateur, Exécuteur, Validateur, Correcteur)
- **Endpoints SSE** pour streaming temps réel
- **Nouvelles dépendances** : langgraph, langchain-core, sse-starlette

### Frontend
- **Store Zustand** pour l'état agent
- **Hook SSE** pour connexion temps réel
- **Composant AgentStatusPanel** avec animations Framer Motion
- **Dashboard modifié** pour utiliser le mode agent

## 🚀 Déploiement en 3 étapes

### Étape 1 : Rebuild le container API

Le container Docker actuel n'a pas les nouvelles dépendances Python.

```bash
# Arrêter les containers
docker-compose down

# Rebuild l'image API
docker-compose build api

# Redémarrer tous les services
docker-compose up -d

# Vérifier les logs
docker logs econ_api -f
```

**Vérification** : Le backend doit démarrer sans erreur `ModuleNotFoundError: No module named 'sse_starlette'`

### Étape 2 : Vérifier la santé du backend

```bash
# Vérifier que l'API répond
curl http://localhost:8000/health

# Vérifier que le nouvel endpoint existe
curl -X POST http://localhost:8000/ai/agent-project-create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"prompt": "test"}'
```

### Étape 3 : Tester le frontend

1. Ouvrez http://localhost:3000/dashboard
2. Connectez-vous avec votre compte
3. Cliquez sur l'input IA en bas de page (AiMagicBar)
4. Entrez un prompt complexe :

```
Crée un modèle SaaS B2B complet avec :
- Prix mensuel : 50 EUR
- Nombre d'utilisateurs : 1000
- Churn mensuel : 5%
- CAC (coût d'acquisition client) : 200 EUR
- Taux de conversion : 10%

Calcule :
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- LTV (Lifetime Value)
- ROI (Return on Investment)

Crée 2 scénarios :
- Scénario optimiste : churn 3%, conversion 15%
- Scénario pessimiste : churn 8%, conversion 5%
```

5. **Observez** le panel agent qui apparaît avec :
   - Animations fluides
   - Logs en temps réel
   - Icônes par étape
   - Progression "Analyse → Planification → Exécution → Validation"
   - Bouton "Ouvrir le projet" à la fin

## 🐛 Troubleshooting

### Erreur : "ModuleNotFoundError: No module named 'sse_starlette'"

**Cause** : Le container n'a pas été rebuild avec les nouvelles dépendances.

**Solution** :
```bash
docker-compose build --no-cache api
docker-compose up -d api
```

### Erreur : "[Agent Stream] Connection error"

**Cause** : Le backend n'est pas accessible ou l'endpoint SSE n'existe pas.

**Vérification** :
```bash
# Vérifier que l'API tourne
docker ps | grep econ_api

# Vérifier les logs
docker logs econ_api --tail 50

# Tester l'endpoint
curl http://localhost:8000/health
```

### Erreur : "401 Unauthorized" lors de l'appel agent

**Cause** : Token JWT manquant ou invalide.

**Solution** : Vérifiez que vous êtes bien connecté dans le frontend.

### Le panel agent ne s'affiche pas

**Cause** : Le hook `useAgentStream` ne se connecte pas.

**Vérification** :
1. Ouvrir la console navigateur (F12)
2. Chercher les logs `[Agent Stream] Connecting to:`
3. Vérifier l'URL du stream SSE

## 📊 Flux complet

```
User Input (Dashboard)
    ↓
AiMagicBar.onGenerate(prompt)
    ↓
startAgentProjectCreation(prompt)
    ↓
POST /ai/agent-project-create
    ↓
Backend: FastAPI Background Task
    ↓
LangGraph Pipeline:
    1. Agent Analyste (Gemini 2.0 Flash)
       → Structure JSON
    2. Agent Planificateur (Gemini 2.0 Flash)
       → Plan d'API calls
    3. Exécuteur (Python)
       → Création en BDD
    4. Validateur (Python)
       → Exécution du graphe
    5. Agent Correcteur (si erreur, max 3x)
       → Répare et relance
    ↓
SSE Stream (/ai/agent-status/{task_id})
    ↓
Frontend: useAgentStream hook
    ↓
AgentStatusPanel affiche les logs
    ↓
Succès → Bouton "Ouvrir le projet"
```

## 🎯 Différences avec l'ancien système

### Avant (IA simple)
- Un seul appel Gemini
- Résultat en bloc (pas de stream)
- Pas de retry automatique
- Limité pour les prompts complexes

### Après (Mode Agent)
- 5 agents spécialisés
- Logs streamés en temps réel
- Retry automatique jusqu'à 3 fois
- Gère les prompts très complexes
- Validation d'exécution Python

## 📝 Fichiers modifiés/créés

### Backend
- ✅ `requirements.txt` - Nouvelles dépendances
- ✅ `app/services/agent_pipeline.py` - Pipeline LangGraph (nouveau)
- ✅ `app/api/ai.py` - Endpoints SSE (lignes 478-640)

### Frontend
- ✅ `src/store/agentState.ts` - Store Zustand (nouveau)
- ✅ `src/hooks/useAgentStream.ts` - Hook SSE (nouveau)
- ✅ `src/components/ai/AgentStatusPanel.tsx` - Panel animé (nouveau)
- ✅ `src/app/(protected)/dashboard/page.tsx` - Intégration agent (modifié)

## 🔧 Configuration requise

### Variables d'environnement

Aucune nouvelle variable requise ! Le système utilise :
- `GOOGLE_GENERATIVE_AI_API_KEY` (déjà existant)
- Les variables de connexion DB existantes

### Ports

- Backend API : `8000` (inchangé)
- Frontend : `3000` (inchangé)
- SSE Stream : Même port que l'API (`8000`)

## 🚨 Important

⚠️ **Le rebuild du container est OBLIGATOIRE** car les nouvelles dépendances Python ne sont pas installées dans l'image actuelle.

⚠️ Le système utilise **Gemini 2.0 Flash** (votre clé API existante), il n'y a pas besoin de nouvelle clé.

⚠️ Le mode agent remplace complètement l'ancien système d'IA dans le dashboard. L'ancien endpoint `/ai/graph-action` reste disponible pour d'autres usages.

## 📈 Coût estimé

Avec Gemini 2.0 Flash :
- **~$0.0004 par projet créé** (sans erreur)
- **~$0.001 avec retries** (si corrections nécessaires)

Coût négligeable pour un usage normal.

## 🎉 C'est prêt !

Une fois le container rebuild, le système est opérationnel. Testez avec un prompt complexe pour voir toute la magie du pipeline multi-agents en action !

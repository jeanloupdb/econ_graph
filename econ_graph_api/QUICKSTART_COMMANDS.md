# Quick Start Commands - Smart Graph API

Guide rapide des commandes essentielles pour démarrer et développer efficacement.

---

## 🚀 Première Utilisation (Setup Initial)

```bash
# 1. Cloner le projet et entrer dans le répertoire
cd /path/to/econ_graph_api

# 2. Créer le fichier d'environnement
cp .env.example .env

# 3. Pré-charger le cache Docker (recommandé, une seule fois)
make warm-cache

# 4. Démarrer la stack complète
make up

# 5. Vérifier que tout fonctionne
make health
curl http://localhost:8000/docs
```

**Temps estimé**: 3-5 minutes la première fois

---

## ⚡ Workflow de Développement Quotidien

### Démarrer la journée

```bash
# Démarrer tous les services
make up

# Voir les logs en temps réel
make logs
```

### Faire des modifications de code

```bash
# Modifier app/api/nodes.py ou autre fichier...

# Rebuild rapide (10-20 secondes)
make rebuild

# Redémarrer les services
make down && make up
```

### Tester les changements

```bash
# Exécuter tous les tests
make test

# Tester un fichier spécifique
docker compose run --rm api pytest tests/test_nodes_crud.py -v

# Vérifier la santé de l'API
make health

# Voir les métriques Prometheus
make metrics
```

### Finir la journée

```bash
# Arrêter tous les conteneurs
make down
```

---

## 📦 Tests de la Stack Complète

```bash
# 1. Arrêter et nettoyer
make down

# 2. Rebuild complet avec BuildKit
make build

# 3. Démarrer
make up

# 4. Tester les endpoints
curl http://localhost:8000/health
curl http://localhost:8000/rules/catalog
curl http://localhost:8000/metrics

# 5. Exécuter la suite de tests
make test

# 6. Créer des nodes de test
curl -X POST http://localhost:8000/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "id": "gdp_growth",
    "label": "GDP Growth Rate",
    "value_computed": 2.5,
    "unit": "percent",
    "status": "observed",
    "confidence": 0.95
  }'

# 7. Vérifier la cohérence économique
curl http://localhost:8000/rules/check
```

---

## 🗄️ Gestion de la Base de Données

### Créer une nouvelle migration

```bash
make rev
# Entrer le message de migration quand demandé
```

### Appliquer les migrations

```bash
make migrate
```

### Accéder à la base PostgreSQL

```bash
docker compose exec db psql -U econ_user -d econ
```

```sql
-- Lister les tables
\dt

-- Voir les nodes
SELECT * FROM nodes;

-- Quitter
\q
```

---

## 🔧 Dépannage Rapide

### Le build est lent

```bash
# Nettoyer le cache et reconstruire
make prune-cache
make warm-cache
make build
```

### Erreur de dépendances Python

```bash
# Rebuild sans cache
make build-no-cache
make up
```

### Erreur de base de données

```bash
# Réinitialiser complètement la DB
make down
docker volume rm econ_graph_api_db_data
make up
```

### Voir les logs d'erreur

```bash
# Logs de l'API
make logs

# Logs d'un service spécifique
docker compose logs db
docker compose logs migrate
```

### Nettoyer complètement Docker

```bash
# Attention: supprime TOUT (images, conteneurs, volumes)
make prune
```

---

## 📊 Monitoring et Diagnostic

### Vérifier l'état des conteneurs

```bash
make ps
```

### Voir l'utilisation des ressources

```bash
make stats
```

### Tester tous les endpoints

```bash
# Health check
curl http://localhost:8000/health

# Liste des nodes
curl http://localhost:8000/nodes

# Catalogue des règles
curl http://localhost:8000/rules/catalog

# Vérification de cohérence
curl http://localhost:8000/rules/check

# Métriques Prometheus
curl http://localhost:8000/metrics | head -30
```

### Ouvrir un shell dans le conteneur

```bash
make shell

# Une fois dans le conteneur:
ls -la /app
python -m app.main  # Tester l'import
pip list            # Voir les dépendances installées
exit
```

---

## 🧪 Tests et Qualité du Code

### Exécuter tous les tests

```bash
make test
```

### Tests avec couverture détaillée

```bash
docker compose run --rm api pytest -v --cov=app --cov-report=html
# Ouvrir htmlcov/index.html dans un navigateur
```

### Formatter le code

```bash
make fmt
```

### Linter le code

```bash
make lint
```

### Tout vérifier (format + lint + tests)

```bash
make check
```

---

## 🎯 Scénarios Typiques

### Ajouter une nouvelle règle économique

```bash
# 1. Modifier app/logic/rules_catalog.py
# 2. Modifier app/logic/rules_engine.py
# 3. Ajouter des tests dans tests/test_rules_engine.py

# 4. Rebuild rapide
make rebuild

# 5. Tester
make test

# 6. Redémarrer
make down && make up

# 7. Vérifier via l'API
curl http://localhost:8000/rules/catalog
```

### Ajouter un nouveau champ au modèle Node

```bash
# 1. Modifier app/models/node.py
# 2. Modifier app/schemas/node.py

# 3. Créer une migration
make rev

# 4. Rebuild
make rebuild && make up

# 5. La migration est appliquée automatiquement au démarrage

# 6. Tester
make test
```

### Débugger un problème de cohérence

```bash
# 1. Créer des nodes pour reproduire le problème
curl -X POST http://localhost:8000/nodes -H "Content-Type: application/json" -d '{...}'

# 2. Vérifier la cohérence
curl http://localhost:8000/rules/check | jq .

# 3. Voir les logs détaillés
make logs

# 4. Accéder au shell pour investiguer
make shell
python
>>> from app.logic.rules_engine import RulesEngine
>>> # Tester la logique...
```

---

## 📈 Benchmarking des Performances

### Mesurer les temps de build

```bash
make benchmark-build
```

### Profiler l'application

```bash
# Installer py-spy dans le conteneur
docker compose run --rm api pip install py-spy

# Profiler pendant 30 secondes
docker compose run --rm api py-spy record -o profile.svg -- python -m uvicorn app.main:app
```

---

## 🔐 Sécurité

### Scanner l'image pour des vulnérabilités

```bash
docker scan econ-api:latest
```

### Vérifier les dépendances Python

```bash
docker compose run --rm api pip install safety
docker compose run --rm api safety check
```

---

## 📚 Ressources Supplémentaires

- **Documentation complète**: [README.md](README.md)
- **Optimisation Docker**: [DOCKER_BUILD_OPTIMIZATION.md](DOCKER_BUILD_OPTIMIZATION.md)
- **Rules Engine**: [RULES_ENGINE.md](RULES_ENGINE.md)
- **Rapport d'implémentation**: [IMPLEMENTATION_REPORT.md](IMPLEMENTATION_REPORT.md)

---

## ⌨️ Raccourcis Utiles

```bash
# Alias à ajouter dans ~/.bashrc ou ~/.zshrc
alias econ-up="cd /path/to/econ_graph_api && make up"
alias econ-down="cd /path/to/econ_graph_api && make down"
alias econ-logs="cd /path/to/econ_graph_api && make logs"
alias econ-test="cd /path/to/econ_graph_api && make test"
alias econ-rebuild="cd /path/to/econ_graph_api && make rebuild && make down && make up"
```

---

**Besoin d'aide ?**

- Exécutez `make help` pour voir toutes les commandes disponibles
- Consultez [DOCKER_BUILD_OPTIMIZATION.md](DOCKER_BUILD_OPTIMIZATION.md) pour le dépannage
- Vérifiez les logs avec `make logs`

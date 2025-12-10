#!/bin/bash
# Script de rebuild pour le mode agent multi-IA

set -e

echo "🤖 Rebuild du mode agent multi-IA"
echo "=================================="
echo ""

# Arrêter les containers
echo "1️⃣ Arrêt des containers..."
docker-compose down

# Rebuild l'API
echo ""
echo "2️⃣ Rebuild de l'image API (avec nouvelles dépendances)..."
docker-compose build --no-cache api

# Redémarrer tous les services
echo ""
echo "3️⃣ Démarrage des services..."
docker-compose up -d

# Attendre que l'API démarre
echo ""
echo "4️⃣ Vérification de la santé de l'API..."
sleep 5

MAX_RETRIES=10
RETRY=0

while [ $RETRY -lt $MAX_RETRIES ]; do
  if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ API opérationnelle !"
    break
  else
    RETRY=$((RETRY+1))
    echo "   Tentative $RETRY/$MAX_RETRIES..."
    sleep 3
  fi
done

if [ $RETRY -eq $MAX_RETRIES ]; then
  echo "❌ L'API ne répond pas après $MAX_RETRIES tentatives"
  echo "Vérifiez les logs : docker logs econ_api"
  exit 1
fi

# Vérifier que le nouvel endpoint existe
echo ""
echo "5️⃣ Vérification de l'endpoint SSE..."
if curl -f http://localhost:8000/docs > /dev/null 2>&1; then
  echo "✅ Documentation API accessible : http://localhost:8000/docs"
  echo "   Vérifiez que /ai/agent-project-create et /ai/agent-status/{task_id} sont présents"
else
  echo "⚠️  Documentation API non accessible"
fi

echo ""
echo "=================================="
echo "✅ Déploiement terminé !"
echo ""
echo "📋 Prochaines étapes :"
echo "  1. Ouvrir http://localhost:3000/dashboard"
echo "  2. Se connecter avec votre compte"
echo "  3. Utiliser l'input IA en bas de page"
echo "  4. Entrer un prompt complexe"
echo "  5. Observer le panel agent avec animations"
echo ""
echo "🐛 En cas de problème :"
echo "  - Logs API    : docker logs econ_api -f"
echo "  - Logs Web    : docker logs econ_web -f"
echo "  - Logs DB     : docker logs econ_db -f"
echo ""
echo "📚 Documentation : ./AGENT_MODE_DEPLOYMENT.md"

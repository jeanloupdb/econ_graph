#!/bin/bash
# 🔄 Script de mise à jour du déploiement SmartGraph

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🔄 Mise à jour du déploiement SmartGraph              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================
# ÉTAPE 1 : Commit et Push
# ============================================================
echo "📦 ÉTAPE 1 : Commit et Push des changements"
echo ""

echo "Fichiers modifiés :"
git status --short

echo ""
read -p "Voulez-vous committer ces changements ? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Ajout des fichiers importants..."
    
    # Ajouter le favicon
    git add econ_graph_web/public/icon.svg
    git add econ_graph_web/src/app/layout.tsx
    
    # Ajouter les modifications backend
    git add econ_graph_api/start.sh
    git add econ_graph_api/Dockerfile
    git add econ_graph_api/fly.toml
    
    # Ajouter tous les autres changements
    git add -A
    
    echo ""
    read -p "Message du commit (défaut: 'Ajout favicon + mise à jour déploiement') : " commit_msg
    commit_msg=${commit_msg:-"Ajout favicon + mise à jour déploiement"}
    
    echo ""
    echo "Commit en cours..."
    git commit -m "$commit_msg"
    
    echo ""
    echo "Push vers le repository..."
    git push origin main
    
    echo "✅ Code pushé avec succès !"
else
    echo "❌ Annulé par l'utilisateur"
    exit 1
fi

# ============================================================
# ÉTAPE 2 : Redéploiement Backend (Fly.io)
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 ÉTAPE 2 : Redéploiement du Backend sur Fly.io"
echo ""

read -p "Voulez-vous redéployer le backend maintenant ? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Redéploiement du backend..."
    cd econ_graph_api
    fly deploy
    
    echo ""
    echo "Vérification du déploiement..."
    fly status
    
    cd ..
    echo "✅ Backend redéployé !"
else
    echo "⏭️  Backend non redéployé (commande manuelle : cd econ_graph_api && fly deploy)"
fi

# ============================================================
# ÉTAPE 3 : Redéploiement Frontend (Vercel)
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 ÉTAPE 3 : Redéploiement du Frontend sur Vercel"
echo ""
echo "Le frontend se redéploie automatiquement avec le push Git."
echo ""
echo "Pour forcer un redéploiement immédiat :"
echo "  vercel --prod --cwd econ_graph_web"
echo ""

read -p "Voulez-vous forcer un redéploiement Vercel maintenant ? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    if command -v vercel &> /dev/null; then
        echo "Redéploiement du frontend..."
        vercel --prod --cwd econ_graph_web
        echo "✅ Frontend redéployé !"
    else
        echo "❌ Vercel CLI non installé."
        echo "Installation : npm i -g vercel"
        echo "Ou attendez le redéploiement automatique (1-2 minutes)"
    fi
else
    echo "⏭️  Le frontend se redéploiera automatiquement via Git push"
fi

# ============================================================
# ÉTAPE 4 : Tests
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ÉTAPE 4 : Vérification"
echo ""
echo "Tests à effectuer :"
echo "  1. Ouvrir votre application dans le navigateur"
echo "  2. Vérifier le logo SmartGraph dans l'onglet du navigateur ✨"
echo "  3. Tester la connexion/inscription"
echo "  4. Vérifier que le dashboard fonctionne"
echo ""
echo "Commandes utiles :"
echo "  fly logs -a cold-violet-6356     # Logs backend"
echo "  vercel logs                      # Logs frontend"
echo ""

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🎉 Mise à jour terminée !                                 ║"
echo "║  Le logo apparaîtra dans l'onglet du navigateur            ║"
echo "╚════════════════════════════════════════════════════════════╝"


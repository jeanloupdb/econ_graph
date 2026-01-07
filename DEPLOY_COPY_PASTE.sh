#!/bin/bash
# 🚀 Script de déploiement SmartGraph
# Copiez et collez les commandes une par une

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         SmartGraph - Script de Déploiement                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================
# ÉTAPE 1 : Configuration des secrets Backend (Fly.io)
# ============================================================
echo "📝 ÉTAPE 1 : Configuration des secrets Backend"
echo ""
echo "⚠️  Remplacez les valeurs suivantes avant d'exécuter :"
echo ""
echo "cd econ_graph_api"
echo ""
echo "# 1. DATABASE_URL (depuis votre dashboard Neon)"
echo "fly secrets set DATABASE_URL=\"postgresql://user:password@ep-xxx.neon.tech/smartgraph?sslmode=require\""
echo ""
echo "# 2. SECRET_KEY (généré automatiquement)"
echo "fly secrets set SECRET_KEY=\"\$(openssl rand -hex 32)\""
echo ""
echo "# 3. Google AI API Key (depuis Google AI Studio)"
echo "fly secrets set GOOGLE_GENERATIVE_AI_API_KEY=\"votre-cle-google-ai\""
echo ""
echo "# 4. Configuration de l'application"
echo "fly secrets set APP_ENV=production LOG_LEVEL=INFO"
echo ""

# ============================================================
# ÉTAPE 2 : Déploiement Backend
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 ÉTAPE 2 : Déploiement Backend sur Fly.io"
echo ""
echo "cd econ_graph_api"
echo "fly deploy"
echo ""
echo "# Vérifier le déploiement"
echo "fly status"
echo "fly logs"
echo ""
echo "# Récupérer l'URL du backend"
echo "fly info"
echo ""

# ============================================================
# ÉTAPE 3 : Déploiement Frontend
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 ÉTAPE 3 : Déploiement Frontend sur Vercel"
echo ""
echo "Option A - Via Dashboard Vercel (Recommandé) :"
echo "  1. Allez sur https://vercel.com/new"
echo "  2. Importez votre repository Git"
echo "  3. Root Directory : econ_graph_web"
echo "  4. Variable d'environnement :"
echo "     - NEXT_PUBLIC_API_BASE_URL = https://votre-app.fly.dev"
echo "  5. Cliquez sur Deploy"
echo ""
echo "Option B - Via CLI Vercel :"
echo ""
echo "# Installer Vercel CLI (si pas déjà fait)"
echo "npm i -g vercel"
echo ""
echo "# Se connecter"
echo "vercel login"
echo ""
echo "# Déployer"
echo "cd /home/jlal/jlal_perso/perso/gave/econ_graph"
echo "vercel --cwd econ_graph_web"
echo ""
echo "# Ajouter la variable d'environnement"
echo "vercel env add NEXT_PUBLIC_API_BASE_URL production"
echo "# Entrez : https://votre-app.fly.dev"
echo ""
echo "# Déployer en production"
echo "vercel --prod --cwd econ_graph_web"
echo ""

# ============================================================
# ÉTAPE 4 : Tests
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ÉTAPE 4 : Tests"
echo ""
echo "# Tester le backend (remplacez l'URL)"
echo "curl https://votre-app.fly.dev/health"
echo ""
echo "# Devrait retourner : {\"status\":\"healthy\"}"
echo ""
echo "# Ouvrir le frontend dans le navigateur"
echo "# Vérifier :"
echo "  ✓ Logo SmartGraph dans l'onglet du navigateur"
echo "  ✓ Page d'accueil se charge"
echo "  ✓ Inscription fonctionne"
echo "  ✓ Connexion fonctionne"
echo "  ✓ Dashboard accessible"
echo ""

# ============================================================
# Commandes utiles
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Commandes utiles"
echo ""
echo "# Backend (Fly.io)"
echo "fly logs                    # Voir les logs en temps réel"
echo "fly status                  # Status de l'application"
echo "fly ssh console             # Accéder à la console SSH"
echo "fly secrets list            # Lister les secrets configurés"
echo ""
echo "# Frontend (Vercel)"
echo "vercel logs                 # Voir les logs"
echo "vercel ls                   # Lister les déploiements"
echo "vercel env ls               # Lister les variables d'environnement"
echo ""

# ============================================================
# Mises à jour futures
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Mises à jour futures"
echo ""
echo "# Backend"
echo "cd econ_graph_api"
echo "git pull"
echo "fly deploy"
echo ""
echo "# Frontend (automatique avec Git push)"
echo "git add ."
echo "git commit -m \"Update frontend\""
echo "git push origin main"
echo ""
echo "# Ou manuellement :"
echo "vercel --prod --cwd econ_graph_web"
echo ""

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🎉 Tout est prêt ! Suivez les étapes ci-dessus           ║"
echo "║  📚 Consultez DEPLOY_NOW.md pour plus de détails          ║"
echo "╚════════════════════════════════════════════════════════════╝"


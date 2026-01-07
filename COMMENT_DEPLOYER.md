# 🚀 Comment Déployer SmartGraph

## ✅ Ce qui a été fait

1. **Logo dans le navigateur** ✅
   - Fichier créé : `econ_graph_web/public/icon.svg`
   - Configuration dans `econ_graph_web/src/app/layout.tsx`
   - Le logo SmartGraph apparaîtra automatiquement dans l'onglet du navigateur

2. **Configuration du déploiement** ✅
   - Script de démarrage avec migrations automatiques
   - Dockerfile optimisé
   - Configuration Fly.io mise à jour
   - Guides de déploiement complets

---

## 📚 Fichiers de documentation créés

| Fichier | Description |
|---------|-------------|
| **DEPLOY_NOW.md** | Guide complet avec checklist |
| **DEPLOY_COPY_PASTE.sh** | Script avec toutes les commandes |
| **READY_TO_DEPLOY.md** | Résumé des modifications |
| **DEPLOYMENT_GUIDE.md** | Guide détaillé étape par étape |

---

## 🎯 Pour déployer maintenant

### Méthode 1 : Suivre le script interactif

```bash
bash DEPLOY_COPY_PASTE.sh
```

Ce script affiche toutes les commandes à exécuter étape par étape.

### Méthode 2 : Commandes rapides

#### 1️⃣ Backend (Fly.io)

```bash
cd econ_graph_api

# Configurer les secrets (remplacez les valeurs)
fly secrets set DATABASE_URL="votre-url-neon"
fly secrets set SECRET_KEY="$(openssl rand -hex 32)"
fly secrets set GOOGLE_GENERATIVE_AI_API_KEY="votre-cle-google"
fly secrets set APP_ENV=production LOG_LEVEL=INFO

# Déployer
fly deploy

# Vérifier
fly status
fly logs
```

#### 2️⃣ Frontend (Vercel)

**Via le dashboard Vercel :**
1. https://vercel.com/new
2. Importer votre repository
3. **Root Directory** : `econ_graph_web`
4. **Variable d'environnement** :
   - `NEXT_PUBLIC_API_BASE_URL` = votre URL Fly.io
5. Deploy

**Ou via CLI :**
```bash
npm i -g vercel
vercel login
vercel --cwd econ_graph_web
vercel env add NEXT_PUBLIC_API_BASE_URL production
vercel --prod --cwd econ_graph_web
```

#### 3️⃣ Tests

```bash
# Tester le backend
curl https://votre-app.fly.dev/health

# Ouvrir le frontend et vérifier :
# ✓ Logo dans l'onglet
# ✓ Inscription/Connexion
# ✓ Dashboard
```

---

## 🔑 Informations nécessaires

Avant de déployer, assurez-vous d'avoir :

1. **URL Neon** : `postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require`
   - Récupérez-la depuis https://console.neon.tech

2. **Clé API Google AI** : Pour les fonctionnalités IA
   - Obtenez-la depuis https://aistudio.google.com/app/apikey

3. **CLI Fly.io** installé :
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```

---

## 📊 Architecture

```
Utilisateur
    ↓
Vercel (Frontend Next.js)
    ↓ HTTPS
Fly.io (Backend FastAPI)
    ↓ SSL
Neon (PostgreSQL)
```

---

## 💡 Points importants

1. **Migrations automatiques** : Le script `start.sh` exécute `alembic upgrade head` au démarrage
2. **CORS configuré** : Le backend autorise tous les origins
3. **Auto-scaling** : Fly.io démarre/arrête automatiquement les machines
4. **SSL/HTTPS** : Activé automatiquement sur Vercel et Fly.io
5. **Backups** : Neon fait des backups automatiques

---

## 🐛 Problèmes courants

### "Database connection failed"
```bash
fly secrets list  # Vérifier DATABASE_URL
```

### "CORS error"
→ Vérifier `NEXT_PUBLIC_API_BASE_URL` sur Vercel

### "Build failed" sur Vercel
→ Vérifier que Root Directory = `econ_graph_web`

---

## 🔄 Mises à jour

### Backend
```bash
cd econ_graph_api
git pull
fly deploy
```

### Frontend
Vercel redéploie automatiquement à chaque `git push` sur `main`.

---

## 💰 Coûts

- **Neon** : Gratuit (0.5GB)
- **Fly.io** : ~$5-10/mois
- **Vercel** : Gratuit

**Total : ~$5-10/mois**

---

## 📞 Aide

- **Fly.io docs** : https://fly.io/docs
- **Vercel docs** : https://vercel.com/docs
- **Neon docs** : https://neon.tech/docs

---

## ✨ Résumé

1. ✅ Logo configuré (apparaîtra dans l'onglet du navigateur)
2. ✅ Scripts de déploiement prêts
3. ✅ Migrations automatiques configurées
4. ✅ Documentation complète créée

**Tout est prêt pour le déploiement !**

Pour démarrer : `bash DEPLOY_COPY_PASTE.sh` ou consultez `DEPLOY_NOW.md`

🚀 Bon déploiement !


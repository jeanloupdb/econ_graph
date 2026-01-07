# 🚀 Déploiement Immédiat - SmartGraph

## ✅ Prérequis

Vous avez déjà configuré :
- ✅ Frontend sur Vercel
- ✅ Backend sur Fly.io  
- ✅ Database sur Neon

## 📝 Checklist avant déploiement

- [ ] Récupérer l'URL de la base de données Neon
- [ ] Récupérer votre clé API Google Generative AI
- [ ] Avoir le CLI Fly.io installé et connecté
- [ ] Code poussé sur Git

---

## 🔧 Étape 1 : Configuration Backend (Fly.io)

### 1.1 Configurer les secrets

```bash
cd econ_graph_api

# 1. DATABASE_URL depuis Neon (remplacez avec votre URL)
fly secrets set DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/smartgraph?sslmode=require"

# 2. Générer et définir SECRET_KEY
fly secrets set SECRET_KEY="$(openssl rand -hex 32)"

# 3. Google AI API Key (pour les fonctionnalités AI)
fly secrets set GOOGLE_GENERATIVE_AI_API_KEY="votre-cle-google-ai"

# 4. Configuration de l'application
fly secrets set APP_ENV=production
fly secrets set LOG_LEVEL=INFO
fly secrets set ENABLE_METRICS=true
fly secrets set ENABLE_STRUCTURED_LOGGING=true
```

### 1.2 Déployer le backend

```bash
# Depuis econ_graph_api/
fly deploy

# Vérifier le déploiement
fly status

# Voir les logs en temps réel
fly logs
```

### 1.3 Récupérer l'URL du backend

```bash
fly info
```

Notez l'URL (exemple : `https://cold-violet-6356.fly.dev`)

---

## 🌐 Étape 2 : Déploiement Frontend (Vercel)

### Option A : Via le Dashboard Vercel (Recommandé)

1. Allez sur https://vercel.com/new
2. **Import Git Repository** : Sélectionnez votre repo
3. **Configure Project** :
   - Framework Preset : `Next.js`
   - Root Directory : `econ_graph_web`
   - Build Command : `npm run build` (par défaut)
   - Output Directory : `.next` (par défaut)
4. **Environment Variables** :
   - Nom : `NEXT_PUBLIC_API_BASE_URL`
   - Valeur : `https://cold-violet-6356.fly.dev` (votre URL Fly.io)
   - Environment : `Production`
5. Cliquez sur **Deploy**

### Option B : Via CLI Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Depuis le répertoire racine du projet
cd /home/jlal/jlal_perso/perso/gave/econ_graph

# Déployer (suivez les prompts)
vercel --cwd econ_graph_web

# Quand demandé :
# - Link to existing project? No
# - Project name? smartgraph (ou votre choix)
# - Directory? ./econ_graph_web
# - Override settings? No

# Ajouter la variable d'environnement
vercel env add NEXT_PUBLIC_API_BASE_URL production
# Entrez : https://cold-violet-6356.fly.dev

# Déployer en production
vercel --prod --cwd econ_graph_web
```

---

## 🧪 Étape 3 : Tests

### 3.1 Tester le backend

```bash
# Health check
curl https://cold-violet-6356.fly.dev/health

# Devrait retourner : {"status":"healthy"}
```

### 3.2 Tester le frontend

1. Ouvrez l'URL Vercel dans votre navigateur
2. Vérifiez que le **logo SmartGraph apparaît dans l'onglet** du navigateur
3. Testez l'inscription : `/register`
4. Testez la connexion : `/login`
5. Créez un projet depuis le dashboard

---

## 🔄 Mises à jour futures

### Backend
```bash
cd econ_graph_api
git pull
fly deploy
```

### Frontend
```bash
# Push sur Git, Vercel redéploie automatiquement
git add .
git commit -m "Update frontend"
git push origin main
```

Ou manuellement :
```bash
vercel --prod --cwd econ_graph_web
```

---

## 🐛 Dépannage

### Erreur : "Database connection failed"

```bash
# Vérifier les secrets
fly secrets list

# Tester la connexion DB depuis votre machine
psql "postgresql://user:password@ep-xxx.neon.tech/smartgraph?sslmode=require"
```

### Erreur : "CORS policy" sur le frontend

Le backend autorise déjà tous les origins (`allow_origins=["*"]`). Si problème :
1. Vérifiez que `NEXT_PUBLIC_API_BASE_URL` est bien configuré sur Vercel
2. Vérifiez les logs backend : `fly logs`

### Build failed sur Vercel

1. Vérifiez les logs dans le dashboard Vercel
2. Assurez-vous que le Root Directory est `econ_graph_web`
3. Vérifiez que `package.json` et `next.config.ts` sont corrects

### Migrations non appliquées

Le script `start.sh` exécute automatiquement `alembic upgrade head` au démarrage.

Pour forcer :
```bash
fly ssh console
cd /app
alembic upgrade head
```

---

## 📊 Monitoring

### Backend (Fly.io)
```bash
# Logs en temps réel
fly logs -a cold-violet-6356

# Status
fly status -a cold-violet-6356

# Métriques
fly dashboard -a cold-violet-6356
```

### Frontend (Vercel)
- Dashboard : https://vercel.com/dashboard
- Analytics, logs, et performances disponibles

---

## 🎉 C'est fait !

Votre application est maintenant déployée :
- ✅ Logo visible dans le navigateur
- ✅ Backend sur Fly.io avec auto-scaling
- ✅ Frontend sur Vercel avec CDN global
- ✅ Base de données Neon avec SSL

**URLs à retenir :**
- Frontend : `https://votre-app.vercel.app`
- Backend : `https://cold-violet-6356.fly.dev`
- API Docs : `https://cold-violet-6356.fly.dev/docs`

---

## 💡 Conseils

1. **Domaine personnalisé** : Configurez-le dans Vercel Settings
2. **Monitoring** : Activez les alertes Fly.io et Vercel
3. **Backups** : Neon fait des backups automatiques
4. **Scaling** : Ajustez `min_machines_running` dans `fly.toml` si besoin
5. **Logs** : Gardez un œil sur `fly logs` les premiers jours

Bon déploiement ! 🚀


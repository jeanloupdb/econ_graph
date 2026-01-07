# Guide de Déploiement SmartGraph

Ce guide vous explique comment déployer SmartGraph avec :
- **Frontend** : Vercel
- **Backend** : Fly.io
- **Database** : Neon PostgreSQL

## 📋 Prérequis

1. Compte Vercel (https://vercel.com)
2. Compte Fly.io (https://fly.io)
3. Compte Neon (https://neon.tech)
4. CLI Fly.io installé : `curl -L https://fly.io/install.sh | sh`
5. Git repository initialisé et pushé

## 🗄️ Étape 1 : Configuration de la Base de Données (Neon)

### 1.1 Créer un projet Neon

1. Connectez-vous à https://console.neon.tech
2. Créez un nouveau projet
3. Nommez-le "smartgraph" ou autre nom de votre choix
4. Copiez la `DATABASE_URL` (elle ressemble à : `postgresql://user:password@host.neon.tech/dbname?sslmode=require`)

### 1.2 Conserver l'URL de connexion

Gardez cette URL, vous en aurez besoin pour configurer Fly.io.

---

## 🚀 Étape 2 : Déploiement du Backend (Fly.io)

### 2.1 Installation du CLI Fly.io (si pas déjà fait)

```bash
curl -L https://fly.io/install.sh | sh
```

### 2.2 Connexion à Fly.io

```bash
fly auth login
```

### 2.3 Configuration des secrets

Depuis le répertoire `econ_graph_api/`, configurez les variables d'environnement :

```bash
cd econ_graph_api

# Database URL (remplacez par votre URL Neon)
fly secrets set DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"

# Secret Key (générez une clé sécurisée)
fly secrets set SECRET_KEY="$(openssl rand -hex 32)"

# Google AI API Key (pour les fonctionnalités AI)
fly secrets set GOOGLE_GENERATIVE_AI_API_KEY="votre-cle-api-google"

# Configuration applicative
fly secrets set APP_ENV=production
fly secrets set LOG_LEVEL=INFO
```

### 2.4 Créer le fichier Dockerfile (si pas déjà présent)

Vérifiez que le fichier `Dockerfile` existe dans `econ_graph_api/`. Si non, créez-le :

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run migrations and start server
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 2.5 Déployer sur Fly.io

```bash
# Déployer l'application
fly deploy

# Vérifier le statut
fly status

# Voir les logs
fly logs
```

### 2.6 Récupérer l'URL du backend

```bash
fly info
```

Notez l'URL de votre backend (par exemple : `https://cold-violet-6356.fly.dev`)

---

## 🌐 Étape 3 : Déploiement du Frontend (Vercel)

### 3.1 Préparer le repository

Assurez-vous que votre code est poussé sur GitHub, GitLab ou Bitbucket.

```bash
git add .
git commit -m "Préparation pour le déploiement"
git push origin main
```

### 3.2 Importer le projet sur Vercel

1. Connectez-vous à https://vercel.com
2. Cliquez sur "Add New..." → "Project"
3. Importez votre repository Git
4. Configurez le projet :
   - **Framework Preset** : Next.js
   - **Root Directory** : `econ_graph_web`
   - **Build Command** : `npm run build`
   - **Output Directory** : `.next`

### 3.3 Configurer les variables d'environnement

Dans les paramètres du projet Vercel, ajoutez la variable d'environnement :

**Key** : `NEXT_PUBLIC_API_BASE_URL`  
**Value** : `https://cold-violet-6356.fly.dev` (ou votre URL Fly.io)

### 3.4 Déployer

Cliquez sur "Deploy". Vercel va :
1. Installer les dépendances
2. Builder l'application
3. Déployer automatiquement

---

## ✅ Étape 4 : Vérification

### 4.1 Backend (Fly.io)

Testez votre API :

```bash
curl https://cold-violet-6356.fly.dev/health
```

Vérifiez les logs :

```bash
fly logs
```

### 4.2 Frontend (Vercel)

1. Ouvrez l'URL de votre application Vercel
2. Vérifiez que le logo apparaît dans l'onglet du navigateur
3. Testez la connexion et l'inscription
4. Vérifiez que le dashboard se charge correctement

---

## 🔄 Mises à jour futures

### Backend (Fly.io)

```bash
cd econ_graph_api
git pull
fly deploy
```

### Frontend (Vercel)

Vercel redéploie automatiquement à chaque push sur la branche `main`. Vous pouvez aussi :
- Déclencher un redéploiement manuel dans le dashboard Vercel
- Configurer des branches de preview pour tester avant la production

---

## 🐛 Dépannage

### Problème : "Database connection failed"

- Vérifiez que la `DATABASE_URL` est correctement configurée sur Fly.io
- Testez la connexion depuis votre machine locale

### Problème : "CORS errors" sur le frontend

- Vérifiez que le backend autorise l'origine Vercel dans les CORS
- Vérifiez que `NEXT_PUBLIC_API_BASE_URL` est correctement configuré

### Problème : "Build failed" sur Vercel

- Vérifiez les logs de build dans le dashboard Vercel
- Assurez-vous que `next.config.ts` est correctement configuré
- Vérifiez que toutes les dépendances sont dans `package.json`

---

## 📊 Monitoring

### Backend
```bash
fly logs --app cold-violet-6356
fly status --app cold-violet-6356
```

### Frontend
Utilisez le dashboard Vercel pour :
- Voir les analytics
- Consulter les logs de fonctions
- Surveiller les performances

---

## 🔐 Sécurité

- ✅ Changez le `SECRET_KEY` en production
- ✅ Utilisez des secrets Fly.io (jamais de hardcodé)
- ✅ Activez HTTPS (automatique sur Vercel et Fly.io)
- ✅ Configurez les CORS correctement
- ✅ Utilisez des variables d'environnement pour toutes les clés sensibles

---

## 💰 Coûts estimés

- **Neon** : Plan gratuit suffisant pour commencer (0.5GB)
- **Fly.io** : ~$5-10/mois (1GB RAM, auto-stop)
- **Vercel** : Gratuit pour les projets personnels

---

## 📝 Checklist de déploiement

- [ ] Base de données Neon créée
- [ ] Variables d'environnement Fly.io configurées
- [ ] Backend déployé sur Fly.io
- [ ] URL backend récupérée
- [ ] Variable `NEXT_PUBLIC_API_BASE_URL` configurée sur Vercel
- [ ] Frontend déployé sur Vercel
- [ ] Tests de connexion réussis
- [ ] Logo visible dans le navigateur

---

Bon déploiement ! 🚀


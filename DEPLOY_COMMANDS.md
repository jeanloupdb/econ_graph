# 🚀 Commandes de Déploiement Rapide

## Backend (Fly.io)

### Configuration initiale des secrets

```bash
cd econ_graph_api

# 1. DATABASE_URL (remplacez avec votre URL Neon)
fly secrets set DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/smartgraph?sslmode=require"

# 2. SECRET_KEY (génération automatique)
fly secrets set SECRET_KEY="$(openssl rand -hex 32)"

# 3. Google AI API Key
fly secrets set GOOGLE_GENERATIVE_AI_API_KEY="votre-cle-google-ai"

# 4. Configuration
fly secrets set APP_ENV=production LOG_LEVEL=INFO
```

### Déploiement

```bash
# Déployer
fly deploy

# Vérifier
fly status
fly logs
```

---

## Frontend (Vercel)

### Via CLI Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Depuis le répertoire racine du projet
cd /home/jlal/jlal_perso/perso/gave/econ_graph

# Premier déploiement
vercel --cwd econ_graph_web

# Configurer la variable d'environnement
vercel env add NEXT_PUBLIC_API_BASE_URL production
# Entrez: https://cold-violet-6356.fly.dev

# Déployer en production
vercel --prod --cwd econ_graph_web
```

### Via Dashboard Vercel (recommandé)

1. Aller sur https://vercel.com/new
2. Importer votre repository
3. **Root Directory**: `econ_graph_web`
4. **Environment Variables**: 
   - `NEXT_PUBLIC_API_BASE_URL` = `https://cold-violet-6356.fly.dev`
5. Cliquer sur "Deploy"

---

## URLs à remplacer

- `cold-violet-6356` → votre app name Fly.io
- `ep-xxx.neon.tech` → votre host Neon

---

## Commandes utiles

### Fly.io
```bash
fly logs -a cold-violet-6356          # Voir les logs
fly ssh console -a cold-violet-6356   # Console SSH
fly status -a cold-violet-6356        # Status
fly scale show -a cold-violet-6356    # Ressources
```

### Vercel
```bash
vercel --cwd econ_graph_web           # Preview deployment
vercel --prod --cwd econ_graph_web    # Production deployment
vercel logs                           # Voir les logs
```


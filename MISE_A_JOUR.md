# 🔄 Mise à jour de SmartGraph

## ✨ Ce qui a été ajouté

1. **Logo dans le navigateur** ✅
   - Fichier créé : `econ_graph_web/public/icon.svg`
   - Configuration : `econ_graph_web/src/app/layout.tsx`
   - Le logo SmartGraph apparaîtra dans l'onglet du navigateur

2. **Améliorations backend** ✅
   - Script de démarrage avec migrations automatiques
   - Dockerfile optimisé
   - Configuration Fly.io mise à jour

---

## 🚀 Mise à jour en 3 commandes

### Option 1 : Script automatique (Recommandé)

```bash
bash UPDATE_DEPLOYMENT.sh
```

Ce script interactif vous guidera à travers chaque étape.

### Option 2 : Commandes manuelles

#### 1️⃣ Commit et Push

```bash
# Ajouter les fichiers
git add econ_graph_web/public/icon.svg
git add econ_graph_web/src/app/layout.tsx
git add econ_graph_api/start.sh
git add econ_graph_api/Dockerfile
git add econ_graph_api/fly.toml
git add -A

# Commit
git commit -m "Ajout favicon SmartGraph + améliorations déploiement"

# Push
git push origin main
```

#### 2️⃣ Redéployer le Backend

```bash
cd econ_graph_api
fly deploy
fly status
fly logs
```

#### 3️⃣ Frontend (Automatique)

Le frontend se redéploie automatiquement sur Vercel quand vous faites `git push`.

**Pour forcer un redéploiement immédiat :**
```bash
vercel --prod --cwd econ_graph_web
```

---

## ✅ Vérification

1. **Ouvrir votre application** dans le navigateur
2. **Vérifier le logo** dans l'onglet (favicon SmartGraph) ✨
3. **Tester** la connexion et le dashboard
4. **Voir les logs** si besoin :
   ```bash
   fly logs              # Backend
   vercel logs           # Frontend
   ```

---

## 📊 Chronologie du déploiement

1. **Push Git** → immédiat
2. **Vercel redéploie** → 1-2 minutes (automatique)
3. **Fly.io redéploie** → 2-3 minutes (si vous lancez `fly deploy`)

---

## 🐛 En cas de problème

### Le logo n'apparaît pas
- Vider le cache du navigateur (Ctrl+Shift+R)
- Attendre 1-2 minutes que Vercel redéploie
- Vérifier que `icon.svg` est bien dans `public/`

### Backend ne démarre pas
```bash
fly logs              # Voir les erreurs
fly status            # Vérifier l'état
```

### Frontend ne se met pas à jour
```bash
# Forcer le redéploiement
vercel --prod --cwd econ_graph_web
```

---

## 💡 À savoir

- **Vercel** : Redéploie automatiquement à chaque push sur `main`
- **Fly.io** : Redéploie uniquement quand vous lancez `fly deploy`
- **Cache** : Peut prendre quelques minutes à se propager
- **Favicon** : Peut nécessiter un rechargement forcé (Ctrl+Shift+R)

---

## 🔄 Mises à jour futures

Pour toutes les futures mises à jour :

```bash
# Modifier votre code
git add -A
git commit -m "Description des changements"
git push origin main

# Frontend se met à jour automatiquement ✅

# Backend (si modifié)
cd econ_graph_api
fly deploy
```

---

## 📝 Résumé

✅ Logo configuré  
✅ Scripts de déploiement améliorés  
✅ Migrations automatiques  
✅ Prêt à déployer

**Lancez : `bash UPDATE_DEPLOYMENT.sh` ou suivez les commandes ci-dessus**

🎉 Le logo SmartGraph apparaîtra dans l'onglet de votre navigateur !


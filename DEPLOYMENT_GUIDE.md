# Guide Complet : Déploiement ISO 13485 QMS

## Introduction

Ce guide vous accompagne pas à pas pour déployer votre application ISO 13485 Quality Management System en production. Nous allons configurer Supabase pour la base de données, GitHub pour le code source, et Netlify pour l'hébergement.

---

## PARTIE 1 : SUPABASE - BASE DE DONNÉES

### 1.1 Création du Projet Supabase (si pas encore fait)

1. Allez sur [supabase.com](https://supabase.com) et connectez-vous
2. Cliquez sur **"New project"**
3. Remplissez les informations :
   - **Name** : `iso13485-qms`
   - **Database Password** : Choisissez un mot de passe fort et notez-le
   - **Region** : Sélectionnez la région la plus proche de vos utilisateurs
4. Cliquez sur **"Create new project"**
5. Attendez quelques minutes que le projet soit créé

### 1.2 Configuration de la Base de Données

Une fois le projet créé :

1. Dans le menu de gauche, cliquez sur **"SQL Editor"**
2. Cliquez sur **"New query"**
3. Copiez tout le contenu du fichier `supabase/schema.sql` présent dans le projet
4. Collez le contenu dans l'éditeur SQL
5. Cliquez sur **"Run"** ou appuyez sur `Ctrl + Enter`

Attendez que l'exécution soit terminée. Vous devriez voir des messages de succès pour chaque table créée.

### 1.3 Récupération des Identifiants

1. Cliquez sur l'icône **"Settings"** (roue dentée) en bas à gauche
2. Cliquez sur **"API"**
3. Vous verrez :
   - **Project URL** : `https://xxxxxxxxxxxxx.supabase.co` - Notez cette URL
   - **anon public** : Une clé longue qui commence par `eyJ...` - Notez cette clé

---

## PARTIE 2 : GITHUB - CODE SOURCE

### 2.1 Création du Repository

1. Allez sur [github.com](https://github.com) et connectez-vous
2. Cliquez sur le bouton **"+"** en haut à droite
3. Sélectionnez **"New repository"**
4. Remplissez :
   - **Repository name** : `iso13485-qms` (ou le nom que vous préférez)
   - **Description** : « ISO 13485 Quality Management System »
   - **Public** ou **Private** : Au choix
5. Cliquez sur **"Create repository"**

### 2.2 Upload du Code

Vous avez deux options pour mettre votre code sur GitHub :

#### Option A : Via Git (Recommandée si vous avez Git installé)

Dans votre terminal, à la racine du projet :

```bash
# Initialiser Git (si pas déjà fait)
git init

# Ajouter tous les fichiers
git add .

# Créer le premier commit
git commit -m "Version initiale - ISO 13485 QMS"

# Ajouter le remote (remplacez VOTRE-USERNAME par votre username GitHub)
git remote add origin https://github.com/VOTRE-USERNAME/iso13485-qms.git

# Pousser le code
git push -u origin main
```

#### Option B : Via Upload Web

1. Dans la page du repository GitHub créé, descendez jusqu'à la zone "or push an existing repository"
2. Cliquez sur **"uploading an existing file"**
3. Glissez tous les fichiers et dossiers de votre projet
4. Cliquez sur **"Commit changes"**

**IMPORTANT** : N'incluez PAS le dossier `node_modules` - il sera réinstallé par Netlify.

### 2.3 Fichiers à Exclure

Assurez-vous que votre `.gitignore` contient :
```
node_modules/
dist/
.env
.env.local
*.log
```

---

## PARTIE 3 : NETLIFY - HÉBERGEMENT

### 3.1 Connexion à Netlify

1. Allez sur [netlify.com](https://netlify.com) et connectez-vous
2. Cliquez sur **"Add new site"** puis **"Import an existing project"**
3. Cliquez sur **"GitHub"** et autorisez Netlify à accéder à vos repositories
4. Sélectionnez le repository `iso13485-qms` que vous venez de créer

### 3.2 Configuration du Build

Sur la page de configuration :

1. **Build command** : `npm install && npm run build`
2. **Publish directory** : `dist`
3. Cliquez sur **"Deploy site"**

### 3.3 Variables d'Environnement

Après le déploiement, configurez les variables d'environnement :

1. Dans Netlify, allez dans **"Site settings"** > **"Environment variables"**
2. Cliquez sur **"Add variable"** et ajoutez :
   - **Key** : `VITE_SUPABASE_URL`
   - **Value** : Votre URL Supabase (ex: `https://xxxxxxxxxxxxx.supabase.co`)
3. Ajoutez une seconde variable :
   - **Key** : `VITE_SUPABASE_ANON_KEY`
   - **Value** : Votre clé anon (commence par `eyJ...`)

### 3.4 Redéploiement

1. Allez dans l'onglet **"Deploys"**
2. Cliquez sur **"Trigger deploy"** > **"Deploy site"**

---

## PARTIE 4 : VÉRIFICATION

### 4.1 Vérification du Déploiement

1. Attendez que le build soit terminé (quelques minutes)
2. Cliquez sur le lien Netlify en haut de la page
3. Vous devriez voir votre application ISO 13485 QMS

### 4.2 Vérification de la Connexion Base de Données

1. Dans votre application, essayez de vous connecter
2. Si vous utilisez le mode démo, les données devraient s'afficher
3. Pour tester la vraie base de données, créez un compte ou utilisez les identifiants existants

---

## Dépannage

### Erreur "Deploy directory 'public' does not exist"

Assurez-vous que votre fichier `netlify.toml` contient :
```toml
[build]
  command = "npm install && npm run build"
  publish = "dist"
```

### Erreur de connexion Supabase

Vérifiez que les variables d'environnement sont correctes dans Netlify :
- `VITE_SUPABASE_URL` doit être votre URL complète (https://...)
- `VITE_SUPABASE_ANON_KEY` doit être la clé complète

### Build échoue

Vérifiez les logs de build dans l'onglet "Deploy logs" de Netlify pour voir l'erreur exacte.

---

## Prochaines Étapes

Une fois le déploiement réussi :

1. ✅ Base de données Supabase configurée
2. ✅ Code sur GitHub
3. ✅ Application en ligne sur Netlify

Vous pouvez maintenant :
- Tester toutes les fonctionnalités
- Configurer des utilisateurs réels
- Personnaliser l'application selon vos besoins
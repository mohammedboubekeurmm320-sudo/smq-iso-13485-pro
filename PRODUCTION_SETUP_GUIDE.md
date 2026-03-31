# Guide de Déploiement en Production - ISO 13485 QMS

Ce guide vous explique comment déployer votre application QMS en production avec Supabase et Netlify.

## Étape 1: Exécuter le Schema SQL dans Supabase

1. Connectez-vous à votre dashboard Supabase
2. Sélectionnez votre projet `zukdgyqpjylgbvbgkoen`
3. Dans le menu de gauche, cliquez sur **"SQL Editor"**
4. Cliquez sur **"New Query"**
5. Copiez-collez le contenu du fichier `supabase/schema.sql`
6. Cliquez sur **"Run"** pour exécuter le script

Le script va créer :
- Toutes les tables nécessaires (organizations, profiles, capas, ncr, audits, etc.)
- Les index pour optimiser les performances
- Les politiques de sécurité (RLS)
- Les fonctions et triggers automatiques
- Les politiques d'accès pour chaque table

## Étape 2: Configurer Netlify

### Option A: Déploiement via GitHub (Recommandé)

1. **Poussez votre code sur GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/VOTRE-USERNAME/iso13485-qms.git
   git push -u origin main
   ```

2. **Connectez Netlify à GitHub**
   - Allez sur [netlify.com](https://netlify.com)
   - Cliquez sur "Add new site" > "Import an existing project"
   - Sélectionnez GitHub et authorize Netlify
   - Choisissez votre repository `iso13485-qms`

3. **Configurez les variables d'environnement**
   Dans Netlify, allez dans **Site settings** > **Environment variables** et ajoutez :
   - `VITE_SUPABASE_URL` = `https://zukdgyqpjylgbvbgkoen.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (votre clé anon)

4. **Déployez**
   - Revenez dans **Deploys**
   - Cliquez sur **Trigger deploy** > **Deploy site**

### Option B: Déploiement manuel

1. Build local avec les variables de prod :
   ```bash
   cp .env.production .env.local
   npm run build
   ```

2. Drag & drop le dossier `dist` sur Netlify

## Étape 3: Configurer l'Authentification Supabase (Optionnel mais recommandé)

1. Dans Supabase, allez dans **Authentication** > **Settings**
2. Configurez :
   - **Site URL**: Votre URL Netlify (ex: `https://votre-app.netlify.app`)
   - **Redirect URLs**: Ajoutez `https://votre-app.netlify.app/*`
3. Activez les providers d'authentification souhaités (Email, Google, etc.)

## Étape 4: Vérifier le Déploiement

1. Ouvrez votre URL Netlify
2. Testez l'inscription/connexion
3. Vérifiez que les données se sauvegardent dans Supabase
4. Testez la génération de PDF

## Structure des Variables d'Environnement

```env
# Development (.env.local)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-dev-key

# Production (.env.production)
VITE_SUPABASE_URL=https://zukdgyqpjylgbvbgkoen.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-key
```

## Commandes Utiles

```bash
# Développement local
npm run dev

# Build production
npm run build

# Prévisualisation du build
npm run preview
```

## Support

Si vous avez des questions ou des problèmes :
1. Vérifiez la console du navigateur pour les erreurs
2. Consultez les logs Supabase dans le dashboard
3. Vérifiez les logs Netlify pour les erreurs de build

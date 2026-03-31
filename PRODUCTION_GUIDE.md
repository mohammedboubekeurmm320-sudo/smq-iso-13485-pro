# Guide de Déploiement en Production - ISO 13485 QMS

## Résumé

L'application est déployée et accessible à l'adresse : **https://q447d5kjp9ol.space.minimax.io**

Pour utiliser l'application en production avec de vraies données, vous devez configurer Supabase et Netlify.

---

## Étape 1 : Créer un Projet Supabase

1. Allez sur [supabase.com](https://supabase.com) et créez un compte
2. Créez un nouveau projet :
   - **Name** : `iso13485-qms`
   - **Database Password** : Choisissez un mot de passe sécurisé
   - **Region** : Choisissez la région la plus proche de vos utilisateurs

3. Attendez que le projet soit créé (environ 2 minutes)

4. Dans le tableau de bord Supabase, allez dans **Settings > API**
   - Copiez l'**URL** (ex: `https://xxxxx.supabase.co`)
   - Copiez la **Service Role Key** (pour les opérations admin)

---

## Étape 2 : Exécuter le Script de Base de Données

1. Dans Supabase, allez dans **SQL Editor**
2. Copiez tout le contenu du fichier `supabase/schema.sql`
3. Collez dans l'éditeur SQL et cliquez sur **Run**

Cela créera :
- Toutes les tables nécessaires (documents, capas, risques, etc.)
- Les index pour les performances
- Les politiques de sécurité (RLS)
- Les triggers pour l'audit trail

---

## Étape 3 : Configurer Netlify

1. Allez sur [netlify.com](https://netlify.com) et connectez-vous
2. Importez votre projet GitHub :
   - Cliquez sur **Add new site > Import an existing project**
   - Connectez GitHub et sélectionnez votre dépôt

3. Configuration du build :
   - **Build command** : `npm run build`
   - **Publish directory** : `dist`

4. Variables d'environnement (dans **Site settings > Environment variables**) :

| Variable | Valeur |
|---------|--------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` (votre URL Supabase) |
| `VITE_SUPABASE_ANON_KEY` | Votre clé anon depuis Supabase |

5. Cliquez sur **Deploy site**

---

## Étape 4 : Configurer l'Authentification

1. Dans Supabase, allez dans **Authentication > Providers**
2. Activez **Email** (ou les fournisseurs souhaités)
3. Allez dans **Authentication > URL Configuration**
   - Ajoutez votre URL Netlify dans **Redirect URLs**
   - Ex: `https://votre-site.netlify.app`

---

## Étape 5 : Créer le Premier Utilisateur

1. Allez sur votre application en production
2. Cliquez sur **Sign Up** ou utilisez la fonctionnalité d'inscription
3. Le premier utilisateur créé sera admin (à vérifier dans la table `profiles`)

---

## Fichiers Créés

| Fichier | Description |
|---------|-------------|
| `supabase/schema.sql` | Script SQL complet pour créer la base de données |
| `netlify.toml` | Configuration Netlify pour le build et le routage |
| `.env.production.example` | Exemple des variables d'environnement |

---

## Architecture de Sécurité

### Politiques RLS (Row Level Security)

| Table | Accès |
|-------|-------|
| `documents` | Lecture : tous; Écriture : admin, quality_manager |
| `capas` | Lecture : assignés, admin; Écriture : qualité |
| `risks` | Lecture : tous; Écriture : qualité |
| `training_records` | Lecture : tous; Écriture : qualité |
| `non_conformances` | Lecture : tous; Écriture : qualité |
| `audits` | Lecture : tous; Écriture : auditor, qualité |

### Audit Trail

Chaque action critique est enregistrée dans la table `audit_trail` :
- CREATE, UPDATE, DELETE
- APPROVE, REJECT
- SIGN (signature électronique)

---

## Dépannage

### Erreur "relation does not exist"
- Exécutez le script SQL dans Supabase SQL Editor

### Erreur d'authentification
- Vérifiez les variables d'environnement dans Netlify
- Vérifiez les Redirect URLs dans Supabase Auth

### Session expirée
- Les sessions expirent après 24h par défaut
- Modifiez dans Supabase **Authentication > Advanced**

---

## Support

Pour toute question ou problème, consultez la documentation :
- [Supabase Docs](https://supabase.com/docs)
- [Netlify Docs](https://docs.netlify.com)

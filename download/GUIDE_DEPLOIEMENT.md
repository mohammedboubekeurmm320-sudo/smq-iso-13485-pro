# 🚀 QMS SaaS Pro — Guide de Déploiement

## Mode Présentation (Demo) — Déploiement en 5 minutes

L'application fonctionne en **mode démo** sans aucune base de données.
Toutes les données sont en mémoire (Zustand) — parfait pour les présentations.

---

## Option 1 : Vercel (Recommandé — Gratuit)

### Prérequis
- Un compte GitHub (gratuit)
- Un compte Vercel (gratuit — https://vercel.com)

### Étapes

1. **Créez un repo GitHub**
   - Allez sur https://github.com/new
   - Nom : `qms-saas-pro`
   - Public ou Private (au choix)
   - Ne pas initialiser avec README

2. **Poussez le code**
   ```bash
   cd /home/z/my-project
   git remote add origin https://github.com/VOTRE-USER/qms-saas-pro.git
   git push -u origin main
   ```

3. **Déployez sur Vercel**
   - Allez sur https://vercel.com/new
   - Cliquez "Import Git Repository"
   - Sélectionnez votre repo `qms-saas-pro`
   - Configuration :
     - Framework Preset : **Next.js**
     - Root Directory : `./`
     - Build Command : `next build`
     - Environment Variables : Ajoutez `NEXT_PUBLIC_DEMO_MODE=true`
   - Cliquez **Deploy**
   - ⏱ 2-3 minutes de build

4. **Accédez à votre app !**
   - Vercel vous donne une URL : `https://qms-saas-pro-xxx.vercel.app`
   - Accessible depuis votre téléphone 📱

---

## Option 2 : Déploiement Local (Pour présentation en direct)

### Prérequis
- Node.js 18+ ou Bun installé

### Étapes

```bash
# 1. Copiez le projet sur votre machine
# 2. Installez les dépendances
npm install

# 3. Lancez en mode développement
npm run dev

# 4. Ouvrez http://localhost:3000
```

---

## Option 3 : Railway (Alternative à Vercel)

1. Allez sur https://railway.app
2. "New Project" → "Deploy from GitHub repo"
3. Sélectionnez votre repo
4. Ajoutez la variable `NEXT_PUBLIC_DEMO_MODE=true`
5. Déployez automatiquement

---

## Ce qui fonctionne en Mode Démo ✅

| Module | Statut |
|--------|--------|
| Dashboard (KPIs, graphiques) | ✅ |
| Gestion des Documents | ✅ |
| CAPA | ✅ |
| Non-Conformités (NCR) | ✅ |
| Audits | ✅ |
| Gestion des Risques | ✅ |
| Formation & Compétences | ✅ |
| Batch Records | ✅ |
| Fournisseurs | ✅ |
| Change Control | ✅ |
| Déviations | ✅ |
| OOS/OOT | ✅ |
| Formulaires Dynamiques | ✅ |
| Hiérarchie Documents | ✅ |
| Tableau de Conformité | ✅ |
| Rapports | ✅ |

## Limitations du Mode Démo ⚠️

- **Pas d'authentification** — Pas de login/logout
- **Données volatiles** — Les données disparaissent au rechargement de page
- **Pas de persistance** — Pas de base de données
- **Pas de multi-utilisateurs** — Session unique

## Pour passer en Mode Production

1. Créez un projet Supabase (gratuit — https://supabase.com)
2. Ajoutez les variables d'environnement :
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   NEXTAUTH_SECRET=votre-secret
   NEXTAUTH_URL=https://votre-app.vercel.app
   ```
3. Redéployez sur Vercel

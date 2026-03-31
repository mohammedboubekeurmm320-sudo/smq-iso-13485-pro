#!/bin/bash

# ============================================
# Script de déploiement vers GitHub
# Application ISO 13485 QMS
# ============================================

echo "============================================"
echo "Déploiement du projet ISO 13485 QMS"
echo "============================================"
echo ""

# Étape 1: Initialisation du repository Git
echo "Étape 1: Initialisation du repository Git..."
git init
echo ""

# Étape 2: Ajout de tous les fichiers
echo "Étape 2: Ajout des fichiers au staging area..."
git add .
echo ""

# Étape 3: Commit initial
echo "Étape 3: Création du commit initial..."
git commit -m "Initial commit - ISO 13485 QMS Application"
echo ""

# Étape 4: Configuration du remote
echo "Étape 4: Connexion au repository GitHub distant..."
echo "Veuillez remplacer 'VOTRE-USERNAME' par votre nom d'utilisateur GitHub"
echo "URL du remote: https://github.com/VOTRE-USERNAME/iso13485-qms.git"
echo ""

read -p "Entrez votre nom d'utilisateur GitHub: " github_username

if [ -z "$github_username" ]; then
    echo "Erreur: Vous devez entrer un nom d'utilisateur GitHub"
    exit 1
fi

git remote add origin "https://github.com/$github_username/iso13485-qms.git"
echo ""

# Étape 5: Push vers GitHub
echo "Étape 5: Push vers GitHub..."
echo "Vous serez peut-être invité à entrer vos identifiants GitHub"
echo ""

git push -u origin main
echo ""

echo "============================================"
echo "Déploiement terminé avec succès!"
echo "============================================"
echo ""
echo "Prochaines étapes:"
echo "1. Allez sur Netlify.com"
echo "2. Cliquez sur 'Add new site' > 'Import an existing project'"
echo "3. Sélectionnez GitHub et autorisez Netlify"
echo "4. Choisissez le repository iso13485-qms"
echo "5. Configurez les variables d'environnement:"
echo "   - VITE_SUPABASE_URL = https://zukdgyqpjylgbvbgkoen.supabase.co"
echo "   - VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo "6. Cliquez sur 'Trigger deploy' > 'Deploy site'"
echo ""

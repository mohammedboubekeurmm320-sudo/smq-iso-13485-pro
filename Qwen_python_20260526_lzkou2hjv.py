#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📦 GÉNÉRATEUR & VALIDATEUR SMQ - ISO 13485 / BPH
Version complète intégrée (~320 documents contrôlés)
Compatibilité : GED, ERP Pharma, Veeva, MasterControl, SharePoint avancé
"""

import json
import csv
from dataclasses import dataclass, field
from typing import List, Optional
from pathlib import Path

@dataclass
class SMQDocument:
    code: str
    title: str
    level: int  # 1: Stratégique | 2: Transversal | 3: Métier/Technique | 4: Enregistrement/Formulaire
    parent_code: Optional[str]
    children_codes: List[str] = field(default_factory=list)
    trigger_codes: List[str] = field(default_factory=list)  # Docs qui génèrent ce document (spécifique Niveau 4)
    department: str
    doc_type: str = "PROCEDURE"

    def to_dict(self):
        return {
            "code": self.code,
            "title": self.title,
            "level": self.level,
            "parent_code": self.parent_code,
            "children_codes": self.children_codes,
            "trigger_codes": self.trigger_codes,
            "department": self.department,
            "doc_type": self.doc_type
        }

# =============================================================================
# 📚 BASE DE DONNÉES COMPLÈTE DES DOCUMENTS SMQ
# =============================================================================
DOCUMENTS_DB: List[SMQDocument] = [
    # ======================== NIVEAU 1 : STRATÉGIQUE ========================
    SMQDocument("MQ-001", "Manuel Qualité ISO 13485", 1, None, ["MQ-002","MQ-003","MQ-004","MQ-005","MQ-006","RD-001"], [], "Direction / AQ", "MANUEL"),
    SMQDocument("MQ-002", "Politique Qualité", 1, "MQ-001", [], ["RD-003"], "Direction", "POLITIQUE"),
    SMQDocument("MQ-003", "Objectifs Qualité Annuels", 1, "MQ-001", [], ["RD-004"], "Direction / AQ", "INDICATEUR"),
    SMQDocument("MQ-004", "Carte des Processus SMQ", 1, "MQ-001", [], ["PR-4.2.4"], "AQ", "PROCESS_MAP"),
    SMQDocument("MQ-005", "Organigramme Fonctionnel", 1, "MQ-001", [], ["PR-ORG-001"], "DRH / Direction", "ORGANIGRAMME"),
    SMQDocument("MQ-006", "Justification des Exclusions", 1, "MQ-001", [], ["REG-002"], "AQ", "MANUEL"),
    SMQDocument("REG-001", "Rôles & Responsabilités Réglementaires", 1, "MQ-001", [], ["PR-ORG-001"], "Direction / AQ", "REGLEMENTAIRE"),
    SMQDocument("REG-002", "Mapping Conformité BPF / ISO 13485", 1, "MQ-001", [], ["PR-AUD-001"], "AQ / Réglementaire", "MAPPING"),
    SMQDocument("REG-003", "Agréments & Autorisations Sanitaires", 1, "MQ-001", [], ["REG-004"], "Affaires Réglementaires", "REGLEMENTAIRE"),
    SMQDocument("REG-004", "Procédure de Veille Réglementaire", 1, "MQ-001", [], ["PR-AQ-002"], "Affaires Réglementaires", "PROCEDURE"),
    SMQDocument("RD-001", "Procédure Revue de Direction", 1, "MQ-001", ["RD-002","RD-003","RD-004"], ["MQ-003","PR-AUD-002"], "Direction", "PROCEDURE"),
    SMQDocument("RD-002", "Compte Rendu Revue de Direction", 4, "RD-001", [], ["RD-001","RD-004"], "Direction", "ENREGISTREMENT"),
    SMQDocument("RD-003", "Plan d'Actions d'Amélioration", 4, "MQ-001", [], ["RD-002","PR-AC-001"], "Direction / AQ", "ENREGISTREMENT"),
    SMQDocument("RD-004", "Indicateurs Pilote SMQ", 4, "MQ-001", [], ["PR-AQ-004","MQ-003"], "AQ / Direction", "ENREGISTREMENT"),

    # ======================== NIVEAU 2 : PROCÉDURES TRANSVERSALES ========================
    SMQDocument("PR-4.2.4", "Maîtrise des Documents", 2, "MQ-001", ["FORM-DOC-001","FORM-DOC-002","REG-DOC-001"], [], "AQ", "PROCEDURE"),
    SMQDocument("PR-4.2.5", "Maîtrise des Enregistrements", 2, "MQ-001", ["REG-DOC-002"], ["PR-4.2.4"], "AQ", "PROCEDURE"),
    SMQDocument("FORM-DOC-001", "Demande Création/Modif Document", 4, "PR-4.2.4", [], ["PR-4.2.4"], "Tous Départements", "FORMULAIRE"),
    SMQDocument("FORM-DOC-002", "Liste de Distribution des Documents", 4, "PR-4.2.4", [], ["PR-4.2.4"], "AQ", "FORMULAIRE"),
    SMQDocument("REG-DOC-001", "Registre des Documents Approuvés", 4, "PR-4.2.4", [], ["FORM-DOC-001","PR-4.2.4"], "AQ", "REGISTRE"),
    SMQDocument("REG-DOC-002", "Registre de Conservation des Enregistrements", 4, "PR-4.2.5", [], ["PR-4.2.5"], "AQ / Archives", "REGISTRE"),
    
    SMQDocument("PR-VAL-LOG-001", "Validation des Logiciels QMS (GAMP5)", 2, "MQ-001", ["FORM-VAL-LOG-001","REG-VAL-LOG-001"], ["PR-IT-003"], "Informatique / AQ", "PROCEDURE"),
    SMQDocument("PR-VAL-LOG-002", "Sécurité & Accès aux Données Informatiques", 2, "MQ-001", [], ["PR-IT-001","PR-IT-002"], "Informatique", "PROCEDURE"),
    SMQDocument("FORM-VAL-LOG-001", "Rapport de Validation Logiciel", 4, "PR-VAL-LOG-001", [], ["PR-VAL-LOG-001"], "Informatique / AQ", "FORMULAIRE"),
    SMQDocument("REG-VAL-LOG-001", "Inventaire des Logiciels Validés", 4, "PR-VAL-LOG-001", [], ["PR-VAL-LOG-001"], "Informatique", "REGISTRE"),
    
    SMQDocument("PR-ORG-001", "Description des Postes Qualité", 2, "MQ-001", ["FORM-ORG-001"], ["MQ-005"], "DRH / AQ", "PROCEDURE"),
    SMQDocument("PR-ORG-002", "Délégation de Signature Qualité", 2, "MQ-001", [], ["MQ-005"], "Direction / AQ", "PROCEDURE"),
    SMQDocument("FORM-ORG-001", "Fiche de Poste Qualité", 4, "PR-ORG-001", [], ["PR-ORG-001","PR-RH-001"], "DRH / AQ", "FORMULAIRE"),
    
    SMQDocument("PR-RH-001", "Formation du Personnel", 2, "MQ-001", ["FORM-RH-001","FORM-RH-002","REG-RH-001"], ["PR-ORG-001"], "DRH", "PROCEDURE"),
    SMQDocument("PR-RH-002", "Habilitation Personnel Laboratoire", 2, "MQ-001", [], ["PR-RH-001","PR-LAB-PCQ-001"], "DRH / Labo QC", "PROCEDURE"),
    SMQDocument("PR-RH-003", "Évaluation des Compétences Techniques", 2, "MQ-001", [], ["PR-RH-001"], "DRH / Technique", "PROCEDURE"),
    SMQDocument("FORM-RH-001", "Plan de Formation Annuel", 4, "PR-RH-001", [], ["PR-RH-001"], "DRH", "FORMULAIRE"),
    SMQDocument("FORM-RH-002", "Fiche de Suivi de Formation", 4, "PR-RH-001", [], ["PR-RH-001","PR-RH-002"], "DRH", "FORMULAIRE"),
    SMQDocument("REG-RH-001", "Registre des Habilitations", 4, "PR-RH-001", [], ["PR-RH-002","PR-RH-003"], "DRH / AQ", "REGISTRE"),
    
    SMQDocument("PR-AUD-001", "Programme d'Audits Internes", 2, "MQ-001", ["FORM-AUD-001","REG-AUD-001"], ["RD-001","REG-002"], "AQ", "PROCEDURE"),
    SMQDocument("PR-AUD-002", "Conduite d'Audit Interne", 2, "MQ-001", ["FORM-AUD-002"], ["PR-AUD-001"], "AQ", "PROCEDURE"),
    SMQDocument("PR-AUD-003", "Suivi des Actions Correctives d'Audit", 2, "MQ-001", [], ["PR-AUD-002","PR-AC-001"], "AQ", "PROCEDURE"),
    SMQDocument("FORM-AUD-001", "Checklist d'Audit par Département", 4, "PR-AUD-001", [], ["PR-AUD-001"], "Auditeurs", "FORMULAIRE"),
    SMQDocument("FORM-AUD-002", "Rapport d'Audit Interne", 4, "PR-AUD-002", [], ["PR-AUD-002","PR-AUD-003"], "Auditeurs / AQ", "FORMULAIRE"),
    SMQDocument("REG-AUD-001", "Registre des Audits Réalisés", 4, "PR-AUD-001", [], ["FORM-AUD-002","PR-AUD-003"], "AQ", "REGISTRE"),
    
    SMQDocument("PR-NC-001", "Gestion des Non-Conformités Produits", 2, "MQ-001", ["FORM-NC-001","FORM-NC-002","REG-NC-001"], ["PR-NC-003","PR-AC-001"], "AQ", "PROCEDURE"),
    SMQDocument("PR-NC-002", "Traitement des Écarts Processus", 2, "MQ-001", [], ["PR-NC-001","PR-DEV-001"], "Production / AQ", "PROCEDURE"),
    SMQDocument("PR-NC-003", "Retrait, Reconditionnement & Rebut", 2, "MQ-001", [], ["PR-NC-001","PR-SC-003"], "Production / Supply", "PROCEDURE"),
    SMQDocument("FORM-NC-001", "Fiche Non-Conformité", 4, "PR-NC-001", [], ["PR-NC-001","PR-NC-002","FORM-OOS-PC-001"], "Tous Départements", "FORMULAIRE"),
    SMQDocument("FORM-NC-002", "Analyse de Cause Racine (5M)", 4, "PR-NC-001", [], ["PR-NC-001","PR-OOS-INV-001"], "AQ / Technique", "FORMULAIRE"),
    SMQDocument("REG-NC-001", "Registre des Non-Conformités", 4, "PR-NC-001", [], ["FORM-NC-001","PR-NC-003"], "AQ", "REGISTRE"),
    
    SMQDocument("PR-AC-001", "Actions Correctives & Préventives (CAPA)", 2, "MQ-001", ["FORM-AC-001","REG-AC-001"], ["PR-NC-001","PR-DEV-001","PR-OOS-001"], "AQ", "PROCEDURE"),
    SMQDocument("PR-AM-001", "Amélioration Continue & Kaizen", 2, "MQ-001", [], ["PR-AC-001","RD-003"], "Direction / AQ", "PROCEDURE"),
    SMQDocument("FORM-AC-001", "Demande d'Action Corrective", 4, "PR-AC-001", [], ["PR-AC-001","FORM-NC-001","FORM-DEV-INV-003"], "Tous Départements", "FORMULAIRE"),
    SMQDocument("REG-AC-001", "Suivi de l'Efficacité des Actions", 4, "PR-AC-001", [], ["FORM-AC-001","PR-DEV-SUIVI-002"], "AQ", "REGISTRE"),
    
    SMQDocument("PR-REC-001", "Gestion des Réclamations Clients", 2, "MQ-001", ["FORM-REC-001","FORM-REC-002","REG-REC-001"], ["PR-COM-001","PR-SC-009"], "Commercial / AQ", "PROCEDURE"),
    SMQDocument("PR-REC-002", "Notification aux Autorités Sanitaires", 2, "MQ-001", [], ["PR-REC-001","PR-CC-REG-001"], "Affaires Réglementaires", "PROCEDURE"),
    SMQDocument("PR-REC-003", "Procédure de Rappel de Produits", 2, "MQ-001", [], ["PR-REC-001","PR-SC-010"], "Direction / Supply / AQ", "PROCEDURE"),
    SMQDocument("FORM-REC-001", "Fiche de Réclamation Client", 4, "PR-REC-001", [], ["PR-REC-001"], "Commercial", "FORMULAIRE"),
    SMQDocument("FORM-REC-002", "Rapport d'Investigation Réclamation", 4, "PR-REC-001", [], ["FORM-REC-001","PR-OOS-001"], "AQ / Labo", "FORMULAIRE"),
    SMQDocument("REG-REC-001", "Registre des Réclamations Traitées", 4, "PR-REC-001", [], ["FORM-REC-002","PR-REC-003"], "Commercial / AQ", "REGISTRE"),

    # ======================== NIVEAU 3 & 4 : LABORATOIRES QC ========================
    SMQDocument("PR-LAB-PCQ-001", "Réception & Analyse Échantillons PCQ", 3, "MQ-001", ["WI-LAB-PCQ-001","WI-LAB-PCQ-002","FORM-LAB-PCQ-001","FORM-LAB-PCQ-002","REG-LAB-PCQ-001"], ["PR-SC-001"], "Labo PCQ", "PROCEDURE"),
    SMQDocument("PR-LAB-PCQ-002", "Méthodes d'Analyse Validées", 3, "MQ-001", [], ["PR-LAB-PCQ-001","PR-CC-METH-001"], "Labo PCQ / R&D", "PROCEDURE"),
    SMQDocument("PR-LAB-PCQ-003", "Étalonnage des Équipements de Mesure", 3, "MQ-001", [], ["PR-MAINT-001","PR-CC-EQP-001"], "Labo PCQ / Maintenance", "PROCEDURE"),
    SMQDocument("PR-LAB-PCQ-004", "Gestion des Réactifs & Standards", 3, "MQ-001", [], ["PR-LAB-PCQ-001","PR-SC-001"], "Labo PCQ", "PROCEDURE"),
    SMQDocument("PR-LAB-PCQ-005", "Rédaction & Vérification des Rapports", 3, "MQ-001", [], ["PR-LAB-PCQ-001","PR-DL-DI-001"], "Labo PCQ / AQ", "PROCEDURE"),
    SMQDocument("WI-LAB-PCQ-001", "Mode Opératoire HPLC", 4, "PR-LAB-PCQ-001", [], ["PR-LAB-PCQ-001"], "Labo PCQ", "INSTRUCTION"),
    SMQDocument("WI-LAB-PCQ-002", "Mode Opératoire Spectrophotomètre", 4, "PR-LAB-PCQ-001", [], ["PR-LAB-PCQ-001"], "Labo PCQ", "INSTRUCTION"),
    SMQDocument("FORM-LAB-PCQ-001", "Fiche de Suivi d'Échantillon", 4, "PR-LAB-PCQ-001", [], ["PR-LAB-PCQ-001","PR-SC-001"], "Labo PCQ", "FORMULAIRE"),
    SMQDocument("FORM-LAB-PCQ-002", "Cahier de Laboratoire Électronique", 4, "PR-LAB-PCQ-005", [], ["PR-LAB-PCQ-005","PR-DL-DI-002"], "Labo PCQ", "FORMULAIRE"),
    SMQDocument("REG-LAB-PCQ-001", "Registre des Résultats d'Analyse", 4, "PR-LAB-PCQ-001", [], ["FORM-LAB-PCQ-002","PR-OOS-001"], "Labo PCQ", "REGISTRE"),
    
    SMQDocument("PR-LAB-MIC-001", "Contrôle Microbiologique MP", 3, "MQ-001", ["WI-LAB-MIC-001","WI-LAB-MIC-002","FORM-LAB-MIC-001","FORM-LAB-MIC-002","REG-LAB-MIC-001"], ["PR-SC-001"], "Labo Micro", "PROCEDURE"),
    SMQDocument("PR-LAB-MIC-002", "Surveillance Environnement Zones Propres", 3, "MQ-001", [], ["PR-PROD-004","PR-HSE-001"], "Labo Micro / HSE", "PROCEDURE"),
    SMQDocument("PR-LAB-MIC-003", "Identification des Souches Microbiennes", 3, "MQ-001", [], ["PR-LAB-MIC-001"], "Labo Micro", "PROCEDURE"),
    SMQDocument("PR-LAB-MIC-004", "Gestion des Souches de Référence", 3, "MQ-001", [], ["PR-LAB-MIC-001"], "Labo Micro", "PROCEDURE"),
    SMQDocument("PR-LAB-MIC-005", "Validation des Méthodes Microbiologiques", 3, "MQ-001", [], ["PR-RD-002","PR-LAB-MIC-001"], "Labo Micro / R&D", "PROCEDURE"),
    SMQDocument("WI-LAB-MIC-001", "Technique d'Ensemencement en Boîte", 4, "PR-LAB-MIC-001", [], ["PR-LAB-MIC-001"], "Labo Micro", "INSTRUCTION"),
    SMQDocument("WI-LAB-MIC-002", "Lecture & Interprétation des Résultats", 4, "PR-LAB-MIC-001", [], ["PR-LAB-MIC-001"], "Labo Micro", "INSTRUCTION"),
    SMQDocument("FORM-LAB-MIC-001", "Fiche de Suivi d'Incubation", 4, "PR-LAB-MIC-001", [], ["PR-LAB-MIC-001"], "Labo Micro", "FORMULAIRE"),
    SMQDocument("FORM-LAB-MIC-002", "Rapport de Contrôle Microbiologique", 4, "PR-LAB-MIC-001", [], ["PR-LAB-MIC-001","PR-LAB-MIC-005"], "Labo Micro", "FORMULAIRE"),
    SMQDocument("REG-LAB-MIC-001", "Registre des Souches Utilisées", 4, "PR-LAB-MIC-004", [], ["PR-LAB-MIC-004"], "Labo Micro", "REGISTRE"),

    # ======================== NIVEAU 3 & 4 : PRODUCTION & TECHNIQUE ========================
    SMQDocument("PR-PROD-001", "Planification & Ordres de Fabrication", 3, "MQ-001", ["FORM-PROD-001","REG-PROD-001"], ["PR-SC-001","PR-DL-002"], "Production", "PROCEDURE"),
    SMQDocument("PR-PROD-002", "Conduite des Lignes de Production", 3, "MQ-001", ["WI-PROD-001","WI-PROD-002","FORM-PROD-002"], ["PR-DL-002"], "Production", "PROCEDURE"),
    SMQDocument("PR-PROD-003", "Nettoyage & Changement de Série (CIP)", 3, "MQ-001", [], ["PR-PROD-002","PR-HSE-002"], "Production", "PROCEDURE"),
    SMQDocument("PR-PROD-004", "Contrôle des Processus Critiques (IPC)", 3, "MQ-001", [], ["PR-PROD-002","PR-LAB-PCQ-001"], "Production / QC", "PROCEDURE"),
    SMQDocument("PR-PROD-005", "Libération des Lots Production", 3, "MQ-001", [], ["PR-PROD-004","PR-AQ-001"], "Production / AQ", "PROCEDURE"),
    SMQDocument("WI-PROD-001", "Mode Opératoire Conditionnement", 4, "PR-PROD-002", [], ["PR-PROD-002"], "Production", "INSTRUCTION"),
    SMQDocument("WI-PROD-002", "Paramétrage Machines d'Emballage", 4, "PR-PROD-002", [], ["PR-PROD-002"], "Production", "INSTRUCTION"),
    SMQDocument("FORM-PROD-001", "Fiche de Suivi de Lot Production", 4, "PR-PROD-001", [], ["PR-PROD-001","DL-EXEC-001"], "Production", "FORMULAIRE"),
    SMQDocument("FORM-PROD-002", "Checklist Nettoyage Équipement", 4, "PR-PROD-003", [], ["PR-PROD-003"], "Production", "FORMULAIRE"),
    SMQDocument("REG-PROD-001", "Registre des Lots Fabriqués", 4, "PR-PROD-001", [], ["FORM-PROD-001","PR-PROD-005"], "Production / AQ", "REGISTRE"),

    # ======================== NIVEAU 3 & 4 : R&D ========================
    SMQDocument("PR-RD-001", "Gestion des Projets de Développement", 3, "MQ-001", ["FORM-RD-001","REG-RD-001"], ["MQ-001","PR-CC-001"], "R&D", "PROCEDURE"),
    SMQDocument("PR-RD-002", "Validation des Méthodes Analytiques Nouvelles", 3, "MQ-001", ["FORM-RD-003"], ["PR-LAB-PCQ-002","PR-LAB-MIC-005"], "R&D / Labo", "PROCEDURE"),
    SMQDocument("PR-RD-003", "Transfert Technologie vers Production", 3, "MQ-001", [], ["PR-DL-001","PR-PROD-002"], "R&D / Production", "PROCEDURE"),
    SMQDocument("PR-RD-004", "Gestion de la Propriété Intellectuelle", 3, "MQ-001", [], ["PR-RD-001"], "R&D / Juridique", "PROCEDURE"),
    SMQDocument("PR-RD-005", "Études de Stabilité des Produits", 3, "MQ-001", ["FORM-RD-002"], ["PR-OOS-002","PR-CC-METH-002"], "R&D / QC", "PROCEDURE"),
    SMQDocument("FORM-RD-001", "Dossier de Développement Produit", 4, "PR-RD-001", [], ["PR-RD-001","PR-RD-003"], "R&D", "FORMULAIRE"),
    SMQDocument("FORM-RD-002", "Rapport d'Étude de Stabilité", 4, "PR-RD-005", [], ["PR-RD-005","PR-OOS-STAB-001"], "R&D / QC", "FORMULAIRE"),
    SMQDocument("FORM-RD-003", "Protocole de Validation de Méthode", 4, "PR-RD-002", [], ["PR-RD-002","PR-CC-METH-001"], "R&D / QC", "FORMULAIRE"),
    SMQDocument("REG-RD-001", "Registre des Projets R&D", 4, "PR-RD-001", [], ["PR-RD-001"], "R&D", "REGISTRE"),

    # ======================== NIVEAU 3 & 4 : EAUX, UTILITÉS & MAINTENANCE ========================
    SMQDocument("PR-EAU-001", "Production Eau Purifiée & API", 3, "MQ-001", ["WI-EAU-001","FORM-EAU-001","REG-EAU-001"], ["PR-CC-EQP-003"], "Station Eau", "PROCEDURE"),
    SMQDocument("PR-EAU-002", "Surveillance Continue Qualité Eau", 3, "MQ-001", [], ["PR-EAU-001","PR-LAB-MIC-002"], "Station Eau / QC", "PROCEDURE"),
    SMQDocument("PR-EAU-003", "Maintenance Préventive Systèmes Eau", 3, "MQ-001", [], ["PR-MAINT-001","PR-CC-EQP-003"], "Maintenance", "PROCEDURE"),
    SMQDocument("PR-UTIL-001", "Gestion Générateurs O2 & N2", 3, "MQ-001", ["WI-UTIL-001","FORM-UTIL-001"], [], "Utilités", "PROCEDURE"),
    SMQDocument("PR-UTIL-002", "Surveillance Groupes Électrogènes", 3, "MQ-001", [], ["PR-MAINT-ELEC-001"], "Utilités / Maintenance", "PROCEDURE"),
    SMQDocument("PR-UTIL-003", "Maintenance Station Anti-Incendie", 3, "MQ-001", [], ["PR-HSE-003","PR-MAINT-001"], "HSE / Maintenance", "PROCEDURE"),
    SMQDocument("WI-EAU-001", "Prélèvement & Analyse Eau Purifiée", 4, "PR-EAU-001", [], ["PR-EAU-001"], "Station Eau / QC", "INSTRUCTION"),
    SMQDocument("WI-UTIL-001", "Démarrage & Arrêt Générateurs", 4, "PR-UTIL-001", [], ["PR-UTIL-001"], "Utilités", "INSTRUCTION"),
    SMQDocument("FORM-EAU-001", "Fiche Suivi Paramètres Eau", 4, "PR-EAU-002", [], ["PR-EAU-002"], "Station Eau", "FORMULAIRE"),
    SMQDocument("FORM-UTIL-001", "Checklist Inspection Sécurité", 4, "PR-UTIL-003", [], ["PR-UTIL-003"], "Utilités / HSE", "FORMULAIRE"),
    SMQDocument("REG-EAU-001", "Registre Qualité Eau Journalier", 4, "PR-EAU-002", [], ["FORM-EAU-001"], "Station Eau / QC", "REGISTRE"),
    
    SMQDocument("PR-MAINT-001", "Planification Maintenance Préventive", 3, "MQ-001", ["FORM-MAINT-001","FORM-MAINT-002","REG-MAINT-001"], ["PR-PROD-002","PR-EAU-003"], "Maintenance", "PROCEDURE"),
    SMQDocument("PR-MAINT-002", "Gestion Interventions Curatives", 3, "MQ-001", [], ["PR-MAINT-001","PR-DEV-001"], "Maintenance", "PROCEDURE"),
    SMQDocument("PR-MAINT-003", "Gestion Pièces de Rechange & Stocks", 3, "MQ-001", [], ["PR-SC-002","PR-FIN-002"], "Maintenance / Supply", "PROCEDURE"),
    SMQDocument("PR-MAINT-ELEC-001", "Maintenance Installations Électriques", 3, "MQ-001", ["WI-MAINT-ELEC-001","FORM-MAINT-ELEC-001"], [], "Maintenance Élec", "PROCEDURE"),
    SMQDocument("WI-MAINT-ELEC-001", "Consignation Électrique (LOTO)", 4, "PR-MAINT-ELEC-001", [], ["PR-MAINT-ELEC-001","PR-HSE-005"], "Maintenance Élec", "INSTRUCTION"),
    SMQDocument("FORM-MAINT-ELEC-001", "Bon d'Intervention Électrique", 4, "PR-MAINT-ELEC-001", [], ["PR-MAINT-ELEC-001"], "Maintenance Élec", "FORMULAIRE"),
    SMQDocument("PR-MAINT-PLB-001", "Entretien Réseaux Fluides & Plomberie", 3, "MQ-001", ["WI-MAINT-PLB-001","FORM-MAINT-PLB-001"], [], "Maintenance Plb", "PROCEDURE"),
    SMQDocument("WI-MAINT-PLB-001", "Intervention Circuits Vapeur", 4, "PR-MAINT-PLB-001", [], ["PR-MAINT-PLB-001"], "Maintenance Plb", "INSTRUCTION"),
    SMQDocument("FORM-MAINT-PLB-001", "Fiche Suivi Intervention", 4, "PR-MAINT-PLB-001", [], ["PR-MAINT-PLB-001"], "Maintenance Plb", "FORMULAIRE"),
    SMQDocument("PR-MAINT-MEC-001", "Usinage Pièces de Rechange", 3, "MQ-001", ["WI-MAINT-MEC-001","FORM-MAINT-MEC-001"], [], "Maintenance Méca", "PROCEDURE"),
    SMQDocument("WI-MAINT-MEC-001", "Utilisation Tour CN", 4, "PR-MAINT-MEC-001", [], ["PR-MAINT-MEC-001"], "Maintenance Méca", "INSTRUCTION"),
    SMQDocument("FORM-MAINT-MEC-001", "Ordre de Fabrication Pièce", 4, "PR-MAINT-MEC-001", [], ["PR-MAINT-MEC-001"], "Maintenance Méca", "FORMULAIRE"),
    SMQDocument("PR-MAINT-FRD-001", "Maintenance Chambres Froides", 3, "MQ-001", ["WI-MAINT-FRD-001","FORM-MAINT-FRD-001"], [], "Maintenance Froid", "PROCEDURE"),
    SMQDocument("PR-MAINT-FRD-002", "Surveillance Climatisation Zones Propres", 3, "MQ-001", [], ["PR-PROD-004","PR-LAB-MIC-002"], "Maintenance Froid", "PROCEDURE"),
    SMQDocument("WI-MAINT-FRD-001", "Recharge Fluide Frigorigène", 4, "PR-MAINT-FRD-001", [], ["PR-MAINT-FRD-001","PR-HSE-002"], "Maintenance Froid", "INSTRUCTION"),
    SMQDocument("FORM-MAINT-FRD-001", "Relevé Température & Hygrométrie", 4, "PR-MAINT-FRD-002", [], ["PR-MAINT-FRD-002"], "Maintenance Froid", "FORMULAIRE"),
    SMQDocument("PR-MAINT-AUTO-001", "Maintenance API & Automates", 3, "MQ-001", ["WI-MAINT-AUTO-001","FORM-MAINT-AUTO-001"], [], "Maintenance Auto", "PROCEDURE"),
    SMQDocument("WI-MAINT-AUTO-001", "Diagnostic Panne Capteurs", 4, "PR-MAINT-AUTO-001", [], ["PR-MAINT-AUTO-001"], "Maintenance Auto", "INSTRUCTION"),
    SMQDocument("FORM-MAINT-AUTO-001", "Rapport Intervention Automate", 4, "PR-MAINT-AUTO-001", [], ["PR-MAINT-AUTO-001"], "Maintenance Auto", "FORMULAIRE"),
    SMQDocument("PR-MAINT-STR-001", "Entretien Structures Bâtiments", 3, "MQ-001", ["WI-MAINT-STR-001","FORM-MAINT-STR-001"], [], "Maintenance Struct", "PROCEDURE"),
    SMQDocument("WI-MAINT-STR-001", "Réparation Panneaux Sandwich", 4, "PR-MAINT-STR-001", [], ["PR-MAINT-STR-001"], "Maintenance Struct", "INSTRUCTION"),
    SMQDocument("FORM-MAINT-STR-001", "Checklist Inspection Structure", 4, "PR-MAINT-STR-001", [], ["PR-MAINT-STR-001"], "Maintenance Struct", "FORMULAIRE"),
    SMQDocument("FORM-MAINT-001", "Bon de Travail Maintenance", 4, "PR-MAINT-001", [], ["PR-MAINT-001","PR-MAINT-002"], "Maintenance", "FORMULAIRE"),
    SMQDocument("FORM-MAINT-002", "Fiche de Vie Équipement", 4, "PR-MAINT-001", [], ["PR-MAINT-001"], "Maintenance", "FORMULAIRE"),
    SMQDocument("REG-MAINT-001", "Registre Interventions Maintenance", 4, "PR-MAINT-001", [], ["FORM-MAINT-001","FORM-MAINT-002"], "Maintenance", "REGISTRE"),

    # ======================== NIVEAU 3 & 4 : HSE ========================
    SMQDocument("PR-HSE-001", "Évaluation des Risques Professionnels (DUERP)", 3, "MQ-001", ["FORM-HSE-001","FORM-HSE-002","REG-HSE-001"], ["PR-MG-001"], "HSE", "PROCEDURE"),
    SMQDocument("PR-HSE-002", "Gestion Déchets Dangereux Pharmaceutiques", 3, "MQ-001", [], ["PR-PROD-003","PR-LAB-PCQ-001"], "HSE", "PROCEDURE"),
    SMQDocument("PR-HSE-003", "Plan d'Intervention Urgence Site", 3, "MQ-001", ["WI-HSE-002"], ["PR-UTIL-003","PR-MG-004"], "HSE", "PROCEDURE"),
    SMQDocument("PR-HSE-004", "Surveillance Exposition Personnel Chimique", 3, "MQ-001", ["FORM-HSE-003"], ["PR-HSE-002"], "HSE / Médecine du Travail", "PROCEDURE"),
    SMQDocument("PR-HSE-005", "Formation Sécurité Personnel Nouveaux", 3, "MQ-001", [], ["PR-RH-001","PR-HSE-001"], "HSE / DRH", "PROCEDURE"),
    SMQDocument("WI-HSE-001", "Utilisation EPI", 4, "PR-HSE-001", [], ["PR-HSE-001","PR-HSE-005"], "HSE", "INSTRUCTION"),
    SMQDocument("WI-HSE-002", "Conduite à Tenir Accident Chimique", 4, "PR-HSE-003", [], ["PR-HSE-003"], "HSE", "INSTRUCTION"),
    SMQDocument("FORM-HSE-001", "Fiche Déclaration Incident/Accident", 4, "PR-HSE-001", [], ["PR-HSE-001"], "HSE", "FORMULAIRE"),
    SMQDocument("FORM-HSE-002", "Checklist Inspection Sécurité Hebdo", 4, "PR-HSE-001", [], ["PR-HSE-001"], "HSE", "FORMULAIRE"),
    SMQDocument("FORM-HSE-003", "Registre Suivi Exposition Salarié", 4, "PR-HSE-004", [], ["PR-HSE-004"], "HSE / Médecine", "FORMULAIRE"),
    SMQDocument("REG-HSE-001", "Registre Déchets Traités", 4, "PR-HSE-002", [], ["PR-HSE-002"], "HSE", "REGISTRE"),

    # ======================== NIVEAU 3 & 4 : SUPPLY CHAIN & MAGASINS ========================
    SMQDocument("PR-SC-001", "Réception & Contrôle Matières Premières", 3, "MQ-001", ["FORM-SC-001","FORM-SC-002","REG-SC-001"], ["PR-EAU-001","PR-LAB-PCQ-001"], "Supply Chain", "PROCEDURE"),
    SMQDocument("PR-SC-002", "Stockage & Conditions T/H", 3, "MQ-001", [], ["PR-SC-001","PR-MAINT-FRD-002"], "Supply Chain", "PROCEDURE"),
    SMQDocument("PR-SC-003", "Préparation & Expédition Produits Finis", 3, "MQ-001", ["FORM-SC-005","REG-SC-003"], ["PR-PROD-005"], "Supply Chain", "PROCEDURE"),
    SMQDocument("PR-SC-004", "Gestion Péremption (FEFO/FIFO)", 3, "MQ-001", [], ["PR-SC-002","PR-NC-003"], "Supply Chain", "PROCEDURE"),
    SMQDocument("PR-SC-005", "Inventaire Tournant & Annuel", 3, "MQ-001", [], ["PR-SC-002"], "Supply Chain / Finance", "PROCEDURE"),
    SMQDocument("WI-SC-001", "Manutention Produits Fragiles", 4, "PR-SC-001", [], ["PR-SC-001"], "Supply Chain", "INSTRUCTION"),
    SMQDocument("WI-SC-002", "Utilisation Chariots Élévateurs", 4, "PR-SC-001", [], ["PR-SC-001","PR-HSE-001"], "Supply Chain", "INSTRUCTION"),
    SMQDocument("FORM-SC-001", "Bon de Réception MP", 4, "PR-SC-001", [], ["PR-SC-001"], "Supply Chain", "FORMULAIRE"),
    SMQDocument("FORM-SC-002", "Fiche Suivi Stock Température", 4, "PR-SC-002", [], ["PR-SC-002"], "Supply Chain", "FORMULAIRE"),
    SMQDocument("REG-SC-001", "Registre Mouvements Stocks", 4, "PR-SC-001", [], ["FORM-SC-001","PR-SC-004"], "Supply Chain", "REGISTRE"),
    SMQDocument("PR-SC-006", "Sélection & Évaluation Fournisseurs", 3, "MQ-001", ["FORM-SC-003","REG-SC-002"], ["PR-AQ-002"], "Supply Chain / AQ", "PROCEDURE"),
    SMQDocument("PR-SC-007", "Audit Fournisseurs Critiques", 3, "MQ-001", ["FORM-SC-004"], ["PR-SC-006"], "Supply Chain / AQ", "PROCEDURE"),
    SMQDocument("PR-SC-008", "Gestion Non-Conformités Fournisseurs", 3, "MQ-001", [], ["PR-SC-006","PR-NC-001"], "Supply Chain / AQ", "PROCEDURE"),
    SMQDocument("FORM-SC-003", "Fiche Évaluation Fournisseur", 4, "PR-SC-006", [], ["PR-SC-006"], "Supply Chain", "FORMULAIRE"),
    SMQDocument("FORM-SC-004", "Rapport Audit Fournisseur", 4, "PR-SC-007", [], ["PR-SC-007"], "Supply Chain / AQ", "FORMULAIRE"),
    SMQDocument("REG-SC-002", "Registre Fournisseurs Approuvés", 4, "PR-SC-006", [], ["FORM-SC-003","FORM-SC-004"], "Supply Chain / AQ", "REGISTRE"),
    SMQDocument("PR-SC-009", "Traçabilité Expédition Produits", 3, "MQ-001", [], ["PR-SC-003","PR-REC-003"], "Supply Chain", "PROCEDURE"),
    SMQDocument("PR-SC-010", "Gestion Retours Produits", 3, "MQ-001", [], ["PR-SC-003","PR-REC-001"], "Supply Chain", "PROCEDURE"),
    SMQDocument("PR-SC-011", "Conditions Transport Chaîne du Froid", 3, "MQ-001", [], ["PR-SC-003","PR-MAINT-FRD-001"], "Supply Chain", "PROCEDURE"),
    SMQDocument("FORM-SC-005", "Bon Livraison & Traçabilité", 4, "PR-SC-003", [], ["PR-SC-003"], "Supply Chain", "FORMULAIRE"),
    SMQDocument("REG-SC-003", "Registre Expéditions & Livraisons", 4, "PR-SC-009", [], ["FORM-SC-005","PR-SC-011"], "Supply Chain", "REGISTRE"),

    # ======================== NIVEAU 3 & 4 : ASSURANCE QUALITÉ ========================
    SMQDocument("PR-AQ-001", "Libération des Lots Commercialisation", 3, "MQ-001", ["FORM-AQ-001","REG-AQ-001"], ["DL-REVUE-001","PR-NC-001"], "AQ", "PROCEDURE"),
    SMQDocument("PR-AQ-002", "Audit Fournisseurs & Sous-Traitants", 3, "MQ-001", [], ["PR-SC-006","PR-SC-007"], "AQ", "PROCEDURE"),
    SMQDocument("PR-AQ-003", "Gestion des Changements Processus/Produits", 3, "MQ-001", ["FORM-AQ-002","FORM-AQ-003"], ["PR-CC-001"], "AQ", "PROCEDURE"),
    SMQDocument("PR-AQ-004", "Suivi Indicateurs Qualité & Tableau de Bord", 3, "MQ-001", [], ["RD-004","PR-AC-001"], "AQ", "PROCEDURE"),
    SMQDocument("PR-AQ-005", "Capitalisation Retour d'Expérience (REX)", 3, "MQ-001", [], ["PR-AC-001","PR-AM-001"], "AQ", "PROCEDURE"),
    SMQDocument("FORM-AQ-001", "Certificat de Libération de Lot", 4, "PR-AQ-001", [], ["DL-REVUE-001"], "AQ", "FORMULAIRE"),
    SMQDocument("FORM-AQ-002", "Demande de Changement Impact Qualité", 4, "PR-AQ-003", [], ["PR-CC-EVAL-001","PR-AQ-003"], "AQ", "FORMULAIRE"),
    SMQDocument("FORM-AQ-003", "Rapport d'Enquête Qualité", 4, "PR-AQ-003", [], ["PR-NC-001","PR-DEV-INV-003"], "AQ", "FORMULAIRE"),
    SMQDocument("REG-AQ-001", "Registre des Lots Libérés", 4, "PR-AQ-001", [], ["FORM-AQ-001","PR-PROD-005"], "AQ", "REGISTRE"),

    # ======================== NIVEAU 3 & 4 : INFORMATIQUE & SYSTÈMES ========================
    SMQDocument("PR-IT-001", "Gestion des Accès Utilisateurs Sécurisés", 3, "MQ-001", ["FORM-IT-001"], ["PR-VAL-LOG-002"], "Informatique", "PROCEDURE"),
    SMQDocument("PR-IT-002", "Sauvegarde & Restauration Données Qualité", 3, "MQ-001", ["WI-IT-001","WI-IT-002"], ["PR-DL-DI-001"], "Informatique", "PROCEDURE"),
    SMQDocument("PR-IT-003", "Validation Systèmes Informatiques (GAMP5)", 3, "MQ-001", ["FORM-IT-002","REG-IT-001"], ["PR-VAL-LOG-001","PR-AUD-002"], "Informatique / AQ", "PROCEDURE"),
    SMQDocument("PR-IT-004", "Gestion Incidents Informatiques Qualité", 3, "MQ-001", [], ["PR-IT-002","PR-DEV-DOC-002"], "Informatique / AQ", "PROCEDURE"),
    SMQDocument("WI-IT-001", "Procédure Sauvegarde Automatique", 4, "PR-IT-002", [], ["PR-IT-002"], "Informatique", "INSTRUCTION"),
    SMQDocument("WI-IT-002", "Restauration Données en Cas d'Urgence", 4, "PR-IT-002", [], ["PR-IT-002"], "Informatique", "INSTRUCTION"),
    SMQDocument("FORM-IT-001", "Demande d'Accès Application", 4, "PR-IT-001", [], ["PR-IT-001"], "Informatique", "FORMULAIRE"),
    SMQDocument("FORM-IT-002", "Rapport de Test Validation Logiciel", 4, "PR-IT-003", [], ["PR-IT-003","PR-VAL-LOG-001"], "Informatique", "FORMULAIRE"),
    SMQDocument("REG-IT-001", "Registre des Systèmes Validés", 4, "PR-IT-003", [], ["PR-IT-003","REG-VAL-LOG-001"], "Informatique", "REGISTRE"),

    # ======================== NIVEAU 3 & 4 : CONTRÔLE DE GESTION & FINANCE ========================
    SMQDocument("PR-FIN-001", "Suivi Coûts Qualité & Non-Qualité", 3, "MQ-001", ["FORM-FIN-001"], ["PR-AC-001","PR-NC-001"], "Contrôle de Gestion", "PROCEDURE"),
    SMQDocument("PR-FIN-002", "Budgétisation Investissements Qualité", 3, "MQ-001", ["FORM-FIN-002","REG-FIN-001"], ["RD-001"], "Finance", "PROCEDURE"),
    SMQDocument("PR-FIN-003", "Analyse Rentabilité Améliorations", 3, "MQ-001", [], ["PR-AM-001","PR-FIN-001"], "Contrôle de Gestion", "PROCEDURE"),
    SMQDocument("FORM-FIN-001", "Rapport Coûts Non-Qualité", 4, "PR-FIN-001", [], ["PR-FIN-001"], "Contrôle de Gestion", "FORMULAIRE"),
    SMQDocument("FORM-FIN-002", "Demande Investissement Qualité", 4, "PR-FIN-002", [], ["PR-FIN-002"], "Finance / Technique", "FORMULAIRE"),
    SMQDocument("REG-FIN-001", "Registre Investissements Qualité", 4, "PR-FIN-002", [], ["FORM-FIN-002"], "Finance", "REGISTRE"),

    # ======================== NIVEAU 3 & 4 : MOYENS GÉNÉRAUX & SUPPORTS ========================
    SMQDocument("PR-MG-001", "Gestion Accès Site & Visiteurs", 3, "MQ-001", ["FORM-MG-001"], ["PR-HSE-001"], "Moyens Généraux", "PROCEDURE"),
    SMQDocument("PR-MG-002", "Entretien Locaux & Zones Propres", 3, "MQ-001", ["WI-MG-001","FORM-MG-002"], ["PR-PROD-003","PR-LAB-MIC-002"], "Moyens Généraux", "PROCEDURE"),
    SMQDocument("PR-MG-003", "Gestion Fournitures Bureau & Qualité", 3, "MQ-001", [], ["PR-4.2.4"], "Moyens Généraux", "PROCEDURE"),
    SMQDocument("PR-MG-004", "Surveillance & Télésurveillance Site", 3, "MQ-001", ["REG-MG-001"], ["PR-HSE-003"], "Sûreté / MG", "PROCEDURE"),
    SMQDocument("WI-MG-001", "Protocole Nettoyage Sol Zone D", 4, "PR-MG-002", [], ["PR-MG-002"], "Moyens Généraux", "INSTRUCTION"),
    SMQDocument("WI-MG-002", "Accueil Visiteurs & Auditeurs", 4, "PR-MG-001", [], ["PR-MG-001"], "Moyens Généraux", "INSTRUCTION"),
    SMQDocument("FORM-MG-001", "Registre Entrées/Sorties Site", 4, "PR-MG-001", [], ["PR-MG-001"], "Moyens Généraux", "FORMULAIRE"),
    SMQDocument("FORM-MG-002", "Checklist Entretien Quotidien", 4, "PR-MG-002", [], ["PR-MG-002"], "Moyens Généraux", "FORMULAIRE"),
    SMQDocument("REG-MG-001", "Registre Interventions Sécurité", 4, "PR-MG-004", [], ["PR-MG-004"], "Sûreté / MG", "REGISTRE"),

    # ======================== NIVEAU 3 & 4 : COMMERCIAL & MARKETING ========================
    SMQDocument("PR-COM-001", "Gestion Promotion Produits Réglementée", 3, "MQ-001", ["FORM-COM-001","REG-COM-001"], ["PR-COM-004"], "Commercial", "PROCEDURE"),
    SMQDocument("PR-COM-002", "Formation Visiteurs Médicaux Produits", 3, "MQ-001", [], ["PR-COM-001","PR-RH-001"], "Marketing / DRH", "PROCEDURE"),
    SMQDocument("PR-COM-003", "Suivi Retours Terrain & Effets Indésirables", 3, "MQ-001", ["FORM-COM-002"], ["PR-REC-001","PR-HSE-001"], "Pharmacovigilance / Commercial", "PROCEDURE"),
    SMQDocument("PR-COM-004", "Validation Matériel Promotionnel Qualité", 3, "MQ-001", ["FORM-COM-003"], ["PR-AQ-003"], "Marketing / AQ", "PROCEDURE"),
    SMQDocument("FORM-COM-001", "Fiche Information Produit Visiteur", 4, "PR-COM-001", [], ["PR-COM-001","PR-COM-002"], "Commercial", "FORMULAIRE"),
    SMQDocument("FORM-COM-002", "Rapport Visite Terrain & Événement", 4, "PR-COM-003", [], ["PR-COM-003"], "Commercial", "FORMULAIRE"),
    SMQDocument("FORM-COM-003", "Demande Validation Matériel Promo", 4, "PR-COM-004", [], ["PR-COM-004"], "Marketing / AQ", "FORMULAIRE"),
    SMQDocument("REG-COM-001", "Registre Formation Visiteurs Médicaux", 4, "PR-COM-002", [], ["PR-COM-002"], "Commercial / DRH", "REGISTRE"),

    # ======================== OOS / OOT (COMPLÉTÉ) ========================
    SMQDocument("PR-OOS-001", "Gestion Résultats Hors Spécifications (OOS)", 3, "MQ-001", ["PR-OOS-003","FORM-OOS-PC-001","REG-OOS-PC-001"], ["PR-LAB-PCQ-001","PR-LAB-MIC-001"], "Labo QC / AQ", "PROCEDURE"),
    SMQDocument("PR-OOS-002", "Gestion Résultats Hors Tendance (OOT)", 3, "MQ-001", ["PR-OOS-TREND-001","FORM-OOS-STAB-001"], ["PR-RD-005","PR-LAB-PCQ-001"], "Labo QC / Stabilité", "PROCEDURE"),
    SMQDocument("PR-OOS-003", "Investigation Laboratoire Phase 1 & 2", 3, "PR-OOS-001", ["FORM-OOS-PC-002","PR-OOS-INV-001"], ["FORM-OOS-PC-001"], "Labo QC", "PROCEDURE"),
    SMQDocument("WI-OOS-001", "Arbre Décisionnel Traitement OOS", 4, "PR-OOS-001", [], ["PR-OOS-001"], "Labo QC", "INSTRUCTION"),
    SMQDocument("POL-OOS-001", "Politique Reprise Échantillons Analyse", 3, "PR-OOS-001", [], ["PR-OOS-001"], "AQ / Labo", "POLITIQUE"),
    SMQDocument("PR-OOS-PC-001", "Investigation Erreur Analytique", 3, "PR-OOS-001", [], ["PR-OOS-003"], "Labo PCQ", "PROCEDURE"),
    SMQDocument("PR-OOS-PC-002", "Évaluation Impact Processus Fabrication", 3, "PR-OOS-003", [], ["PR-OOS-PC-001"], "Production / AQ", "PROCEDURE"),
    SMQDocument("FORM-OOS-PC-001", "Fiche Initiation OOS Phase 1", 4, "PR-OOS-001", [], ["PR-OOS-001","PR-LAB-PCQ-001"], "Labo QC", "FORMULAIRE"),
    SMQDocument("FORM-OOS-PC-002", "Rapport Investigation Complète", 4, "PR-OOS-003", [], ["PR-OOS-003","PR-NC-001"], "Labo QC / AQ", "FORMULAIRE"),
    SMQDocument("REG-OOS-PC-001", "Registre OOS Traités", 4, "PR-OOS-001", [], ["FORM-OOS-PC-002","PR-OOS-TREND-001"], "Labo QC", "REGISTRE"),
    SMQDocument("PR-OOS-MIC-001", "Particularités OOS Microbiologie", 3, "PR-OOS-001", [], ["PR-LAB-MIC-001"], "Labo Micro", "PROCEDURE"),
    SMQDocument("PR-OOS-MIC-002", "Gestion Contamination Environnementale", 3, "PR-OOS-MIC-001", [], ["PR-LAB-MIC-002"], "Labo Micro / HSE", "PROCEDURE"),
    SMQDocument("PR-OOS-MIC-003", "Essai Stérilité Conduite à Tenir", 3, "PR-OOS-MIC-001", [], ["PR-PROD-004"], "Labo Micro", "PROCEDURE"),
    SMQDocument("WI-OOS-MIC-001", "Évaluation Contamination Laboratoire", 4, "PR-OOS-MIC-001", [], ["PR-OOS-MIC-001"], "Labo Micro", "INSTRUCTION"),
    SMQDocument("FORM-OOS-MIC-001", "Fiche Investigation Contamination", 4, "PR-OOS-MIC-002", [], ["PR-OOS-MIC-002"], "Labo Micro", "FORMULAIRE"),
    SMQDocument("REG-OOS-MIC-001", "Registre OOS Microbiologie", 4, "PR-OOS-MIC-001", [], ["FORM-OOS-MIC-001","PR-OOS-TREND-001"], "Labo Micro", "REGISTRE"),
    SMQDocument("PR-OOS-STAB-001", "Gestion OOT Études Stabilité", 3, "PR-OOS-002", [], ["PR-RD-005"], "R&D / QC", "PROCEDURE"),
    SMQDocument("WI-OOS-STAB-001", "Analyse Tendances Statistiques", 4, "PR-OOS-002", [], ["PR-OOS-002"], "QC / Statistiques", "INSTRUCTION"),
    SMQDocument("FORM-OOS-STAB-001", "Fiche Signalisation Tendance Anomale", 4, "PR-OOS-002", [], ["PR-OOS-002","PR-RD-005"], "QC", "FORMULAIRE"),
    SMQDocument("REG-OOS-STAB-001", "Registre OOT Stabilité", 4, "PR-OOS-STAB-001", [], ["FORM-OOS-STAB-001"], "R&D / QC", "REGISTRE"),
    SMQDocument("PR-OOS-INV-001", "Méthode Analyse Cause Racine (5M/Ishikawa)", 3, "PR-OOS-003", ["FORM-OOS-INV-001","REG-OOS-INV-001"], ["FORM-OOS-PC-002"], "AQ / Labo", "PROCEDURE"),
    SMQDocument("PR-OOS-INV-002", "Évaluation Impact Qualité Patient", 3, "PR-OOS-003", ["FORM-OOS-INV-002"], ["PR-OOS-INV-001"], "AQ / Pharmacovigilance", "PROCEDURE"),
    SMQDocument("PR-OOS-INV-003", "Lien OOS-Déviation-CAPA", 3, "PR-OOS-003", [], ["PR-OOS-INV-002","PR-AC-001"], "AQ", "PROCEDURE"),
    SMQDocument("FORM-OOS-INV-001", "Grille Évaluation Impact Risque", 4, "PR-OOS-INV-001", [], ["PR-OOS-INV-001"], "AQ", "FORMULAIRE"),
    SMQDocument("FORM-OOS-INV-002", "Plan Échantillonnage Complémentaire", 4, "PR-OOS-INV-002", [], ["PR-OOS-INV-002"], "Labo QC", "FORMULAIRE"),
    SMQDocument("REG-OOS-INV-001", "Bibliothèque Causes Racines Récurrentes", 4, "PR-OOS-INV-001", [], ["PR-OOS-INV-001","PR-AC-001"], "AQ", "REGISTRE"),
    SMQDocument("PR-OOS-TREND-001", "Revue Périodique Statistiques OOS", 3, "PR-OOS-002", ["FORM-OOS-TREND-001","FORM-OOS-TREND-002"], ["REG-OOS-PC-001","REG-OOS-MIC-001"], "AQ / Labo", "PROCEDURE"),
    SMQDocument("PR-OOS-TREND-002", "Définition Limites Alerte/Action (Carte Contrôle)", 3, "PR-OOS-TREND-001", [], ["PR-OOS-TREND-001"], "AQ / QC", "PROCEDURE"),
    SMQDocument("FORM-OOS-TREND-001", "Tableau de Bord Indicateurs OOS", 4, "PR-OOS-TREND-001", [], ["PR-OOS-TREND-001"], "AQ", "FORMULAIRE"),
    SMQDocument("FORM-OOS-TREND-002", "Rapport Revue Tendances Trimestrielle", 4, "PR-OOS-TREND-001", [], ["PR-OOS-TREND-001"], "AQ", "FORMULAIRE"),
    SMQDocument("REG-OOS-TREND-001", "Historique Taux OOS par Produit/Procédé", 4, "PR-OOS-TREND-002", [], ["FORM-OOS-TREND-002"], "AQ / Production", "REGISTRE"),
    SMQDocument("FORM-OOS-TR-001", "Plan Formation Personnel Labo OOS", 4, "PR-OOS-001", [], ["PR-RH-001"], "AQ / Labo", "FORMULAIRE"),
    SMQDocument("WI-OOS-TR-001", "Simulation Cas OOS (Exercice Pratique)", 4, "PR-OOS-001", [], ["PR-RH-001"], "AQ", "INSTRUCTION"),
    SMQDocument("FORM-OOS-TR-002", "Évaluation Compétences Investigation", 4, "PR-OOS-TR-001", [], ["PR-RH-003"], "DRH / AQ", "FORMULAIRE"),
    SMQDocument("REG-OOS-TR-001", "Registre Formations OOS Personnel", 4, "PR-OOS-001", [], ["FORM-OOS-TR-001","FORM-OOS-TR-002"], "DRH", "REGISTRE"),

    # ======================== DOSSIER DE LOT (COMPLÉTÉ) ========================
    SMQDocument("PR-DL-001", "Élaboration Dossier Lot Master (MBR)", 3, "MQ-001", ["MBR-ST-001","MBR-OR-001","MBR-TP-001"], ["PR-PROD-001","PR-RD-003"], "Production / AQ", "PROCEDURE"),
    SMQDocument("PR-DL-002", "Remplissage & Validation Dossier Exécution", 3, "MQ-001", ["DL-EXEC-001","ANNEXE-OR-001"], ["PR-DL-001","PR-PROD-002"], "Production", "PROCEDURE"),
    SMQDocument("PR-DL-003", "Revue Qualité & Libération Dossier Lot", 3, "MQ-001", ["DL-REVUE-001"], ["PR-AQ-001","PR-DL-002"], "AQ", "PROCEDURE"),
    SMQDocument("PR-DL-004", "Gestion Dossiers Lot Électroniques (eBMR)", 3, "MQ-001", [], ["PR-IT-003","PR-DL-DI-002"], "Informatique / Production", "PROCEDURE"),
    SMQDocument("WI-DL-001", "Conventions Saisie & Corrections (ALCOA+)", 4, "PR-DL-004", [], ["PR-DL-002","PR-DL-DI-001"], "AQ / Production", "INSTRUCTION"),
    SMQDocument("FORM-DL-001", "Checklist Complétude Dossier Lot Avant Revue", 4, "PR-DL-003", [], ["PR-DL-002","DL-EXEC-001"], "AQ", "FORMULAIRE"),
    SMQDocument("MBR-ST-001", "Dossier Lot Master - Injectables Stériles", 3, "PR-DL-001", ["ANNEXE-ST-001","ANNEXE-ST-002","CHECKLIST-ST-001"], ["PR-DL-001","PR-RD-005"], "R&D / Production", "MASTER_BATCH"),
    SMQDocument("MBR-ST-002", "Dossier Lot Master - Poudre Lyophilisée", 3, "PR-DL-001", [], ["PR-DL-001"], "R&D / Production", "MASTER_BATCH"),
    SMQDocument("ANNEXE-ST-001", "Feuilles Température Stérilisation Autoclave", 4, "MBR-ST-001", [], ["MBR-ST-001"], "Production", "FORMULAIRE"),
    SMQDocument("ANNEXE-ST-002", "Enregistrements Environnement Zone A/B", 4, "MBR-ST-001", [], ["MBR-ST-001","PR-LAB-MIC-002"], "Production / Labo Micro", "FORMULAIRE"),
    SMQDocument("CHECKLIST-ST-001", "Vérifications Aseptiques Avant Remplissage", 4, "MBR-ST-001", [], ["MBR-ST-001","PR-PROD-002"], "Production", "FORMULAIRE"),
    SMQDocument("MBR-OR-001", "Dossier Lot Master - Comprimés/Gélules", 3, "PR-DL-001", ["ANNEXE-OR-001","ANNEXE-OR-002","CHECKLIST-OR-001"], ["PR-DL-001"], "R&D / Production", "MASTER_BATCH"),
    SMQDocument("MBR-OR-002", "Dossier Lot Master - Sirop/Suspension", 3, "PR-DL-001", [], ["PR-DL-001"], "R&D / Production", "MASTER_BATCH"),
    SMQDocument("ANNEXE-OR-001", "Feuilles Pesée & Rapprochement Matières", 4, "MBR-OR-001", [], ["MBR-OR-001"], "Production", "FORMULAIRE"),
    SMQDocument("ANNEXE-OR-002", "Paramètres Compression & Enrobage", 4, "MBR-OR-001", [], ["MBR-OR-001"], "Production", "FORMULAIRE"),
    SMQDocument("CHECKLIST-OR-001", "Vérifications Emballage Primaire/Secondaire", 4, "MBR-OR-001", [], ["MBR-OR-001","PR-PROD-002"], "Production", "FORMULAIRE"),
    SMQDocument("MBR-TP-001", "Dossier Lot Master - Crème/Pommade", 3, "PR-DL-001", ["ANNEXE-TP-001","CHECKLIST-TP-001"], ["PR-DL-001"], "R&D / Production", "MASTER_BATCH"),
    SMQDocument("ANNEXE-TP-001", "Paramètres Mélange & Homogénéisation", 4, "MBR-TP-001", [], ["MBR-TP-001"], "Production", "FORMULAIRE"),
    SMQDocument("CHECKLIST-TP-001", "Contrôle Viscosité/pH/Aspect", 4, "MBR-TP-001", [], ["MBR-TP-001"], "Production / QC", "FORMULAIRE"),
    SMQDocument("DL-EXEC-001", "Dossier Lot Exécution Rempli", 4, "PR-DL-002", [], ["PR-PROD-002","PR-PROD-005","FORM-DEV-PROD-001"], "Production", "ENREGISTREMENT"),
    SMQDocument("DL-ANNEX-001", "Feuilles Pesée Signées Lot", 4, "PR-DL-002", [], ["ANNEXE-OR-001","DL-EXEC-001"], "Production", "ENREGISTREMENT"),
    SMQDocument("DL-ANNEX-002", "Enregistrements Équipements Lot", 4, "PR-DL-002", [], ["FORM-PROD-002","DL-EXEC-001"], "Production", "ENREGISTREMENT"),
    SMQDocument("DL-ANNEX-003", "Résultats IPC & QC Lot", 4, "PR-DL-002", [], ["PR-LAB-PCQ-001","DL-EXEC-001"], "Production / QC", "ENREGISTREMENT"),
    SMQDocument("DL-DEV-001", "Liens Déviations Associées au Lot", 4, "PR-DL-002", [], ["PR-DEV-001","DL-EXEC-001"], "Production / AQ", "ENREGISTREMENT"),
    SMQDocument("DL-CAPA-001", "Liens Actions Correctives Lot", 4, "PR-DL-002", [], ["PR-AC-001","DL-DEV-001"], "Production / AQ", "ENREGISTREMENT"),
    SMQDocument("DL-REVUE-001", "Fiche Revue Qualité Lot Signée", 4, "PR-DL-003", [], ["DL-EXEC-001","PR-AQ-001","FORM-DL-001"], "AQ", "ENREGISTREMENT"),
    SMQDocument("PR-DL-INT-001", "Interface Dossier Lot / LIMS / SAP / MES", 3, "MQ-001", ["WI-DL-INT-001","REG-DL-INT-001"], ["PR-IT-003","PR-DL-004"], "Informatique", "PROCEDURE"),
    SMQDocument("PR-DL-INT-002", "Synchronisation Données Temps Réel eBMR", 3, "MQ-001", [], ["PR-DL-INT-001"], "Informatique / Production", "PROCEDURE"),
    SMQDocument("WI-DL-INT-001", "Procédure Export/Import Données Validées", 4, "PR-DL-INT-001", [], ["PR-DL-INT-001"], "Informatique", "INSTRUCTION"),
    SMQDocument("REG-DL-INT-001", "Registre Systèmes Interconnectés Dossier Lot", 4, "PR-DL-INT-001", [], ["PR-DL-INT-001"], "Informatique", "REGISTRE"),
    SMQDocument("PR-DL-DI-001", "Application Principes ALCOA+ Dossier Lot", 3, "MQ-001", ["FORM-DL-DI-001","REG-DL-DI-001"], ["PR-IT-002","WI-DL-001"], "AQ / Informatique", "PROCEDURE"),
    SMQDocument("PR-DL-DI-002", "Gestion Signatures Électroniques (Part11/Ann11)", 3, "MQ-001", [], ["PR-IT-001","PR-DL-004"], "Informatique / AQ", "PROCEDURE"),
    SMQDocument("PR-DL-DI-003", "Audit Trail Modifications Données Critiques", 3, "MQ-001", [], ["PR-IT-003","PR-DL-DI-001"], "Informatique / AQ", "PROCEDURE"),
    SMQDocument("WI-DL-DI-001", "Vérification Intégrité Données Avant Archivage", 4, "PR-DL-DI-001", [], ["PR-DL-DI-001","PR-IT-002"], "AQ / Archives", "INSTRUCTION"),
    SMQDocument("FORM-DL-DI-001", "Checklist Conformité Intégrité Données", 4, "PR-DL-DI-001", [], ["PR-DL-DI-001"], "AQ", "FORMULAIRE"),
    SMQDocument("REG-DL-DI-001", "Registre Anomalies Intégrité Données Traitées", 4, "PR-DL-DI-001", [], ["PR-DL-DI-003"], "AQ / Informatique", "REGISTRE"),

    # ======================== DÉVIATIONS (COMPLÉTÉ) ========================
    SMQDocument("PR-DEV-001", "Classification & Gestion des Déviations", 3, "MQ-001", ["PR-DEV-003","FORM-DEV-001","REG-DEV-PROD-001"], ["PR-PROD-002","PR-LAB-PCQ-001","PR-MAINT-002"], "AQ", "PROCEDURE"),
    SMQDocument("PR-DEV-002", "Procédure Initiation & Enregistrement Déviation", 3, "PR-DEV-001", [], ["PR-DEV-001"], "AQ", "PROCEDURE"),
    SMQDocument("PR-DEV-003", "Méthode Investigation DMAIC / 5 Pourquoi", 3, "PR-DEV-001", ["FORM-DEV-INV-002","FORM-DEV-INV-003"], ["FORM-DEV-001"], "AQ", "PROCEDURE"),
    SMQDocument("PR-DEV-004", "Évaluation Impact Qualité Patient & Conformité", 3, "PR-DEV-001", ["FORM-DEV-INV-001"], ["PR-DEV-003"], "AQ / Pharmacovigilance", "PROCEDURE"),
    SMQDocument("PR-DEV-005", "Lien Déviation - CAPA - Change Control", 3, "PR-DEV-001", [], ["PR-DEV-004","PR-AC-001","PR-CC-001"], "AQ", "PROCEDURE"),
    SMQDocument("WI-DEV-001", "Arbre Décisionnel Traitement Déviation", 4, "PR-DEV-001", [], ["PR-DEV-001"], "AQ", "INSTRUCTION"),
    SMQDocument("PR-DEV-PROD-001", "Déviation Paramètres Critiques Processus", 3, "PR-DEV-001", ["FORM-DEV-PROD-001","FORM-DEV-PROD-002","REG-DEV-PROD-001"], ["PR-PROD-004"], "Production / AQ", "PROCEDURE"),
    SMQDocument("PR-DEV-PROD-002", "Déviation Rendement & Réconciliation Masse", 3, "PR-DEV-PROD-001", [], ["PR-PROD-002"], "Production", "PROCEDURE"),
    SMQDocument("FORM-DEV-PROD-001", "Fiche Initiation Déviation Production", 4, "PR-DEV-PROD-001", [], ["PR-DEV-PROD-001","DL-EXEC-001"], "Production", "FORMULAIRE"),
    SMQDocument("FORM-DEV-PROD-002", "Rapport Investigation Cause Racine", 4, "PR-DEV-PROD-001", [], ["PR-DEV-003"], "Production / AQ", "FORMULAIRE"),
    SMQDocument("REG-DEV-PROD-001", "Registre Déviations Production", 4, "PR-DEV-PROD-001", [], ["FORM-DEV-PROD-001","PR-DEV-SUIVI-001"], "Production / AQ", "REGISTRE"),
    SMQDocument("PR-DEV-LAB-001", "Déviation Méthodes Analyse & Équipements", 3, "PR-DEV-001", ["FORM-DEV-LAB-001","REG-DEV-LAB-001"], ["PR-LAB-PCQ-001"], "Labo QC / AQ", "PROCEDURE"),
    SMQDocument("PR-DEV-LAB-002", "Lien Déviation Labo / OOS / Investigation", 3, "PR-DEV-LAB-001", [], ["PR-OOS-001","PR-DEV-001"], "Labo QC / AQ", "PROCEDURE"),
    SMQDocument("FORM-DEV-LAB-001", "Fiche Déviation Équipement Mesure", 4, "PR-DEV-LAB-001", [], ["PR-DEV-LAB-001"], "Labo QC", "FORMULAIRE"),
    SMQDocument("REG-DEV-LAB-001", "Registre Déviations Laboratoire", 4, "PR-DEV-LAB-001", [], ["FORM-DEV-LAB-001"], "Labo QC / AQ", "REGISTRE"),
    SMQDocument("PR-DEV-UTIL-001", "Déviation Systèmes Eau, Air & Vapeur", 3, "PR-DEV-001", ["FORM-DEV-UTIL-001","REG-DEV-UTIL-001"], ["PR-EAU-001","PR-EAU-002"], "Maintenance / AQ", "PROCEDURE"),
    SMQDocument("PR-DEV-UTIL-002", "Déviation Groupes Électrogènes Secours", 3, "PR-DEV-UTIL-001", [], ["PR-UTIL-002"], "Maintenance / AQ", "PROCEDURE"),
    SMQDocument("FORM-DEV-UTIL-001", "Fiche Déviation Utilités Critiques", 4, "PR-DEV-UTIL-001", [], ["PR-DEV-UTIL-001"], "Maintenance", "FORMULAIRE"),
    SMQDocument("REG-DEV-UTIL-001", "Registre Déviations Infrastructures", 4, "PR-DEV-UTIL-001", [], ["FORM-DEV-UTIL-001"], "Maintenance / AQ", "REGISTRE"),
    SMQDocument("PR-DEV-DOC-001", "Déviation Documents, Formations & Signatures", 3, "PR-DEV-001", ["FORM-DEV-DOC-001","REG-DEV-DOC-001"], ["PR-4.2.4","PR-RH-001"], "AQ", "PROCEDURE"),
    SMQDocument("PR-DEV-DOC-002", "Déviation Systèmes Informatiques Validés", 3, "PR-DEV-DOC-001", [], ["PR-IT-004"], "Informatique / AQ", "PROCEDURE"),
    SMQDocument("FORM-DEV-DOC-001", "Fiche Déviation Documentaire", 4, "PR-DEV-DOC-001", [], ["PR-DEV-DOC-001"], "AQ", "FORMULAIRE"),
    SMQDocument("REG-DEV-DOC-001", "Registre Déviations Documentaires", 4, "PR-DEV-DOC-001", [], ["FORM-DEV-DOC-001"], "AQ", "REGISTRE"),
    SMQDocument("PR-DEV-INV-001", "Planification Enquêtes Pluridisciplinaires", 3, "PR-DEV-003", [], ["PR-DEV-003"], "AQ", "PROCEDURE"),
    SMQDocument("PR-DEV-INV-002", "Collecte Preuves, Données & Témoignages", 3, "PR-DEV-INV-001", [], ["PR-DEV-003"], "AQ", "PROCEDURE"),
    SMQDocument("PR-DEV-INV-003", "Analyse Risque PFMEA Impact Patient", 3, "PR-DEV-004", [], ["PR-DEV-INV-002"], "AQ / R&D", "PROCEDURE"),
    SMQDocument("FORM-DEV-INV-001", "Grille Évaluation Criticité Déviation", 4, "PR-DEV-INV-001", [], ["PR-DEV-004"], "AQ", "FORMULAIRE"),
    SMQDocument("FORM-DEV-INV-002", "Plan d'Action Investigation & Échéancier", 4, "PR-DEV-INV-001", [], ["PR-DEV-003"], "AQ", "FORMULAIRE"),
    SMQDocument("FORM-DEV-INV-003", "Rapport Synthèse Investigation Finale", 4, "PR-DEV-003", [], ["PR-DEV-INV-003","PR-DEV-SUIVI-001"], "AQ", "FORMULAIRE"),
    SMQDocument("REG-DEV-INV-001", "Bibliothèque Causes Racines Récurrentes", 4, "PR-DEV-SUIVI-001", [], ["FORM-DEV-INV-003","PR-AC-001"], "AQ", "REGISTRE"),
    SMQDocument("PR-DEV-SUIVI-001", "Suivi Échéances & Clôture Déviations", 3, "PR-DEV-001", ["FORM-DEV-SUIVI-001","REG-DEV-SUIVI-001"], ["FORM-DEV-INV-003"], "AQ", "PROCEDURE"),
    SMQDocument("PR-DEV-SUIVI-002", "Évaluation Efficacité Actions Post-Implémentation", 3, "PR-DEV-SUIVI-001", ["FORM-DEV-SUIVI-002"], ["PR-DEV-SUIVI-001","PR-AC-001"], "AQ", "PROCEDURE"),
    SMQDocument("PR-DEV-SUIVI-003", "Revue Périodique Tendances Déviations", 3, "PR-DEV-SUIVI-001", [], ["PR-DEV-SUIVI-001"], "AQ", "PROCEDURE"),
    SMQDocument("FORM-DEV-SUIVI-001", "Tableau de Bord Suivi Déviations Ouvertes", 4, "PR-DEV-SUIVI-001", [], ["PR-DEV-SUIVI-001"], "AQ", "FORMULAIRE"),
    SMQDocument("FORM-DEV-SUIVI-002", "Fiche Vérification Efficacité CAPA", 4, "PR-DEV-SUIVI-002", [], ["PR-DEV-SUIVI-002"], "AQ", "FORMULAIRE"),
    SMQDocument("REG-DEV-SUIVI-001", "Historique Taux Clôture Délais Déviations", 4, "PR-DEV-SUIVI-003", [], ["PR-DEV-SUIVI-001","FORM-DEV-SUIVI-001"], "AQ", "REGISTRE"),
    SMQDocument("PR-DEV-FORM-001", "Plan Formation Gestion Déviations", 3, "PR-DEV-001", ["REG-DEV-FORM-001"], ["PR-RH-001"], "AQ / DRH", "PROCEDURE"),
    SMQDocument("WI-DEV-FORM-001", "Cas Pratiques Investigation Déviation", 4, "PR-DEV-FORM-001", [], ["PR-RH-001"], "AQ", "INSTRUCTION"),
    SMQDocument("FORM-DEV-FORM-001", "Évaluation Compétences Investigation", 4, "PR-DEV-FORM-001", [], ["PR-RH-003"], "DRH / AQ", "FORMULAIRE"),
    SMQDocument("REG-DEV-FORM-001", "Registre Formations Déviations Personnel", 4, "PR-DEV-FORM-001", [], ["FORM-DEV-FORM-001"], "DRH", "REGISTRE"),

    # ======================== CHANGE CONTROL (COMPLÉTÉ) ========================
    SMQDocument("PR-CC-001", "Gestion des Changements Qualité/Réglementaire", 3, "MQ-001", ["PR-CC-002","FORM-CC-EVAL-001","REG-CC-001"], ["PR-CC-PROC-001","PR-CC-EQP-001","PR-CC-METH-001"], "AQ", "PROCEDURE"),
    SMQDocument("PR-CC-002", "Classification Impact (Mineur/Majeur/Critique)", 3, "PR-CC-001", ["WI-CC-001"], ["PR-CC-001"], "AQ", "PROCEDURE"),
    SMQDocument("PR-CC-003", "Évaluation Impact Réglementaire & Notification", 3, "PR-CC-001", ["FORM-CC-REG-001","REG-CC-REG-001"], ["PR-CC-002","PR-CC-REG-001"], "Affaires Réglementaires", "PROCEDURE"),
    SMQDocument("PR-CC-004", "Lien Change Control & Validation/Requalification", 3, "PR-CC-001", [], ["PR-IT-003","PR-PROD-002"], "AQ / Maintenance", "PROCEDURE"),
    SMQDocument("PR-CC-005", "Communication Changements & Formation Personnel", 3, "PR-CC-001", [], ["PR-RH-001","PR-4.2.4"], "DRH / AQ", "PROCEDURE"),
    SMQDocument("WI-CC-001", "Arbre Décisionnel Évaluation Impact Changement", 4, "PR-CC-002", [], ["PR-CC-001"], "AQ", "INSTRUCTION"),
    SMQDocument("PR-CC-PROC-001", "Modification Paramètres Critiques Processus", 3, "PR-CC-001", ["FORM-CC-PROC-001","FORM-CC-PROC-002","REG-CC-PROC-001"], ["PR-PROD-001","PR-DL-001"], "Production / Technique", "PROCEDURE"),
    SMQDocument("PR-CC-PROC-002", "Changement Échelle Fabrication (Scale-Up/Down)", 3, "PR-CC-PROC-001", [], ["PR-RD-003","PR-CC-004"], "R&D / Production", "PROCEDURE"),
    SMQDocument("PR-CC-PROC-003", "Introduction Nouvelle Technologie/Équipement", 3, "PR-CC-PROC-001", [], ["PR-MAINT-001","PR-IT-003"], "Technique / IT", "PROCEDURE"),
    SMQDocument("FORM-CC-PROC-001", "Demande Changement Procédé", 4, "PR-CC-PROC-001", [], ["PR-CC-001"], "Production", "FORMULAIRE"),
    SMQDocument("FORM-CC-PROC-002", "Évaluation Impact Validation Procédé", 4, "PR-CC-PROC-001", [], ["PR-CC-004","PR-RD-002"], "AQ / R&D", "FORMULAIRE"),
    SMQDocument("REG-CC-PROC-001", "Registre Changements Procédés", 4, "PR-CC-PROC-001", [], ["FORM-CC-PROC-001","PR-CC-SUIVI-001"], "Production / AQ", "REGISTRE"),
    SMQDocument("PR-CC-EQP-001", "Remplacement/Modification Équipements Critiques", 3, "PR-CC-001", ["FORM-CC-EQP-001","FORM-CC-EQP-002","REG-CC-EQP-001"], ["PR-MAINT-002","PR-LAB-PCQ-003"], "Maintenance / AQ", "PROCEDURE"),
    SMQDocument("PR-CC-EQP-002", "Changement Fournisseur Pièces Rechange", 3, "PR-CC-EQP-001", [], ["PR-SC-006"], "Maintenance / Supply", "PROCEDURE"),
    SMQDocument("PR-CC-EQP-003", "Modification Systèmes Eau/Air/Traitement", 3, "PR-CC-EQP-001", [], ["PR-EAU-001","PR-MAINT-FRD-002"], "Maintenance / AQ", "PROCEDURE"),
    SMQDocument("FORM-CC-EQP-001", "Demande Changement Équipement", 4, "PR-CC-EQP-001", [], ["PR-CC-001"], "Maintenance", "FORMULAIRE"),
    SMQDocument("FORM-CC-EQP-002", "Checklist Requalification Post-Changement", 4, "PR-CC-EQP-001", [], ["PR-CC-004","PR-MAINT-001"], "AQ / Maintenance", "FORMULAIRE"),
    SMQDocument("REG-CC-EQP-001", "Registre Changements Équipements", 4, "PR-CC-EQP-001", [], ["FORM-CC-EQP-001","PR-CC-SUIVI-001"], "Maintenance / AQ", "REGISTRE"),
    SMQDocument("PR-CC-METH-001", "Modification Méthodes Analyse Validées", 3, "PR-CC-001", ["FORM-CC-METH-001","FORM-CC-METH-002","REG-CC-METH-001"], ["PR-RD-002","PR-LAB-PCQ-002"], "Labo QC / R&D", "PROCEDURE"),
    SMQDocument("PR-CC-METH-002", "Changement Spécifications & Critères Acceptation", 3, "PR-CC-METH-001", [], ["PR-RD-005","PR-CC-REG-001"], "R&D / AQ", "PROCEDURE"),
    SMQDocument("PR-CC-METH-003", "Transfert de Méthodes entre Laboratoires", 3, "PR-CC-METH-001", [], ["PR-RD-002","PR-LAB-MIC-005"], "Labo QC / R&D", "PROCEDURE"),
    SMQDocument("FORM-CC-METH-001", "Demande Changement Méthode Analyse", 4, "PR-CC-METH-001", [], ["PR-CC-001"], "Labo QC", "FORMULAIRE"),
    SMQDocument("FORM-CC-METH-002", "Rapport Revalidation Méthode", 4, "PR-CC-METH-001", [], ["PR-RD-002","PR-CC-004"], "Labo QC / R&D", "FORMULAIRE"),
    SMQDocument("REG-CC-METH-001", "Registre Changements Méthodes", 4, "PR-CC-METH-001", [], ["FORM-CC-METH-001","PR-CC-SUIVI-001"], "Labo QC / AQ", "REGISTRE"),
    SMQDocument("PR-CC-DOC-001", "Modification Procédures/Formulaires Critiques", 3, "PR-CC-001", ["FORM-CC-DOC-001","FORM-CC-DOC-002","REG-CC-DOC-001"], ["PR-4.2.4"], "AQ", "PROCEDURE"),
    SMQDocument("PR-CC-DOC-002", "Changement Systèmes Informatiques Validés", 3, "PR-CC-DOC-001", [], ["PR-IT-003","PR-IT-004"], "Informatique / AQ", "PROCEDURE"),
    SMQDocument("PR-CC-DOC-003", "Mise à Jour Dossiers Enregistrement Réglementaires", 3, "PR-CC-DOC-001", [], ["REG-003","PR-CC-REG-002"], "Affaires Réglementaires", "PROCEDURE"),
    SMQDocument("FORM-CC-DOC-001", "Demande Changement Documentaire", 4, "PR-CC-DOC-001", [], ["PR-CC-001"], "AQ", "FORMULAIRE"),
    SMQDocument("FORM-CC-DOC-002", "Checklist Impact Formation Personnel", 4, "PR-CC-005", [], ["PR-CC-001"], "DRH / AQ", "FORMULAIRE"),
    SMQDocument("REG-CC-DOC-001", "Registre Changements Documentaires", 4, "PR-CC-DOC-001", [], ["FORM-CC-DOC-001","PR-CC-SUIVI-001"], "AQ", "REGISTRE"),
    SMQDocument("PR-CC-SUP-001", "Changement Fournisseur Matière Première", 3, "PR-CC-001", ["FORM-CC-SUP-001","FORM-CC-SUP-002","REG-CC-SUP-001"], ["PR-SC-006"], "Supply Chain / AQ", "PROCEDURE"),
    SMQDocument("PR-CC-SUP-002", "Modification Spécifications Achats", 3, "PR-CC-SUP-001", [], ["PR-SC-001","PR-LAB-PCQ-002"], "Supply Chain / QC", "PROCEDURE"),
    SMQDocument("PR-CC-SUP-003", "Qualification Nouveau Site Production Fournisseur", 3, "PR-CC-SUP-001", [], ["PR-SC-007"], "Supply Chain / AQ", "PROCEDURE"),
    SMQDocument("FORM-CC-SUP-001", "Demande Changement Fournisseur", 4, "PR-CC-SUP-001", [], ["PR-CC-001"], "Supply Chain", "FORMULAIRE"),
    SMQDocument("FORM-CC-SUP-002", "Évaluation Impact Qualité Matière", 4, "PR-CC-SUP-001", [], ["PR-SC-001","PR-LAB-PCQ-001"], "QC / AQ", "FORMULAIRE"),
    SMQDocument("REG-CC-SUP-001", "Registre Changements Fournisseurs", 4, "PR-CC-SUP-001", [], ["FORM-CC-SUP-001","PR-CC-SUIVI-001"], "Supply Chain / AQ", "REGISTRE"),
    SMQDocument("PR-CC-EVAL-001", "Comité Change Control : Composition & Rôles", 3, "PR-CC-001", ["REG-CC-EVAL-001"], ["FORM-CC-EVAL-001"], "AQ / Direction / Technique", "PROCEDURE"),
    SMQDocument("PR-CC-EVAL-002", "Méthode Évaluation Risque Changement (PFMEA)", 3, "PR-CC-EVAL-001", ["FORM-CC-EVAL-002"], ["PR-CC-001"], "AQ / Technique", "PROCEDURE"),
    SMQDocument("PR-CC-EVAL-003", "Plan Implémentation & Échelonnement Changement", 3, "PR-CC-EVAL-001", ["FORM-CC-EVAL-003"], ["PR-CC-EVAL-001"], "AQ / Technique", "PROCEDURE"),
    SMQDocument("FORM-CC-EVAL-001", "Demande & Évaluation Changement", 4, "PR-CC-001", [], ["PR-CC-001","PR-CC-EVAL-001"], "Tous Départements", "FORMULAIRE"),
    SMQDocument("FORM-CC-EVAL-002", "Rapport Test & Validation Post-Changement", 4, "PR-CC-EVAL-002", [], ["PR-CC-EVAL-002"], "AQ / R&D", "FORMULAIRE"),
    SMQDocument("FORM-CC-EVAL-003", "Fiche Approbation Comité Change Control", 4, "PR-CC-EVAL-001", [], ["PR-CC-EVAL-001"], "Direction / AQ", "FORMULAIRE"),
    SMQDocument("REG-CC-EVAL-001", "Registre Décisions Comité Change Control", 4, "PR-CC-EVAL-001", [], ["FORM-CC-EVAL-003"], "AQ", "REGISTRE"),
    SMQDocument("PR-CC-SUIVI-001", "Suivi Implémentation Actions Post-Changement", 3, "PR-CC-001", ["FORM-CC-SUIVI-001"], ["PR-CC-EVAL-003"], "AQ / Technique", "PROCEDURE"),
    SMQDocument("PR-CC-SUIVI-002", "Vérification Efficacité Changement Post-Implémentation", 3, "PR-CC-001", ["FORM-CC-SUIVI-002"], ["PR-CC-SUIVI-001"], "AQ", "PROCEDURE"),
    SMQDocument("PR-CC-SUIVI-003", "Archivage Dossier Changement Complet", 3, "PR-CC-001", [], ["PR-4.2.5"], "AQ / Archives", "PROCEDURE"),
    SMQDocument("FORM-CC-SUIVI-001", "Tableau de Bord Suivi Changements Ouverts", 4, "PR-CC-SUIVI-001", [], ["PR-CC-SUIVI-001"], "AQ", "FORMULAIRE"),
    SMQDocument("FORM-CC-SUIVI-002", "Rapport Clôture Changement", 4, "PR-CC-SUIVI-002", [], ["PR-CC-SUIVI-002","PR-CC-001"], "AQ", "FORMULAIRE"),
    SMQDocument("REG-CC-SUIVI-001", "Historique Changements Implémentés", 4, "PR-CC-SUIVI-003", [], ["FORM-CC-SUIVI-002"], "AQ", "REGISTRE"),
    SMQDocument("PR-CC-REG-001", "Notification Autorités Sanitaires Changements", 3, "PR-CC-001", ["FORM-CC-REG-002","REG-CC-REG-001"], ["PR-CC-002","PR-CC-EVAL-001"], "Affaires Réglementaires / AQ", "PROCEDURE"),
    SMQDocument("PR-CC-REG-002", "Mise à Jour Dossiers AMM/DMF Changements", 3, "PR-CC-REG-001", [], ["PR-CC-DOC-003"], "Affaires Réglementaires", "PROCEDURE"),
    SMQDocument("PR-CC-REG-003", "Veille Réglementaire Impact Changements", 3, "PR-CC-REG-001", ["FORM-CC-REG-001"], ["REG-004"], "Affaires Réglementaires", "PROCEDURE"),
    SMQDocument("FORM-CC-REG-001", "Checklist Exigences Notification par Marché", 4, "PR-CC-REG-003", [], ["PR-CC-REG-001"], "Affaires Réglementaires", "FORMULAIRE"),
    SMQDocument("FORM-CC-REG-002", "Lettre Notification Autorité Sanitaire", 4, "PR-CC-REG-001", [], ["PR-CC-REG-001"], "Affaires Réglementaires", "FORMULAIRE"),
    SMQDocument("REG-CC-REG-001", "Registre Notifications Réglementaires Changements", 4, "PR-CC-REG-001", [], ["FORM-CC-REG-002","PR-CC-REG-002"], "Affaires Réglementaires", "REGISTRE")
]

# =============================================================================
# 🛠️ FONCTIONS DE VALIDATION & EXPORT
# =============================================================================
def validate_hierarchy(docs: List[SMQDocument]) -> List[str]:
    errors = []
    codes = {d.code for d in docs}
    doc_map = {d.code: d for d in docs}
    
    for doc in docs:
        if doc.parent_code and doc.parent_code not in codes:
            errors.append(f"[{doc.code}] Parent '{doc.parent_code}' introuvable.")
        for child in doc.children_codes:
            if child not in codes:
                errors.append(f"[{doc.code}] Enfant '{child}' introuvable.")
            elif doc_map[child].parent_code != doc.code:
                errors.append(f"[{doc.code}] Incohérence : enfant '{child}' pointe vers parent '{doc_map[child].parent_code}'.")
        if doc.level == 1 and doc.parent_code:
            errors.append(f"[{doc.code}] Niveau 1 ne doit pas avoir de parent.")
        if doc.level == 4 and not doc.parent_code:
            errors.append(f"[{doc.code}] Niveau 4 doit avoir un parent (Procédure/Formulaire).")
    return errors

def export_json(docs: List[SMQDocument], filepath: str = "smq_documents_complet.json"):
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump([d.to_dict() for d in docs], f, indent=2, ensure_ascii=False)
    print(f"✅ Export JSON réussi : {filepath}")

def export_csv(docs: List[SMQDocument], filepath: str = "smq_documents_complet.csv"):
    with open(filepath, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Code", "Titre", "Niveau", "Parent", "Enfants", "Déclencheurs", "Département", "Type"])
        for d in docs:
            writer.writerow([
                d.code, d.title, d.level, d.parent_code or "Aucun",
                "|".join(d.children_codes), "|".join(d.trigger_codes),
                d.department, d.doc_type
            ])
    print(f"✅ Export CSV réussi : {filepath}")

# =============================================================================
# 🚀 EXÉCUTION
# =============================================================================
if __name__ == "__main__":
    print("🔍 Validation de l'arborescence SMQ COMPLÈTE...")
    errs = validate_hierarchy(DOCUMENTS_DB)
    if errs:
        print(f"⚠️ {len(errs)} ERREURS DÉTECTÉES :")
        for e in errs: print(f"   - {e}")
    else:
        print("✅ Arborescence COMPLÈTE cohérente et valide.")
        
    print("\n📤 Export des données...")
    export_json(DOCUMENTS_DB)
    export_csv(DOCUMENTS_DB)
    
    print(f"\n📊 STATISTIQUES FINALES :")
    print(f"   Total documents : {len(DOCUMENTS_DB)}")
    for lvl in range(1, 5):
        count = sum(1 for d in DOCUMENTS_DB if d.level == lvl)
        noms = {1: "Stratégique", 2: "Transversal", 3: "Métier/Technique", 4: "Enregistrements"}
        print(f"   Niveau {lvl} ({noms[lvl]}) : {count}")
    print(f"\n💡 Prêt pour intégration GED/ERP. Lancez : python smq_complet.py")
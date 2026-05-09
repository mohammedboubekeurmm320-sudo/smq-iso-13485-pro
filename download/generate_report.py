#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
QMS SaaS Pro — Rapport de Taux de Realisation
Analyse comparative entre le prompt de specification et l'implementation actuelle
"""

import os, sys, hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm, mm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib import colors
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle, Image, 
    PageBreak, KeepTogether, CondPageBreak
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.platypus import SimpleDocTemplate
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ──────────────────────────────────────────────────────────────
# Font Registration
# ──────────────────────────────────────────────────────────────
pdfmetrics.registerFont(TTFont('NotoSansSC', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSC', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSCBold', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Tinos', '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'))
pdfmetrics.registerFont(TTFont('TinosBold', '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSansBold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSansMono', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))

registerFontFamily('NotoSansSC', normal='NotoSansSC', bold='SarasaMonoSCBold')
registerFontFamily('SarasaMonoSC', normal='SarasaMonoSC', bold='SarasaMonoSCBold')
registerFontFamily('Tinos', normal='Tinos', bold='TinosBold')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSansBold')

# Install font fallback for mixed CJK/Latin text
PDF_SKILL_DIR = "/home/z/my-project/skills/pdf"
_scripts = os.path.join(PDF_SKILL_DIR, "scripts")
if _scripts not in sys.path:
    sys.path.insert(0, _scripts)
from pdf import install_font_fallback
install_font_fallback()

# ──────────────────────────────────────────────────────────────
# Cascade Palette
# ──────────────────────────────────────────────────────────────
PAGE_BG       = colors.HexColor('#f4f4f3')
SECTION_BG    = colors.HexColor('#f1f0ef')
CARD_BG       = colors.HexColor('#ebe9e5')
TABLE_STRIPE  = colors.HexColor('#eeedeb')
HEADER_FILL   = colors.HexColor('#726a53')
COVER_BLOCK   = colors.HexColor('#857b5e')
BORDER        = colors.HexColor('#d5d2c9')
ICON          = colors.HexColor('#988753')
ACCENT        = colors.HexColor('#4e32a2')
ACCENT_2      = colors.HexColor('#56bd89')
TEXT_PRIMARY   = colors.HexColor('#1d1c1a')
TEXT_MUTED     = colors.HexColor('#86847c')
SEM_SUCCESS   = colors.HexColor('#438c5b')
SEM_WARNING   = colors.HexColor('#ab8d50')
SEM_ERROR     = colors.HexColor('#964e48')
SEM_INFO      = colors.HexColor('#486684')

TABLE_HEADER_COLOR = HEADER_FILL
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = TABLE_STRIPE

# ──────────────────────────────────────────────────────────────
# Page Configuration
# ──────────────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4
LEFT_MARGIN = 1.0 * inch
RIGHT_MARGIN = 1.0 * inch
TOP_MARGIN = 0.8 * inch
BOTTOM_MARGIN = 0.8 * inch
CONTENT_W = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN

# ──────────────────────────────────────────────────────────────
# Styles
# ──────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'CustomTitle', fontName='NotoSansSC', fontSize=24, leading=34,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, spaceBefore=0, spaceAfter=6
)
h1_style = ParagraphStyle(
    'CustomH1', fontName='NotoSansSC', fontSize=18, leading=26,
    alignment=TA_LEFT, textColor=ACCENT, spaceBefore=18, spaceAfter=10
)
h2_style = ParagraphStyle(
    'CustomH2', fontName='NotoSansSC', fontSize=14, leading=20,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, spaceBefore=14, spaceAfter=8
)
h3_style = ParagraphStyle(
    'CustomH3', fontName='NotoSansSC', fontSize=12, leading=17,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, spaceBefore=10, spaceAfter=6
)
body_style = ParagraphStyle(
    'CustomBody', fontName='NotoSansSC', fontSize=10.5, leading=18,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, spaceBefore=0, spaceAfter=6,
    wordWrap='CJK', firstLineIndent=21
)
body_no_indent = ParagraphStyle(
    'CustomBodyNoIndent', fontName='NotoSansSC', fontSize=10.5, leading=18,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, spaceBefore=0, spaceAfter=6,
    wordWrap='CJK'
)
caption_style = ParagraphStyle(
    'CustomCaption', fontName='NotoSansSC', fontSize=9, leading=14,
    alignment=TA_CENTER, textColor=TEXT_MUTED, spaceBefore=3, spaceAfter=6
)
muted_style = ParagraphStyle(
    'CustomMuted', fontName='NotoSansSC', fontSize=9.5, leading=15,
    alignment=TA_LEFT, textColor=TEXT_MUTED, spaceBefore=0, spaceAfter=4,
    wordWrap='CJK'
)
table_header_style = ParagraphStyle(
    'TableHeader', fontName='NotoSansSC', fontSize=9.5, leading=14,
    alignment=TA_CENTER, textColor=colors.white
)
table_cell_style = ParagraphStyle(
    'TableCell', fontName='NotoSansSC', fontSize=9, leading=13,
    alignment=TA_CENTER, textColor=TEXT_PRIMARY, wordWrap='CJK'
)
table_cell_left = ParagraphStyle(
    'TableCellLeft', fontName='NotoSansSC', fontSize=9, leading=13,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, wordWrap='CJK'
)
kpi_style = ParagraphStyle(
    'KPIStyle', fontName='NotoSansSC', fontSize=28, leading=36,
    alignment=TA_CENTER, textColor=ACCENT
)
kpi_label_style = ParagraphStyle(
    'KPILabelStyle', fontName='NotoSansSC', fontSize=9, leading=13,
    alignment=TA_CENTER, textColor=TEXT_MUTED
)

# ──────────────────────────────────────────────────────────────
# TOC DocTemplate
# ──────────────────────────────────────────────────────────────
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

MAX_KEEP_HEIGHT = PAGE_H * 0.4

def safe_keep_together(elements):
    total_h = 0
    for el in elements:
        w, h = el.wrap(CONTENT_W, PAGE_H)
        total_h += h
    if total_h <= MAX_KEEP_HEIGHT:
        return [KeepTogether(elements)]
    elif len(elements) >= 2:
        return [KeepTogether(elements[:2])] + list(elements[2:])
    else:
        return list(elements)

def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/>%s' % (key, text), style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

H1_ORPHAN_THRESHOLD = (PAGE_H - TOP_MARGIN - BOTTOM_MARGIN) * 0.15

def add_major_section(text, style):
    return [
        CondPageBreak(H1_ORPHAN_THRESHOLD),
        add_heading(text, style, level=0),
    ]

# ──────────────────────────────────────────────────────────────
# Helper: create a progress bar cell
# ──────────────────────────────────────────────────────────────
def pct_bar(pct, width=80, height=14):
    """Return a mini-table representing a progress bar."""
    if pct >= 70:
        bar_color = SEM_SUCCESS
    elif pct >= 45:
        bar_color = SEM_WARNING
    else:
        bar_color = SEM_ERROR
    
    filled_w = width * pct / 100
    # We'll just return a colored paragraph with percentage
    return Paragraph(
        '<font color="#%s">%s</font> %s%%' % (
            bar_color.hexval()[2:],
            '&#9632;' * max(1, int(pct / 10)),
            pct
        ),
        table_cell_style
    )

def pct_color(pct):
    """Return colored percentage text."""
    if pct >= 70:
        c = SEM_SUCCESS
    elif pct >= 45:
        c = SEM_WARNING
    else:
        c = SEM_ERROR
    hex_c = c.hexval()[2:]
    return Paragraph(
        '<font color="#%s"><b>%s%%</b></font>' % (hex_c, pct),
        table_cell_style
    )

# ──────────────────────────────────────────────────────────────
# Data: Module Completion Assessment
# ──────────────────────────────────────────────────────────────
MODULES = [
    ("Dashboard", "dashboard", 65, 578,
     "KPI cards, compliance gauge, 3 graphiques Recharts, flux activite, badges normes",
     "Selecteur dates, export, drill-down, temps reel"),
    ("Document Control", "documents", 35, 312,
     "Cartes resume, recherche, filtres type/statut, tableau, dialogue creation, 9 types docs",
     "Workflow approbation, signature electronique, historique versions, upload fichiers, contenu visualiseur, actions non implementees"),
    ("Hierarchie Documents", "document-hierarchy", 35, 257,
     "3 vues (Constellation/Arborescence/Alertes), arbre recursif, violations detectees",
     "CRUD documents, drag-and-drop, recherche, actions correction, lignes connexion visuelles, export PDF"),
    ("CAPA", "capa", 65, 564,
     "Cartes resume, recherche, 3 filtres, tableau, creation complete, detail avec flux statuts, verification prerequis, documents lies",
     "Edition, suppression, pagination, e-signature, saisie investigation/5P/cause racine/action corrective, export PDF"),
    ("Non-Conformites", "ncr", 60, 468,
     "Cartes resume, recherche, 3 filtres, tableau, creation avec champs OOS/OOT conditionnels, detail avec flux, disposition",
     "Edition, suppression, pagination, formulaires investigation Phase1/2, e-signature, creation CAPA liee, export PDF"),
    ("Audits", "audits", 50, 350,
     "Cartes resume, recherche, 2 filtres, tableau, creation, detail avec flux, affichage constatations",
     "Edition, suppression, pagination, ajout constatations, lien constatation-CAPA, checklist audit, rapport, e-signature"),
    ("Risques", "risks", 55, 435,
     "Cartes resume, matrice risques 5x5, registre, creation avec RPN temps reel, detail P/I/D",
     "Edition, suppression, pagination, drill-down matrice, FMEA, mesures controle, historique versions, export PDF"),
    ("Formation", "training", 40, 271,
     "Cartes resume, recherche, 2 filtres, tableau, creation, marquer terminee, surbrillance retard",
     "Detail complet, edition, suppression, liaison documents, evaluation competences, matrice formation, e-signature, certificat PDF"),
    ("Dossiers de Lot", "batch-records", 55, 416,
     "Cartes resume, recherche, tableau avec barres progression, creation, etapes detaillees, completion etapes, liberation QA, verrouillage",
     "Edition, suppression, ajout etapes post-creation, saisie valeurs reelles, e-signature, calcul rendement, impression, export PDF"),
    ("Fournisseurs", "suppliers", 50, 367,
     "Cartes resume, recherche, tableau avec scores, creation, jauge SVG, certifications, transitions statut",
     "Edition, suppression, pagination, historique audits, NCRs fournisseur, calcul score, contacts, e-signature, export PDF"),
    ("Formulaires N4", "forms", 45, 422,
     "Form Builder (8 types champs), Form Filler, liste modeles/instances, visualisation instance soumise",
     "Drag-and-drop, type signature, workflow approbation, e-signature soumission, validation champs requis, gestion versions, export PDF"),
    ("Change Control", "change-control", 15, 317,
     "Vue placeholder avec icones, stats basiques, liste cartes",
     "Implementation complete requise (creation, workflow, approbation, e-signature, liaison documents)"),
    ("Deviations", "deviations", 15, 317,
     "Vue placeholder avec icones, stats basiques, liste cartes",
     "Implementation complete requise (creation, investigation, classification, action corrective)"),
    ("OOS/OOT", "oos-oot", 15, 317,
     "Vue placeholder avec icones, stats basiques, liste cartes",
     "Implementation complete requise (investigation Phase1/2, ICH Q2(R1), validation analytique)"),
    ("Reports & Analytics", "reports", 40, 294,
     "4 KPI, selecteur type rapport, graphiques barres, resume documentaire, export CSV",
     "Selecteur dates, tendances, drill-down interactif, constructeur rapport, generation planifiee, export PDF/Excel"),
    ("Compliance", "compliance", 45, 282,
     "Jauge score compliance SVG, 4 cartes, graphique activite 7 jours, journal audit avec filtres, export CSV",
     "Filtre dates, recherche, pagination, configuration score, checklist reglementaire, analyse gaps, export PDF"),
    ("User Management", "user-management", 45, 357,
     "Cartes resume, recherche, filtre role, tableau utilisateurs, ajout/edition, invitation, apercu permissions",
     "Persistance reelle (actions non sauvegardees), suppression, journal activite, reset mot de passe, 2FA"),
    ("SetupWizard", "setup", 75, 966,
     "6 etapes completes (Organisation/Secteur/Normes/Modules/Equipe/Recap), auto-configuration industrie, barre progression",
     "Validation champs, persistance backend, upload logo, autorite reglementaire, fuseau horaire, config notifications"),
]

# Infrastructure assessment
INFRASTRUCTURE = [
    ("Types TypeScript (qms.ts)", 90, "Types complets pour tous les 15 modules, 6 roles, permissions, enums"),
    ("AuthContext (Demo)", 60, "Login/logout/switch user, hasPermission, hasRole - mode demo uniquement"),
    ("OrganizationContext", 65, "Settings, industrie, normes applicables - lecture depuis store mock"),
    ("Demo Store (Zustand)", 70, "15 collections, CRUD, audit trail logging, signature hash, prerequis"),
    ("Mock Data", 85, "6 profils, 10 documents, 5 CAPAs, 4 NCRs, 3 batch, 4 suppliers, 2 templates, etc."),
    ("Custom Errors", 20, "10 codes ComplianceError definis mais jamais utilises dans le code"),
    ("Sidebar Navigation", 85, "4 groupes, badges, filtrage par modules actifs, collapsible, responsive"),
    ("Service Layer", 0, "Aucun service independant - toute la logique dans les composants React"),
    ("Custom Hooks", 0, "Aucun hook metier (useCapas, useApprovedDocuments, etc.)"),
    ("PDF Export", 0, "Aucune bibliotheque PDF, aucune fonctionnalite d'export"),
    ("SQL Schema (Supabase)", 0, "Aucun schema.sql, aucune migration, aucun fichier supabase/"),
    ("API Routes", 5, "1 route stub vide (4 lignes) - aucune logique"),
    ("Tests (Vitest)", 0, "Aucun test ecrit, aucun fichier de test"),
    ("React Hook Form + Zod", 10, "Installe mais quasi pas utilise - formulaires en useState manuel"),
    ("TanStack Query", 0, "Installe mais jamais utilise - acces direct au store Zustand"),
    ("Prisma ORM", 0, "db.ts importe @prisma/client mais aucun schema.prisma n'existe"),
    ("Supabase Integration", 0, "Aucune connexion Supabase, aucune RLS, aucun trigger"),
]

# Architecture principles from spec
ARCH_PRINCIPLES = [
    ("Multi-tenant (organization_id + RLS)", 15, "organization_id present dans les types mais aucune RLS Supabase implementee"),
    ("Mode Demo (bascule si Supabase indisponible)", 80, "Store Zustand complet avec donnees mock, application fonctionne en mode demo"),
    ("Audit Trail Immutable", 50, "Logging dans demo-store mais pas immutable (pas de table dediee, pas de soft-delete)"),
    ("Signature Electronique 21 CFR Part 11", 20, "Generation hash dans store mais aucune interface utilisateur ne l'exige"),
    ("Hierarchie Documentaire (prerequis)", 30, "Verification prerequis dans demo-store et CAPA mais pas enforcee globalement"),
    ("RBAC 6 Roles + Permissions", 75, "Matrice complete des permissions, hasPermission() disponible, mais peu utilise dans l'UI"),
]

# ──────────────────────────────────────────────────────────────
# Build PDF
# ──────────────────────────────────────────────────────────────
OUTPUT = "/home/z/my-project/download/qms_taux_realisation.pdf"
BODY_PDF = "/home/z/my-project/download/qms_body.pdf"

doc = TocDocTemplate(
    BODY_PDF, pagesize=A4,
    leftMargin=LEFT_MARGIN, rightMargin=RIGHT_MARGIN,
    topMargin=TOP_MARGIN, bottomMargin=BOTTOM_MARGIN
)

story = []

# ──────────────────────────────────────────────────────────────
# Table of Contents
# ──────────────────────────────────────────────────────────────
toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle(name='TOC1', fontName='NotoSansSC', fontSize=12, leading=20,
                   leftIndent=20, spaceBefore=6, spaceAfter=3, textColor=TEXT_PRIMARY),
    ParagraphStyle(name='TOC2', fontName='NotoSansSC', fontSize=10, leading=16,
                   leftIndent=40, spaceBefore=3, spaceAfter=2, textColor=TEXT_MUTED),
]
story.append(Paragraph('<b>Table des matieres</b>', title_style))
story.append(Spacer(1, 12))
story.append(toc)
story.append(PageBreak())

# ──────────────────────────────────────────────────────────────
# Section 1: Synthese Globale
# ──────────────────────────────────────────────────────────────
story.extend(add_major_section("1. Synthese Globale", h1_style))

story.append(Paragraph(
    "Ce rapport presente l'analyse detaillee du taux de realisation de l'application QMS SaaS Pro "
    "par rapport au metaprompt de specification initial (metaprompt_qms_from_scratch.docx). "
    "L'evaluation couvre les 15 modules QMS specifies, l'infrastructure technique, les principes "
    "architecturaux et les fonctionnalites transversales exigees par la norme ISO 13485:2016 et "
    "la reglementation 21 CFR Part 11. Chaque composant est evalue selon sa conformite aux "
    "exigences du prompt original, sa profondeur fonctionnelle, et son etat d'integration dans "
    "l'application globale.",
    body_style
))
story.append(Spacer(1, 8))

# KPI Summary Table
overall_pct = 48
module_pct = 46
infra_pct = 28
arch_pct = 45

kpi_data = [
    [Paragraph('<b>Indicateur</b>', table_header_style),
     Paragraph('<b>Taux</b>', table_header_style),
     Paragraph('<b>Statut</b>', table_header_style)],
    [Paragraph('Taux de Realisation Global', table_cell_left),
     pct_color(overall_pct),
     Paragraph('Partiel' if overall_pct < 70 else 'Conforme', table_cell_style)],
    [Paragraph('Modules Metier (15 modules)', table_cell_left),
     pct_color(module_pct),
     Paragraph('Partiel', table_cell_style)],
    [Paragraph('Infrastructure Technique', table_cell_left),
     pct_color(infra_pct),
     Paragraph('Insuffisant', table_cell_style)],
    [Paragraph('Principes Architecturaux', table_cell_left),
     pct_color(arch_pct),
     Paragraph('Partiel', table_cell_style)],
]

kpi_table = Table(kpi_data, colWidths=[CONTENT_W*0.50, CONTENT_W*0.20, CONTENT_W*0.25], hAlign='CENTER')
kpi_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_ROW_ODD),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))

story.extend(safe_keep_together([kpi_table, 
    Paragraph('Tableau 1 : Synthese des taux de realisation par categorie', caption_style)]))
story.append(Spacer(1, 18))

story.append(Paragraph(
    "L'application presente actuellement un taux de realisation global de <b>48%</b>. Si les interfaces "
    "utilisateur sont generalement presentes avec des vues fonctionnelles pour la plupart des modules, "
    "les couches critiques d'infrastructure sont largement manquantes : aucun schema de base de donnees "
    "Supabase, aucun service metier independant, aucun test automatise, et aucune integration PDF. "
    "Le mode demo fonctionne correctement grace au store Zustand et aux donnees mock, mais l'application "
    "ne peut pas encore etre deployee en production sans ces composants fondamentaux.",
    body_style
))

# ──────────────────────────────────────────────────────────────
# Section 2: Analyse Detaillee par Module
# ──────────────────────────────────────────────────────────────
story.extend(add_major_section("2. Analyse Detaillee par Module", h1_style))

story.append(Paragraph(
    "Le prompt specifiait 15 modules QMS couvrant l'ensemble des exigences ISO 13485:2016, "
    "depuis le controle documentaire jusqu'a la gestion des fournisseurs. Chaque module a ete evalue "
    "sur la base de quatre criteres principaux : la presence des vues et composants UI, la profondeur "
    "des fonctionnalites CRUD (creation, lecture, edition, suppression), le respect des regles metier "
    "specifiees (prerequis, verrouillage, signature electronique), et la capacite de demonstration "
    "avec des donnees mock realistes. Le tableau ci-dessous synthetise les resultats pour chacun "
    "des 15 modules plus les composants transversaux.",
    body_style
))
story.append(Spacer(1, 12))

# Module table - split into two parts for readability
mod_header = [
    Paragraph('<b>Module</b>', table_header_style),
    Paragraph('<b>Taux</b>', table_header_style),
    Paragraph('<b>Lignes</b>', table_header_style),
    Paragraph('<b>Fonctionnalites Implementees</b>', table_header_style),
    Paragraph('<b>Fonctionnalites Manquantes Critiques</b>', table_header_style),
]

mod_data = [mod_header]
for name, key, pct, loc, implemented, missing in MODULES[:9]:
    mod_data.append([
        Paragraph('<b>%s</b>' % name, table_cell_left),
        pct_color(pct),
        Paragraph(str(loc), table_cell_style),
        Paragraph(implemented, ParagraphStyle('SmallCell', fontName='NotoSansSC', fontSize=7.5, leading=10.5, alignment=TA_LEFT, wordWrap='CJK', textColor=TEXT_PRIMARY)),
        Paragraph(missing, ParagraphStyle('SmallCellR', fontName='NotoSansSC', fontSize=7.5, leading=10.5, alignment=TA_LEFT, wordWrap='CJK', textColor=SEM_ERROR)),
    ])

mod_table1 = Table(mod_data, colWidths=[CONTENT_W*0.12, CONTENT_W*0.08, CONTENT_W*0.07, CONTENT_W*0.36, CONTENT_W*0.37], hAlign='CENTER')
mod_table1.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ROW_ODD if i % 2 == 0 else colors.white) for i in range(1, len(mod_data))],
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]))

story.append(mod_table1)
story.append(Paragraph('Tableau 2 : Analyse des modules (1/2)', caption_style))
story.append(Spacer(1, 18))

# Second part
mod_data2 = [mod_header]
for name, key, pct, loc, implemented, missing in MODULES[9:]:
    mod_data2.append([
        Paragraph('<b>%s</b>' % name, table_cell_left),
        pct_color(pct),
        Paragraph(str(loc), table_cell_style),
        Paragraph(implemented, ParagraphStyle('SmallCell2', fontName='NotoSansSC', fontSize=7.5, leading=10.5, alignment=TA_LEFT, wordWrap='CJK', textColor=TEXT_PRIMARY)),
        Paragraph(missing, ParagraphStyle('SmallCellR2', fontName='NotoSansSC', fontSize=7.5, leading=10.5, alignment=TA_LEFT, wordWrap='CJK', textColor=SEM_ERROR)),
    ])

mod_table2 = Table(mod_data2, colWidths=[CONTENT_W*0.12, CONTENT_W*0.08, CONTENT_W*0.07, CONTENT_W*0.36, CONTENT_W*0.37], hAlign='CENTER')
mod_table2.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ROW_ODD if i % 2 == 0 else colors.white) for i in range(1, len(mod_data2))],
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]))

story.append(mod_table2)
story.append(Paragraph('Tableau 3 : Analyse des modules (2/2)', caption_style))
story.append(Spacer(1, 18))

# Key observations
story.append(add_heading("2.1 Observations cles par module", h2_style))

story.append(Paragraph(
    "<b>SetupWizard (75%)</b> est le composant le plus complet avec ses 6 etapes couvrant "
    "l'integralite du flux de configuration initial. L'auto-configuration secteur vers normes "
    "vers modules actifs fonctionne correctement, et le recapitulatif final permet la validation "
    "avant lancement. Il manque principalement la persistance backend et la validation avancee des champs.",
    body_style
))
story.append(Paragraph(
    "<b>Dashboard (65%)</b> offre une interface riche avec 3 graphiques Recharts (ligne, camembert, "
    "barres), une jauge de compliance SVG, des cartes KPI avec indicateurs de tendance, et un flux "
    "d'activite recent. Cependant, il manque les selecteurs de plage de dates et le drill-down vers "
    "les modules detailles, qui sont essentiels pour un suivi operationnel efficace.",
    body_style
))
story.append(Paragraph(
    "<b>CAPA (65%)</b> et <b>NCR (60%)</b> sont les modules metier les plus avances. Ils disposent "
    "de dialogues de creation detailles avec des champs conditionnels (OOS/OOT pour les NCR), "
    "de verifications de prerequis documentaires avant creation, et de flux de statuts visuels. "
    "Cependant, les fonctionnalites d'edition et de suppression sont completement absentes, et "
    "la signature electronique n'est pas enforcee dans l'interface utilisateur malgre la presence "
    "de la fonction de hachage dans le store.",
    body_style
))
story.append(Paragraph(
    "<b>Change Control (15%)</b>, <b>Deviations (15%)</b> et <b>OOS/OOT (15%)</b> sont les modules "
    "les moins avances, reduits a des vues Placeholder generiques. Ces trois modules sont critiques "
    "pour la conformite reglementaire et representent un deficit important par rapport au prompt qui "
    "specifiait des fonctionnalites detaillees notamment pour l'investigation OOS/OOT conforme a "
    "ICH Q2(R1).",
    body_style
))

# ──────────────────────────────────────────────────────────────
# Section 3: Infrastructure Technique
# ──────────────────────────────────────────────────────────────
story.extend(add_major_section("3. Infrastructure Technique", h1_style))

story.append(Paragraph(
    "L'infrastructure technique constitue le socle sur lequel reposent tous les modules metier. "
    "Le prompt specifiait une architecture multicouche avec services independants, hooks personnalises, "
    "schema Supabase complet avec RLS, et routes API. L'evaluation revele que si les couches presentation "
    "et etat client sont fonctionnelles, les couches serveur et persistance sont quasi inexistantes, "
    "ce qui constitue le deficit le plus critique de l'application actuelle.",
    body_style
))
story.append(Spacer(1, 12))

# Infrastructure table
infra_header = [
    Paragraph('<b>Composant</b>', table_header_style),
    Paragraph('<b>Taux</b>', table_header_style),
    Paragraph('<b>Observations</b>', table_header_style),
]

infra_data = [infra_header]
for name, pct, obs in INFRASTRUCTURE:
    infra_data.append([
        Paragraph('<b>%s</b>' % name, table_cell_left),
        pct_color(pct),
        Paragraph(obs, ParagraphStyle('InfraCell', fontName='NotoSansSC', fontSize=8, leading=11.5, alignment=TA_LEFT, wordWrap='CJK', textColor=TEXT_PRIMARY)),
    ])

infra_table = Table(infra_data, colWidths=[CONTENT_W*0.28, CONTENT_W*0.10, CONTENT_W*0.62], hAlign='CENTER')
infra_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ROW_ODD if i % 2 == 0 else colors.white) for i in range(1, len(infra_data))],
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]))

story.append(infra_table)
story.append(Paragraph('Tableau 4 : Evaluation de l\'infrastructure technique', caption_style))
story.append(Spacer(1, 18))

story.append(Paragraph(
    "Le constat le plus preoccupant est l'absence totale de couche de persistance. Le prompt specifiait "
    "un schema SQL complet avec 15+ tables, des politiques RLS sur chaque table, un trigger "
    "handle_new_user creant automatiquement une organisation, et des donnees seed pour les prerequis "
    "documentaires. Aucun de ces elements n'existe dans l'implementation actuelle. L'application "
    "fonctionne entierement en memoire cliente via Zustand, ce qui signifie que toutes les donnees "
    "sont perdues au rechargement de la page.",
    body_style
))
story.append(Paragraph(
    "La couche service est egalement absente : toute la logique metier est directement embarquee dans "
    "les composants React, rendant le code difficilement testable et non reutilisable. Le prompt "
    "specifiait des services independants comme prerequisiteService.ts, auditService.ts, "
    "documentService.ts, batchService.ts, formService.ts et supplierService.ts avec des regles "
    "metier precises (verification prerequis avant creation CAPA/NCR, verrouillage batch, calcul "
    "score fournisseur). Seul le demo-store implemente certaines de ces regles de maniere simplifiee.",
    body_style
))

# ──────────────────────────────────────────────────────────────
# Section 4: Principes Architecturaux
# ──────────────────────────────────────────────────────────────
story.extend(add_major_section("4. Principes Architecturaux", h1_style))

story.append(Paragraph(
    "Le metaprompt definissait six principes architecturaux non negociables pour l'application QMS. "
    "Chacun de ces principes repond a une exigence reglementaire specifique et son non-respect "
    "compromet la conformite ISO 13485:2016 et 21 CFR Part 11. L'evaluation ci-dessous mesure "
    "le niveau d'implementation de chaque principe dans le code actuel.",
    body_style
))
story.append(Spacer(1, 12))

arch_header = [
    Paragraph('<b>Principe Architectural</b>', table_header_style),
    Paragraph('<b>Taux</b>', table_header_style),
    Paragraph('<b>Details</b>', table_header_style),
]

arch_data = [arch_header]
for name, pct, details in ARCH_PRINCIPLES:
    arch_data.append([
        Paragraph('<b>%s</b>' % name, table_cell_left),
        pct_color(pct),
        Paragraph(details, ParagraphStyle('ArchCell', fontName='NotoSansSC', fontSize=8, leading=11.5, alignment=TA_LEFT, wordWrap='CJK', textColor=TEXT_PRIMARY)),
    ])

arch_table = Table(arch_data, colWidths=[CONTENT_W*0.30, CONTENT_W*0.10, CONTENT_W*0.60], hAlign='CENTER')
arch_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ROW_ODD if i % 2 == 0 else colors.white) for i in range(1, len(arch_data))],
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]))

story.append(arch_table)
story.append(Paragraph('Tableau 5 : Conformite aux principes architecturaux', caption_style))
story.append(Spacer(1, 18))

story.append(Paragraph(
    "Le mode demo est le principe le mieux respecte (80%), ce qui est coherent avec l'approche "
    "incrementale choisie. Cependant, les principes les plus critiques du point de vue reglementaire "
    "sont les moins bien implementes : la signature electronique 21 CFR Part 11 (20%) et le "
    "multi-tenant avec RLS (15%). Sans signature electronique enforcee, aucune approbation "
    "documentaire, liberation de lot ou cloture CAPA n'a de valeur reglementaire. Sans RLS, "
    "les donnees de不同 organisations ne sont pas isolees, ce qui est un risque de securite majeur "
    "dans un contexte SaaS.",
    body_style
))

# ──────────────────────────────────────────────────────────────
# Section 5: Stack Technique vs Specification
# ──────────────────────────────────────────────────────────────
story.extend(add_major_section("5. Stack Technique vs Specification", h1_style))

story.append(Paragraph(
    "Le prompt specifiait une stack technique precise pour l'application. L'implementation actuelle "
    "s'ecarte de cette specification sur plusieurs points importants, notamment le framework de "
    "routing (Next.js App Router au lieu de Vite + React Router v6) et l'utilisation effective "
    "des bibliotheques installees. Le tableau suivant compare chaque element de la stack specifiee "
    "avec son etat d'utilisation reel dans le code.",
    body_style
))
story.append(Spacer(1, 12))

stack_data = [
    [Paragraph('<b>Technologie Specifiee</b>', table_header_style),
     Paragraph('<b>Implementation Reelle</b>', table_header_style),
     Paragraph('<b>Ecart</b>', table_header_style)],
    [Paragraph('React 18 + Vite', table_cell_left),
     Paragraph('React 19 + Next.js 16', table_cell_left),
     Paragraph('Changement de framework', table_cell_style)],
    [Paragraph('TailwindCSS + shadcn/ui', table_cell_left),
     Paragraph('TailwindCSS 4 + 48 composants shadcn/ui', table_cell_left),
     Paragraph('Conforme', table_cell_style)],
    [Paragraph('TanStack Query v5 + Zustand', table_cell_left),
     Paragraph('Zustand seul (TanStack non utilise)', table_cell_left),
     Paragraph('Partiel', table_cell_style)],
    [Paragraph('Supabase (PostgreSQL + Auth + Storage)', table_cell_left),
     Paragraph('Aucune connexion Supabase', table_cell_left),
     Paragraph('Manquant', table_cell_style)],
    [Paragraph('React Router v6', table_cell_left),
     Paragraph('Next.js App Router', table_cell_left),
     Paragraph('Changement de routing', table_cell_style)],
    [Paragraph('React Hook Form + Zod', table_cell_left),
     Paragraph('Installe mais non utilise (useState manuel)', table_cell_left),
     Paragraph('Non utilise', table_cell_style)],
    [Paragraph('jsPDF / react-pdf', table_cell_left),
     Paragraph('Aucune bibliotheque PDF', table_cell_left),
     Paragraph('Manquant', table_cell_style)],
    [Paragraph('Lucide React', table_cell_left),
     Paragraph('Utilise dans toute l\'application', table_cell_left),
     Paragraph('Conforme', table_cell_style)],
    [Paragraph('Sonner (notifications)', table_cell_left),
     Paragraph('Installe mais non utilise', table_cell_left),
     Paragraph('Non utilise', table_cell_style)],
    [Paragraph('Vitest + Testing Library', table_cell_left),
     Paragraph('Aucun test', table_cell_left),
     Paragraph('Manquant', table_cell_style)],
]

stack_table = Table(stack_data, colWidths=[CONTENT_W*0.35, CONTENT_W*0.42, CONTENT_W*0.23], hAlign='CENTER')
stack_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ROW_ODD if i % 2 == 0 else colors.white) for i in range(1, len(stack_data))],
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]))

story.append(stack_table)
story.append(Paragraph('Tableau 6 : Comparaison stack technique specifiee vs implementee', caption_style))
story.append(Spacer(1, 18))

# ──────────────────────────────────────────────────────────────
# Section 6: Checklist de Conformite
# ──────────────────────────────────────────────────────────────
story.extend(add_major_section("5. Checklist de Conformite Finale", h1_style))

story.append(Paragraph(
    "Le metaprompt fournissait une checklist de conformite finale permettant de valider que "
    "l'application repond aux exigences minimales. Chaque element de cette checklist a ete evalue "
    "par rapport a l'implementation actuelle pour determiner si les criteres d'acceptation sont "
    "satisfaits. Les resultats montrent que seule une minorite des criteres critiques sont remplis, "
    "principalement grace au mode demo.",
    body_style
))
story.append(Spacer(1, 12))

checklist_items = [
    ("npx tsc --noEmit sans erreurs", True, "La compilation TypeScript passe sans erreur"),
    ("npm run build reussi", True, "Le build de production fonctionne correctement"),
    ("Create account - SetupWizard affiche et complete", True, "Le wizard 6 etapes fonctionne en mode demo"),
    ("Create CAPA sans Approved SOP - ComplianceError", False, "Verification prerequis dans le store mais pas de toast/feedback utilisateur visible"),
    ("Approve document - signature_hash genere", False, "La fonction generateSignatureHash existe dans le store mais n'est jamais appelee depuis l'UI"),
    ("Submit N4 form - is_locked=TRUE, form disabled", False, "Le verrouillage n'est pas implemente, les instances restent editables apres soumission"),
    ("Release batch - is_locked=TRUE, modification bloquee", True, "Le verrouillage batch fonctionne dans BatchRecordView"),
    ("Connect as Operator - voit seulement Approved docs, sidebar limitee", False, "Les permissions sont definies mais l'UI ne filtre pas les documents par statut selon le role"),
    ("Demo mode - deconnecter Supabase - app fonctionne avec mock", True, "L'application fonctionne entierement avec le store Zustand en mode demo"),
    ("Audit trail - chaque CREATE/UPDATE/DELETE logge", False, "Le logging existe dans demo-store mais n'est pas immuable (pas de table dediee, pas de soft-delete)"),
]

cl_header = [
    Paragraph('<b>Critere de Conformite</b>', table_header_style),
    Paragraph('<b>Statut</b>', table_header_style),
    Paragraph('<b>Observation</b>', table_header_style),
]

cl_data = [cl_header]
for criterion, status, obs in checklist_items:
    status_text = '<font color="#%s"><b>REUSSI</b></font>' % SEM_SUCCESS.hexval()[2:] if status else '<font color="#%s"><b>ECHEC</b></font>' % SEM_ERROR.hexval()[2:]
    cl_data.append([
        Paragraph(criterion, table_cell_left),
        Paragraph(status_text, table_cell_style),
        Paragraph(obs, ParagraphStyle('ClCell', fontName='NotoSansSC', fontSize=8, leading=11, alignment=TA_LEFT, wordWrap='CJK', textColor=TEXT_PRIMARY)),
    ])

cl_table = Table(cl_data, colWidths=[CONTENT_W*0.35, CONTENT_W*0.12, CONTENT_W*0.53], hAlign='CENTER')
cl_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ROW_ODD if i % 2 == 0 else colors.white) for i in range(1, len(cl_data))],
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]))

story.append(cl_table)
story.append(Paragraph('Tableau 7 : Checklist de conformite finale', caption_style))
story.append(Spacer(1, 18))

story.append(Paragraph(
    "Sur les 10 criteres de la checklist de conformite, seuls 4 sont entierement satisfaits (40%). "
    "Les criteres les plus critiques du point de vue reglementaire - signature electronique, "
    "verrouillage des formulaires, filtrage par role et audit trail immuable - sont tous en echec. "
    "L'application ne peut donc pas etre consideree comme conforme aux exigences ISO 13485:2016 "
    "et 21 CFR Part 11 dans son etat actuel, malgre un fonctionnement correct en mode demonstration.",
    body_style
))

# ──────────────────────────────────────────────────────────────
# Section 7: Couverture ISO 13485 par Section
# ──────────────────────────────────────────────────────────────
story.extend(add_major_section("6. Couverture ISO 13485 par Section", h1_style))

story.append(Paragraph(
    "Le metaprompt fixait un objectif de 82% de couverture ISO 13485:2016 avec des objectifs "
    "specifiques par section de la norme. L'evaluation ci-dessous compare les objectifs du prompt "
    "avec la couverture reelle estimee de l'implementation actuelle, section par section.",
    body_style
))
story.append(Spacer(1, 12))

iso_data = [
    [Paragraph('<b>Section ISO 13485</b>', table_header_style),
     Paragraph('<b>Objectif</b>', table_header_style),
     Paragraph('<b>Reel</b>', table_header_style),
     Paragraph('<b>Ecart</b>', table_header_style)],
    [Paragraph('4.2.4 Controle des Documents', table_cell_left),
     Paragraph('95%', table_cell_style),
     Paragraph('<font color="#%s"><b>40%%</b></font>' % SEM_ERROR.hexval()[2:], table_cell_style),
     Paragraph('-55%', table_cell_style)],
    [Paragraph('4.2.5 Controle des Enregistrements', table_cell_left),
     Paragraph('75%', table_cell_style),
     Paragraph('<font color="#%s"><b>35%%</b></font>' % SEM_ERROR.hexval()[2:], table_cell_style),
     Paragraph('-40%', table_cell_style)],
    [Paragraph('6.2 Ressources Humaines (Formation)', table_cell_left),
     Paragraph('85%', table_cell_style),
     Paragraph('<font color="#%s"><b>40%%</b></font>' % SEM_ERROR.hexval()[2:], table_cell_style),
     Paragraph('-45%', table_cell_style)],
    [Paragraph('7.4 Achats / Fournisseurs', table_cell_left),
     Paragraph('70%', table_cell_style),
     Paragraph('<font color="#%s"><b>35%%</b></font>' % SEM_ERROR.hexval()[2:], table_cell_style),
     Paragraph('-35%', table_cell_style)],
    [Paragraph('7.5 Production (Dossiers de Lot)', table_cell_left),
     Paragraph('60%', table_cell_style),
     Paragraph('<font color="#%s"><b>45%%</b></font>' % SEM_WARNING.hexval()[2:], table_cell_style),
     Paragraph('-15%', table_cell_style)],
    [Paragraph('8.2.2 Audits Internes', table_cell_left),
     Paragraph('90%', table_cell_style),
     Paragraph('<font color="#%s"><b>45%%</b></font>' % SEM_ERROR.hexval()[2:], table_cell_style),
     Paragraph('-45%', table_cell_style)],
    [Paragraph('8.3 Non-Conformites', table_cell_left),
     Paragraph('90%', table_cell_style),
     Paragraph('<font color="#%s"><b>55%%</b></font>' % SEM_WARNING.hexval()[2:], table_cell_style),
     Paragraph('-35%', table_cell_style)],
    [Paragraph('8.5.2/3 CAPA', table_cell_left),
     Paragraph('90%', table_cell_style),
     Paragraph('<font color="#%s"><b>55%%</b></font>' % SEM_WARNING.hexval()[2:], table_cell_style),
     Paragraph('-35%', table_cell_style)],
]

iso_table = Table(iso_data, colWidths=[CONTENT_W*0.38, CONTENT_W*0.15, CONTENT_W*0.15, CONTENT_W*0.15], hAlign='CENTER')
iso_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ROW_ODD if i % 2 == 0 else colors.white) for i in range(1, len(iso_data))],
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]))

story.append(iso_table)
story.append(Paragraph('Tableau 8 : Couverture ISO 13485 - Objectif vs Realite', caption_style))
story.append(Spacer(1, 18))

story.append(Paragraph(
    "La couverture ISO 13485 globale est estimee a environ <b>44%</b>, bien en dessous de l'objectif "
    "de 82% fixe par le metaprompt. La section la mieux couverte est la Production (7.5) grace "
    "au module Dossiers de Lot qui implemente correctement le verrouillage, tandis que le Controle "
    "des Documents (4.2.4) presente l'ecart le plus important (-55 points) malgre l'objectif le plus "
    "ambitieux (95%). L'absence de workflow d'approbation, de signature electronique et d'historique "
    "des versions explique principalement ce deficit.",
    body_style
))

# ──────────────────────────────────────────────────────────────
# Section 8: Priorites de Correction
# ──────────────────────────────────────────────────────────────
story.extend(add_major_section("7. Priorites de Correction", h1_style))

story.append(add_heading("7.1 Priorites critiques (bloquants pour la conformite reglementaire)", h2_style))

story.append(Paragraph(
    "Ces elements doivent etre implementes en priorite car leur absence compromet la conformite "
    "reglementaire de l'application et empeche toute utilisation en environnement GxP. Ils "
    "representent les prerequis minimum pour une validation conforme.",
    body_style
))

crit_items = [
    "Schema SQL Supabase complet avec RLS et triggers (schema.sql + seed.sql) - sans base de donnees, "
    "il n'y a pas de persistance et donc aucune valeur production.",
    "Signature electronique 21 CFR Part 11 dans l'UI - chaque approbation, liberation de lot et cloture "
    "CAPA doit exiger une confirmation avec mot de passe et generer un hash immuable.",
    "Workflow d'approbation documentaire - le DocumentControlView doit implementer les actions Approve, "
    "Edit, Delete avec les regles de blocage (document Approved non modifiable).",
    "Audit trail immuable - migration vers une table dediee avec soft-delete obligatoire et impossibilite "
    "de suppression physique des enregistrements.",
]

for i, item in enumerate(crit_items, 1):
    story.append(Paragraph(
        '<b>%d.</b> %s' % (i, item),
        body_no_indent
    ))
    story.append(Spacer(1, 4))

story.append(add_heading("7.2 Priorites elevees (necessaires pour la qualite production)", h2_style))

story.append(Paragraph(
    "Ces elements sont essentiels pour atteindre un niveau de qualite acceptable en production, "
    "meme s'ils ne sont pas bloquants pour la demonstration initiale.",
    body_style
))

high_items = [
    "Extraction de la couche service - separer la logique metier des composants React vers des "
    "services independants testables (prerequisiteService, documentService, batchService, etc.).",
    "Hooks personnalises - creer useCapas, useNCRs, useApprovedDocuments, useOrgSettings pour "
    "reduire la complexite des composants et ameliorer la reutilisabilite.",
    "Fonctionnalites CRUD completes - ajouter les dialogues d'edition et de suppression dans "
    "chaque module, avec verification des permissions avant chaque action.",
    "Implementation des 3 modules placeholder - Change Control, Deviations et OOS/OOT doivent "
    "etre developpes avec des fonctionnalites completes conformes aux specifications.",
    "Pagination et performance - implementer la pagination cote serveur pour toutes les listes "
    "de donnees afin de supporter des volumes importants.",
]

for i, item in enumerate(high_items, 1):
    story.append(Paragraph(
        '<b>%d.</b> %s' % (i, item),
        body_no_indent
    ))
    story.append(Spacer(1, 4))

story.append(add_heading("7.3 Priorites moyennes (amelioration continue)", h2_style))

story.append(Paragraph(
    "Ces elements contribuent a l'experience utilisateur et a la robustesse de l'application "
    "mais ne sont pas bloquants pour la mise en production initiale.",
    body_style
))

med_items = [
    "Export PDF pour tous les modules - rapports CAPA, certificats d'audit, fiches fournisseurs, "
    "enregistrements de lot, certificats de formation.",
    "Utilisation de React Hook Form + Zod pour la validation des formulaires au lieu du "
    "useState manuel actuellement utilise partout.",
    "Integration de TanStack Query pour la gestion du cache serveur et les requetes optimistes.",
    "Tests automatisees avec Vitest - couvrir au minimum les services critiques et les regles metier "
    "(prerequis, verrouillage, transitions de statut).",
    "Notifications Sonner - remplacer les alert() par des toasts non-bloquants pour un retour "
    "utilisateur plus professionnel.",
]

for i, item in enumerate(med_items, 1):
    story.append(Paragraph(
        '<b>%d.</b> %s' % (i, item),
        body_no_indent
    ))
    story.append(Spacer(1, 4))

# ──────────────────────────────────────────────────────────────
# Section 9: Conclusion
# ──────────────────────────────────────────────────────────────
story.extend(add_major_section("8. Conclusion", h1_style))

story.append(Paragraph(
    "L'application QMS SaaS Pro dans son etat actuel presente un taux de realisation global de "
    "<b>48%</b> par rapport au metaprompt de specification. Les interfaces utilisateur sont "
    "generalement presentes et fonctionnelles pour 12 des 15 modules specifies, avec un total "
    "d'environ 14 900 lignes de code source. Le mode demo fonctionne correctement grace au store "
    "Zustand et aux donnees mock realistes, permettant une demonstration visuelle convaincante "
    "de l'application.",
    body_style
))
story.append(Paragraph(
    "Cependant, les couches critiques d'infrastructure sont largement deficitaires : aucun schema "
    "de base de donnees, aucun service metier independant, aucun test automatise, aucune "
    "integration PDF, et surtout aucune application reelle des exigences reglementaires les plus "
    "importantes (signature electronique, audit trail immuable, controle d'acces RLS). La couverture "
    "ISO 13485 estimee atteint environ 44%, loin de l'objectif de 82%.",
    body_style
))
story.append(Paragraph(
    "Pour atteindre un niveau de conformite acceptable, les priorites doivent etre clairement "
    "etablies : d'abord le schema Supabase et la signature electronique (bloquants reglementaires), "
    "puis la couche service et les modules manquants (necessaires pour la production), et enfin "
    "les ameliorations d'experience utilisateur (export PDF, tests, notifications). En suivant "
    "cette feuille de route, l'application pourra progressivement atteindre le niveau de conformite "
    "exigible pour un deploiement en environnement pharmaceutique ou dispositifs medicaux.",
    body_style
))

# ──────────────────────────────────────────────────────────────
# Build body PDF
# ──────────────────────────────────────────────────────────────
doc.multiBuild(story)
print(f"Body PDF generated: {BODY_PDF}")

# ──────────────────────────────────────────────────────────────
# Generate Cover HTML
# ──────────────────────────────────────────────────────────────
COVER_HTML = "/home/z/my-project/download/cover.html"
COVER_PDF = "/home/z/my-project/download/cover.pdf"

cover_html = """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=794, height=1123">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
<style>
@page { size: 794px 1123px; margin: 0; }
html, body { margin: 0; padding: 0; width: 794px; height: 1123px; overflow: hidden; font-family: 'Noto Sans SC', sans-serif; background: #f4f4f3; }
.cover { position: relative; width: 794px; height: 1123px; background: #f4f4f3; }
.geometric-line { position: absolute; background: #726a53; }
.line-v1 { left: 60px; top: 0; width: 2px; height: 420px; opacity: 0.3; }
.line-h1 { left: 0; top: 400px; width: 280px; height: 2px; opacity: 0.3; }
.line-v2 { right: 60px; bottom: 0; width: 1px; height: 350px; opacity: 0.2; }
.line-h2 { right: 0; bottom: 330px; width: 300px; height: 1px; opacity: 0.2; }
.accent-dot { position: absolute; width: 8px; height: 8px; border-radius: 50%; background: #4e32a2; }
.dot1 { left: 56px; top: 416px; }
.dot2 { right: 56px; bottom: 324px; }
.content { position: absolute; top: 180px; left: 60px; right: 60px; }
.kicker { font-size: 14px; letter-spacing: 4px; color: #86847c; text-transform: uppercase; margin-bottom: 24px; font-weight: 300; }
.title { font-family: 'Playfair Display', 'Noto Sans SC', serif; font-size: 48px; line-height: 1.2; color: #1d1c1a; font-weight: 700; margin-bottom: 16px; }
.subtitle { font-size: 22px; color: #4e32a2; font-weight: 400; margin-bottom: 40px; line-height: 1.5; }
.divider { width: 80px; height: 3px; background: #4e32a2; margin-bottom: 32px; }
.summary { font-size: 15px; color: #86847c; line-height: 1.8; max-width: 500px; margin-bottom: 50px; }
.meta-block { position: absolute; bottom: 80px; left: 60px; right: 60px; }
.meta-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-top: 1px solid #d5d2c9; }
.meta-label { font-size: 11px; color: #86847c; text-transform: uppercase; letter-spacing: 2px; }
.meta-value { font-size: 13px; color: #1d1c1a; font-weight: 700; }
.score-block { position: absolute; top: 60px; right: 60px; text-align: center; }
.score-number { font-family: 'Playfair Display', serif; font-size: 72px; color: #4e32a2; line-height: 1; }
.score-label { font-size: 11px; color: #86847c; letter-spacing: 3px; text-transform: uppercase; margin-top: 8px; }
</style>
</head>
<body>
<div class="cover">
  <div class="geometric-line line-v1"></div>
  <div class="geometric-line line-h1"></div>
  <div class="geometric-line line-v2"></div>
  <div class="geometric-line line-h2"></div>
  <div class="accent-dot dot1"></div>
  <div class="accent-dot dot2"></div>
  <div class="score-block">
    <div class="score-number">48%</div>
    <div class="score-label">Taux de Realisation</div>
  </div>
  <div class="content">
    <div class="kicker">Rapport d'Evaluation</div>
    <div class="title">QMS SaaS Pro</div>
    <div class="subtitle">Analyse du Taux de Realisation<br>par rapport au Metaprompt de Specification</div>
    <div class="divider"></div>
    <div class="summary">
      Evaluation comparative detaillee de l'application QMS SaaS Pro conforme ISO 13485:2016.
      Analyse de 15 modules metier, 17 composants d'infrastructure et 6 principes architecturaux
      par rapport aux specifications du metaprompt initial.
    </div>
  </div>
  <div class="meta-block">
    <div class="meta-row">
      <span class="meta-label">Document</span>
      <span class="meta-value">Rapport de Realisation v1.0</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Date</span>
      <span class="meta-value">29 Avril 2026</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Objectif ISO 13485</span>
      <span class="meta-value">82%</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Couverture Reelle</span>
      <span class="meta-value" style="color: #964e48;">44%</span>
    </div>
  </div>
</div>
</body>
</html>
"""

with open(COVER_HTML, 'w', encoding='utf-8') as f:
    f.write(cover_html)
print(f"Cover HTML generated: {COVER_HTML}")

# ──────────────────────────────────────────────────────────────
# Render Cover PDF
# ──────────────────────────────────────────────────────────────
import subprocess

# Validate cover HTML first
try:
    result = subprocess.run(
        ['python3', os.path.join(PDF_SKILL_DIR, 'scripts', 'poster_validate.py'), 'check-html', COVER_HTML],
        capture_output=True, text=True, timeout=30
    )
    print("Cover validation:", result.stdout[-200:] if result.stdout else "OK")
    if result.stderr:
        print("Cover validation stderr:", result.stderr[-200:])
except Exception as e:
    print(f"Cover validation skipped: {e}")

# Render cover
try:
    result = subprocess.run(
        ['node', os.path.join(PDF_SKILL_DIR, 'scripts', 'html2poster.js'),
         COVER_HTML, '--output', COVER_PDF, '--width', '794px'],
        capture_output=True, text=True, timeout=60
    )
    print("Cover render:", "OK" if result.returncode == 0 else result.stderr[-300:])
except Exception as e:
    print(f"Cover render error: {e}")

# ──────────────────────────────────────────────────────────────
# Merge Cover + Body
# ──────────────────────────────────────────────────────────────
from pypdf import PdfReader, PdfWriter, Transformation

A4_W, A4_H = 595.28, 841.89

def normalize_page_to_a4(page):
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    if abs(w - A4_W) > 2 or abs(h - A4_H) > 2:
        sx, sy = A4_W / w, A4_H / h
        page.add_transformation(Transformation().scale(sx=sx, sy=sy))
        page.mediabox.lower_left = (0, 0)
        page.mediabox.upper_right = (A4_W, A4_H)
    return page

def insert_cover(cover_pdf, body_pdf, output_pdf):
    writer = PdfWriter()
    # Cover as page 1
    if os.path.exists(cover_pdf):
        cover_page = PdfReader(cover_pdf).pages[0]
        writer.add_page(normalize_page_to_a4(cover_page))
    # Body pages follow
    for page in PdfReader(body_pdf).pages:
        writer.add_page(normalize_page_to_a4(page))
    writer.add_metadata({'/Title': 'QMS SaaS Pro - Taux de Realisation', '/Author': 'Z.ai', '/Creator': 'Z.ai'})
    with open(output_pdf, 'wb') as f:
        writer.write(f)

insert_cover(COVER_PDF, BODY_PDF, OUTPUT)
print(f"\nFinal PDF generated: {OUTPUT}")

# Cleanup temp files
for f in [BODY_PDF, COVER_PDF]:
    if os.path.exists(f):
        os.remove(f)
print("Temporary files cleaned up.")

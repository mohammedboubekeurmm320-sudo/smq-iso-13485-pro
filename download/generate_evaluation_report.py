#!/usr/bin/env python3
"""
QMS SaaS Pro - Rapport d'Evaluation du Projet
ISO 13485:2016 Compliant Quality Management System
"""

import os
import sys
import hashlib

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm, mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether, CondPageBreak, HRFlowable
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ━━ Font Registration ━━
pdfmetrics.registerFont(TTFont('NotoSerifSC', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSCBold', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSC', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSCBold', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSerif', '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSerifBold', '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Carlito', '/usr/share/fonts/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('CarlitoBold', '/usr/share/fonts/truetype/english/Carlito-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSansBold', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'))

registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSCBold')
registerFontFamily('SarasaMonoSC', normal='SarasaMonoSC', bold='SarasaMonoSCBold')
registerFontFamily('DejaVuSerif', normal='DejaVuSerif', bold='DejaVuSerifBold')
registerFontFamily('Carlito', normal='Carlito', bold='CarlitoBold')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSansBold')

# Install font fallback for mixed content
PDF_SKILL_DIR = '/home/z/my-project/skills/pdf'
_scripts = os.path.join(PDF_SKILL_DIR, 'scripts')
if _scripts not in sys.path:
    sys.path.insert(0, _scripts)
from pdf import install_font_fallback
install_font_fallback()

# ━━ Color Palette ━━
ACCENT       = colors.HexColor('#4926b5')
TEXT_PRIMARY  = colors.HexColor('#1d1d1a')
TEXT_MUTED    = colors.HexColor('#807d74')
BG_SURFACE   = colors.HexColor('#e1dfd7')
BG_PAGE      = colors.HexColor('#eeece9')
TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE

# Semantic colors for status indicators
COLOR_GREEN  = colors.HexColor('#2d8a4e')
COLOR_AMBER  = colors.HexColor('#b8860b')
COLOR_RED    = colors.HexColor('#c0392b')
COLOR_BLUE   = colors.HexColor('#2471a3')

# ━━ Page Setup ━━
PAGE_W, PAGE_H = A4
LEFT_MARGIN = 1.0 * inch
RIGHT_MARGIN = 1.0 * inch
TOP_MARGIN = 0.8 * inch
BOTTOM_MARGIN = 0.8 * inch
CONTENT_W = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN

# ━━ Styles ━━
styles = getSampleStyleSheet()

cover_title_style = ParagraphStyle(
    name='CoverTitle', fontName='DejaVuSerif', fontSize=36,
    leading=44, alignment=TA_LEFT, textColor=ACCENT, spaceAfter=12
)
cover_subtitle_style = ParagraphStyle(
    name='CoverSubtitle', fontName='DejaVuSerif', fontSize=18,
    leading=24, alignment=TA_LEFT, textColor=TEXT_MUTED, spaceAfter=6
)
cover_meta_style = ParagraphStyle(
    name='CoverMeta', fontName='DejaVuSerif', fontSize=12,
    leading=18, alignment=TA_LEFT, textColor=TEXT_MUTED
)

toc_title_style = ParagraphStyle(
    name='TOCTitle', fontName='DejaVuSerif', fontSize=20,
    leading=28, alignment=TA_LEFT, textColor=ACCENT, spaceBefore=0, spaceAfter=18
)

h1_style = ParagraphStyle(
    name='H1Custom', fontName='DejaVuSerif', fontSize=20,
    leading=28, alignment=TA_LEFT, textColor=ACCENT,
    spaceBefore=18, spaceAfter=12
)
h2_style = ParagraphStyle(
    name='H2Custom', fontName='DejaVuSerif', fontSize=15,
    leading=22, alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    spaceBefore=14, spaceAfter=8
)
h3_style = ParagraphStyle(
    name='H3Custom', fontName='DejaVuSerif', fontSize=12,
    leading=18, alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    spaceBefore=10, spaceAfter=6
)

body_style = ParagraphStyle(
    name='BodyCustom', fontName='DejaVuSerif', fontSize=10.5,
    leading=17, alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY,
    spaceBefore=0, spaceAfter=6, firstLineIndent=0
)
body_indent_style = ParagraphStyle(
    name='BodyIndent', fontName='DejaVuSerif', fontSize=10.5,
    leading=17, alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY,
    spaceBefore=0, spaceAfter=6, leftIndent=18
)
bullet_style = ParagraphStyle(
    name='BulletCustom', fontName='DejaVuSerif', fontSize=10.5,
    leading=17, alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    spaceBefore=2, spaceAfter=2, leftIndent=24, bulletIndent=12
)

table_header_style = ParagraphStyle(
    name='TableHeader', fontName='DejaVuSerif', fontSize=9.5,
    leading=14, alignment=TA_CENTER, textColor=TABLE_HEADER_TEXT
)
table_cell_style = ParagraphStyle(
    name='TableCell', fontName='DejaVuSerif', fontSize=9,
    leading=13, alignment=TA_LEFT, textColor=TEXT_PRIMARY
)
table_cell_center_style = ParagraphStyle(
    name='TableCellCenter', fontName='DejaVuSerif', fontSize=9,
    leading=13, alignment=TA_CENTER, textColor=TEXT_PRIMARY
)

caption_style = ParagraphStyle(
    name='Caption', fontName='DejaVuSerif', fontSize=9,
    leading=14, alignment=TA_CENTER, textColor=TEXT_MUTED,
    spaceBefore=3, spaceAfter=6
)

callout_style = ParagraphStyle(
    name='Callout', fontName='DejaVuSerif', fontSize=11,
    leading=18, alignment=TA_LEFT, textColor=ACCENT,
    spaceBefore=6, spaceAfter=6, leftIndent=12, borderPadding=8,
    borderColor=ACCENT, borderWidth=0
)

footer_style = ParagraphStyle(
    name='Footer', fontName='DejaVuSerif', fontSize=8,
    leading=12, alignment=TA_CENTER, textColor=TEXT_MUTED
)


# ━━ TOC DocTemplate ━━
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))


# ━━ Helper Functions ━━
def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/>%s' % (key, text), style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

H1_ORPHAN_THRESHOLD = (PAGE_H - TOP_MARGIN - BOTTOM_MARGIN) * 0.15

def add_major_section(text):
    return [
        CondPageBreak(H1_ORPHAN_THRESHOLD),
        add_heading(text, h1_style, level=0),
    ]

def make_table(data, col_widths, caption_text=None):
    """Create a styled table with optional caption."""
    elements = []
    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    num_rows = len(data)
    style_commands = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, num_rows):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_commands.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_commands))
    elements.append(Spacer(1, 18))
    elements.append(t)
    if caption_text:
        elements.append(Spacer(1, 6))
        elements.append(Paragraph(caption_text, caption_style))
    elements.append(Spacer(1, 18))
    return elements

def status_badge(status, style=None):
    """Return a colored status indicator."""
    s = style or table_cell_center_style
    color_map = {
        'Termine': COLOR_GREEN,
        'Operationnel': COLOR_GREEN,
        'Partiel': COLOR_AMBER,
        'En cours': COLOR_AMBER,
        'Non commence': COLOR_RED,
        'Bloque': COLOR_RED,
    }
    c = color_map.get(status, TEXT_MUTED)
    return Paragraph('<font color="%s"><b>%s</b></font>' % (c.hexval(), status), s)

def pct_bar(pct, style=None):
    """Return a visual percentage bar indicator."""
    s = style or table_cell_center_style
    filled = int(pct / 10)
    bar = '|' * filled + '.' * (10 - filled)
    return Paragraph('<font name="DejaVuSans" size="8">%s</font> <font size="8">%d%%</font>' % (bar, pct), s)


# ━━ Build Report ━━
OUTPUT_PATH = '/home/z/my-project/download/QMS_SaaS_Pro_Evaluation_Projet.pdf'

doc = TocDocTemplate(
    OUTPUT_PATH,
    pagesize=A4,
    leftMargin=LEFT_MARGIN,
    rightMargin=RIGHT_MARGIN,
    topMargin=TOP_MARGIN,
    bottomMargin=BOTTOM_MARGIN,
    title='QMS SaaS Pro - Evaluation du Projet',
    author='Z.ai',
    creator='Z.ai',
    subject='Evaluation de l\'etat de realisation et perspectives de developpement'
)

story = []

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TABLE OF CONTENTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph('<b>Table des matieres</b>', toc_title_style))
toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle(name='TOCLevel0', fontName='DejaVuSerif', fontSize=12,
                   leading=20, leftIndent=20, spaceBefore=6),
    ParagraphStyle(name='TOCLevel1', fontName='DejaVuSerif', fontSize=10.5,
                   leading=18, leftIndent=40, spaceBefore=3),
]
story.append(toc)
story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. RESUME EXECUTIF
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.extend(add_major_section('1. Resume executif'))

story.append(Paragraph(
    'Le projet QMS SaaS Pro est un systeme de gestion de la qualite conforme a la norme ISO 13485:2016, '
    'concu pour les industries pharmaceutique et des dispositifs medicaux. Developpe sur une architecture '
    'moderne Next.js 16 / React 19 / TypeScript, il integre 15 modules fonctionnels couvrant l\'ensemble '
    'des exigences reglementaires, depuis la maitrise des documents jusqu\'a la gestion des risques en passant '
    'par les CAPA, les non-conformites, les audits et les enregistrements de lots. Le projet a ete realise '
    'en 6 phases de developpement successives, aboutissant a un code base de plus de 38 000 lignes reparties '
    'dans 166 fichiers TypeScript/TSX.',
    body_style
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'L\'etat actuel du projet est globalement solide : 824 tests unitaires et d\'integration passent avec succes, '
    'le build de production compile sans erreur, et l\'architecture dual-mode (Demo/Supabase) permet une '
    'demonstration fonctionnelle immediate tout en preservant la capacite de deploiement en production avec '
    'base de donnees PostgreSQL et Row Level Security. Neanmoins, plusieurs axes d\'amelioration critiques '
    'ont ete identifies, notamment l\'absence d\'authentification fonctionnelle en mode demo, le manque '
    'de protection des routes par le middleware, et l\'impossibilite actuelle de servir l\'application '
    'via une URL accessible dans l\'environnement sandbox.',
    body_style
))
story.append(Spacer(1, 6))

# Key metrics callout box
metrics_data = [
    [Paragraph('<b>Indicateur</b>', table_header_style),
     Paragraph('<b>Valeur</b>', table_header_style),
     Paragraph('<b>Statut</b>', table_header_style)],
    [Paragraph('Lignes de code source', table_cell_style),
     Paragraph('38 237', table_cell_center_style),
     status_badge('Termine')],
    [Paragraph('Fichiers TypeScript/TSX', table_cell_style),
     Paragraph('166', table_cell_center_style),
     status_badge('Termine')],
    [Paragraph('Modules fonctionnels', table_cell_style),
     Paragraph('15 / 15', table_cell_center_style),
     status_badge('Termine')],
    [Paragraph('Tests unitaires et integration', table_cell_style),
     Paragraph('824 / 824', table_cell_center_style),
     status_badge('Termine')],
    [Paragraph('Build production', table_cell_style),
     Paragraph('Compilation reussie', table_cell_center_style),
     status_badge('Termine')],
    [Paragraph('Authentification', table_cell_style),
     Paragraph('Non configuree', table_cell_center_style),
     status_badge('Non commence')],
    [Paragraph('Deploiement accessible', table_cell_style),
     Paragraph('Non fonctionnel', table_cell_center_style),
     status_badge('Bloque')],
]
story.extend(make_table(metrics_data, [CONTENT_W*0.45, CONTENT_W*0.30, CONTENT_W*0.25],
                        'Tableau 1 : Indicateurs cles du projet QMS SaaS Pro'))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. PRESENTATION DU PROJET
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.extend(add_major_section('2. Presentation du projet'))

story.append(Paragraph(
    'QMS SaaS Pro est une plateforme SaaS multi-tenant de gestion de la qualite, concue pour repondre '
    'aux exigences des normes ISO 13485:2016, ICH Q10, IVDR (Reglement UE 2017/746) et 21 CFR Part 11. '
    'La solution cible les entreprises des secteurs pharmaceutique, dispositifs medicaux, biotechnologie, '
    'diagnostics in vitro et produits combinants. L\'architecture multi-locataire s\'appuie sur Supabase '
    'avec Row Level Security (RLS), garantissant l\'isolation complete des donnees entre organisations.',
    body_style
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'Le systeme offre un modele de controle d\'acces base sur les roles (RBAC) comprenant 6 niveaux : '
    'Super Admin, Admin Qualite, Responsable Qualite, Utilisateur Qualite, Auditeur et Lecteur. Chaque role '
    'dispose de permissions granulaires permettant de limiter les actions sensibles aux seules personnes '
    'habilitees. La conformite 21 CFR Part 11 est assuree par un systeme de signatures electroniques '
    'avec generation de hash SHA-256 pour les operations critiques telles que l\'approbation de documents, '
    'la liberation QA des lots, la completion de formations et la cloture des CAPA.',
    body_style
))

story.append(add_heading('2.1 Stack technique', h2_style, level=1))

tech_data = [
    [Paragraph('<b>Couche</b>', table_header_style),
     Paragraph('<b>Technologie</b>', table_header_style),
     Paragraph('<b>Version</b>', table_header_style)],
    [Paragraph('Framework', table_cell_style),
     Paragraph('Next.js (App Router)', table_cell_style),
     Paragraph('16.1', table_cell_center_style)],
    [Paragraph('UI', table_cell_style),
     Paragraph('React + TypeScript + TailwindCSS 4', table_cell_style),
     Paragraph('19 / 5', table_cell_center_style)],
    [Paragraph('Composants', table_cell_style),
     Paragraph('shadcn/ui (style New York)', table_cell_style),
     Paragraph('42 composants', table_cell_center_style)],
    [Paragraph('Base de donnees', table_cell_style),
     Paragraph('Prisma (SQLite dev) / Supabase (PostgreSQL prod)', table_cell_style),
     Paragraph('6.11 / 2.x', table_cell_center_style)],
    [Paragraph('State management', table_cell_style),
     Paragraph('Zustand + TanStack Query + React Hook Form + Zod', table_cell_style),
     Paragraph('5 / 5 / 7 / 4', table_cell_center_style)],
    [Paragraph('Visualisation', table_cell_style),
     Paragraph('Recharts + TanStack Table', table_cell_style),
     Paragraph('2.x / 8.x', table_cell_center_style)],
    [Paragraph('Authentification', table_cell_style),
     Paragraph('NextAuth + Supabase Auth (SSR)', table_cell_style),
     Paragraph('4.24', table_cell_center_style)],
    [Paragraph('Tests', table_cell_style),
     Paragraph('Vitest + Testing Library + Playwright + MSW', table_cell_style),
     Paragraph('4.1 / latest', table_cell_center_style)],
    [Paragraph('i18n', table_cell_style),
     Paragraph('next-intl (EN/FR)', table_cell_style),
     Paragraph('4.3', table_cell_center_style)],
]
story.extend(make_table(tech_data, [CONTENT_W*0.22, CONTENT_W*0.55, CONTENT_W*0.23],
                        'Tableau 2 : Stack technique du projet'))

story.append(add_heading('2.2 Architecture dual-mode', h2_style, level=1))
story.append(Paragraph(
    'L\'architecture du projet repose sur un mecanisme de detection automatique du mode de fonctionnement. '
    'Lorsque les variables d\'environnement Supabase (NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY) '
    'ne sont pas configurees ou contiennent des valeurs de placeholder, le systeme bascule automatiquement en mode '
    'Demo. Dans ce mode, les donnees sont stockees en memoire via un store Zustand avec des donnees de '
    'demonstration pre-chargees, permettant une evaluation fonctionnelle complete sans infrastructure externe.',
    body_style
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'En mode production (Supabase), le systeme active 15 services dedies qui implementent un CRUD complet '
    'avec scoping organisationnel automatique, conversion camelCase/snake_case transparente, et enregistrement '
    'systematique dans le journal d\'audit. Les politiques Row Level Security garantissent que chaque '
    'organisation ne peut acceder qu\'a ses propres donnees, tandis que le rafraichissement de session '
    'est gere par le middleware Supabase pour maintenir la continuite d\'authentification.',
    body_style
))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. ETAT DE REALISATION PAR MODULE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.extend(add_major_section('3. Etat de realisation par module'))

story.append(Paragraph(
    'L\'ensemble des 15 modules fonctionnels a ete implemente au cours des 6 phases de developpement. '
    'Chaque module dispose d\'un composant React complet avec formulaires, tableaux de donnees, filtres, '
    'et integration des signatures electroniques. Les API routes correspondantes ont ete developpees pour '
    'chaque entite avec validation Zod et reponses standardisees. Les services Supabase offrent une couche '
    'd\'acces aux donnees complete avec audit trail automatique.',
    body_style
))

story.append(add_heading('3.1 Modules principaux (7)', h2_style, level=1))

core_modules = [
    ['Controle des documents', '851', 'CRUD complet, hierarchie, e-signatures, workflow d\'approbation', '100%'],
    ['CAPA', '700', 'Actions correctives/preventives, 5 Pourquoi, suivi efficacite', '100%'],
    ['Non-conformites (NCR)', '735', 'NCR, investigation OOS, disposition, phase 1/2', '100%'],
    ['Audits', '700', 'Internes/externes/fournisseurs, constatations, plans d\'action', '100%'],
    ['Formation', '700', 'Conformite formation, suivi retard, e-signature completion', '100%'],
    ['Rapports', '1346', '9 modeles de rapports, graphiques, export CSV', '100%'],
    ['Conformite', '929', 'ISO 13485, ICH Q10, IVDR, analyse des ecarts', '100%'],
]

core_data = [[Paragraph('<b>Module</b>', table_header_style),
              Paragraph('<b>Lignes</b>', table_header_style),
              Paragraph('<b>Fonctionnalites</b>', table_header_style),
              Paragraph('<b>Avancement</b>', table_header_style)]]
for mod in core_modules:
    core_data.append([
        Paragraph(mod[0], table_cell_style),
        Paragraph(mod[1], table_cell_center_style),
        Paragraph(mod[2], table_cell_style),
        status_badge('Termine'),
    ])
story.extend(make_table(core_data, [CONTENT_W*0.20, CONTENT_W*0.10, CONTENT_W*0.52, CONTENT_W*0.18],
                        'Tableau 3 : Modules principaux - Etat de realisation'))

story.append(add_heading('3.2 Modules optionnels (8)', h2_style, level=1))

opt_modules = [
    ['Gestion des risques', '700', 'FMEA, matrice 5x5, RPN, niveaux de risque', '100%'],
    ['Enregistrements de lots', '882', 'Etapes workflow, liberation QA, e-signature', '100%'],
    ['Fournisseurs', '773', 'Qualification, notation performance, certifications', '100%'],
    ['Controle des changements', '832', 'Workflow complet avec chemin de rejet', '100%'],
    ['Deviations', '806', 'Deviations planifiees/non planifiees', '100%'],
    ['OOS/OOT', '985', 'Investigation phase 1/2 conforme FDA', '100%'],
    ['Formulaires dynamiques', '1001', 'Constructeur de modeles, remplissage instances', '100%'],
    ['Hierarchie documentaire', '650', 'Arbre visuel, filtrage par niveau', '100%'],
]

opt_data = [[Paragraph('<b>Module</b>', table_header_style),
             Paragraph('<b>Lignes</b>', table_header_style),
             Paragraph('<b>Fonctionnalites</b>', table_header_style),
             Paragraph('<b>Avancement</b>', table_header_style)]]
for mod in opt_modules:
    opt_data.append([
        Paragraph(mod[0], table_cell_style),
        Paragraph(mod[1], table_cell_center_style),
        Paragraph(mod[2], table_cell_style),
        status_badge('Termine'),
    ])
story.extend(make_table(opt_data, [CONTENT_W*0.20, CONTENT_W*0.10, CONTENT_W*0.52, CONTENT_W*0.18],
                        'Tableau 4 : Modules optionnels - Etat de realisation'))

story.append(add_heading('3.3 Composants d\'infrastructure', h2_style, level=1))

infra_items = [
    ['Tableau de bord', '800', 'KPIs adaptes par industrie, poids de conformite', '100%'],
    ['Assistant de configuration', '972', '6 etapes, selection industrie, configuration organisation', '100%'],
    ['Navigation (Sidebar)', '400', 'Modules dynamiques, i18n, indicateur de mode', '100%'],
    ['Gestion utilisateurs', '738', 'Roles/permissions, profils, invitations', '100%'],
    ['Recherche globale', '200', 'Recherche cross-module avec resultats contextuels', '100%'],
    ['Signature electronique', '150', 'Dialogue conforme 21 CFR Part 11, hash SHA-256', '100%'],
]

infra_data = [[Paragraph('<b>Composant</b>', table_header_style),
               Paragraph('<b>Lignes</b>', table_header_style),
               Paragraph('<b>Description</b>', table_header_style),
               Paragraph('<b>Avancement</b>', table_header_style)]]
for item in infra_items:
    infra_data.append([
        Paragraph(item[0], table_cell_style),
        Paragraph(item[1], table_cell_center_style),
        Paragraph(item[2], table_cell_style),
        status_badge('Termine'),
    ])
story.extend(make_table(infra_data, [CONTENT_W*0.20, CONTENT_W*0.10, CONTENT_W*0.52, CONTENT_W*0.18],
                        'Tableau 5 : Composants d\'infrastructure'))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. QUALITE DU CODE ET TESTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.extend(add_major_section('4. Qualite du code et tests'))

story.append(add_heading('4.1 Couverture de tests', h2_style, level=1))
story.append(Paragraph(
    'La suite de tests du projet comprend 824 tests repartis dans 10 fichiers, couvrant les schemas de '
    'validation Zod, les check-lists de conformite, les services Supabase, le store de demonstration, '
    'le client API, les routes API, les utilitaires, les erreurs, les reponses et les composants partages. '
    'L\'ensemble de ces tests passe avec succes en 5.55 secondes, ce qui temoigne d\'une base de code stable '
    'et bien structuree. Le framework utilise est Vitest 4.1.5 avec environnement jsdom, accompagné de '
    'Testing Library et MSW pour le mocking des requetes reseau.',
    body_style
))

test_data = [
    [Paragraph('<b>Fichier de test</b>', table_header_style),
     Paragraph('<b>Type</b>', table_header_style),
     Paragraph('<b>Tests</b>', table_header_style),
     Paragraph('<b>Lignes</b>', table_header_style)],
    [Paragraph('validation.test.ts', table_cell_style),
     Paragraph('Unite', table_cell_center_style),
     Paragraph('228', table_cell_center_style),
     Paragraph('1 699', table_cell_center_style)],
    [Paragraph('compliance-checklists.test.ts', table_cell_style),
     Paragraph('Unite', table_cell_center_style),
     Paragraph('171', table_cell_center_style),
     Paragraph('1 587', table_cell_center_style)],
    [Paragraph('supabase-services.test.ts', table_cell_style),
     Paragraph('Unite', table_cell_center_style),
     Paragraph('77', table_cell_center_style),
     Paragraph('1 201', table_cell_center_style)],
    [Paragraph('demo-store.test.ts', table_cell_style),
     Paragraph('Unite', table_cell_center_style),
     Paragraph('87', table_cell_center_style),
     Paragraph('1 188', table_cell_center_style)],
    [Paragraph('api-client.test.ts', table_cell_style),
     Paragraph('Unite', table_cell_center_style),
     Paragraph('73', table_cell_center_style),
     Paragraph('734', table_cell_center_style)],
    [Paragraph('api-routes.test.ts', table_cell_style),
     Paragraph('Integration', table_cell_center_style),
     Paragraph('48', table_cell_center_style),
     Paragraph('1 347', table_cell_center_style)],
    [Paragraph('shared-components.test.tsx', table_cell_style),
     Paragraph('Composant', table_cell_center_style),
     Paragraph('52', table_cell_center_style),
     Paragraph('400', table_cell_center_style)],
    [Paragraph('Autres (4 fichiers)', table_cell_style),
     Paragraph('Unite', table_cell_center_style),
     Paragraph('88', table_cell_center_style),
     Paragraph('806', table_cell_center_style)],
    [Paragraph('<b>TOTAL</b>', table_cell_style),
     Paragraph('', table_cell_center_style),
     Paragraph('<b>824</b>', table_cell_center_style),
     Paragraph('<b>9 362</b>', table_cell_center_style)],
]
story.extend(make_table(test_data, [CONTENT_W*0.40, CONTENT_W*0.20, CONTENT_W*0.20, CONTENT_W*0.20],
                        'Tableau 6 : Distribution des tests par fichier et type'))

story.append(add_heading('4.2 Tests end-to-end', h2_style, level=1))
story.append(Paragraph(
    'Un jeu de 7 tests E2E Playwright est configure pour valider les parcours critiques : acces a la page '
    'd\'accueil, navigation par la barre laterale, affichage des KPIs du tableau de bord, fonctionnement '
    'des modules Documents, CAPA et NCR, et navigation cross-module. Ces tests fournissent une couche '
    'supplementaire de confiance dans le comportement global de l\'application, bien que la couverture E2E '
    'puisse etre etendue pour couvrir davantage de scenarios metier critiques.',
    body_style
))

story.append(add_heading('4.3 Points d\'attention sur la qualite', h2_style, level=1))
story.append(Paragraph(
    'Plusieurs aspects de la qualite du code meritent une attention particuliere. Premièrement, la configuration '
    'TypeScript est en mode permissif avec noImplicitAny: false et ignoreBuildErrors: true, ce qui signifie '
    'que des erreurs de type peuvent exister sans etre detectees lors du build. Bien que cela ait facilite '
    'le developpement rapide, il est recommande de renforcer progressivement la verification des types pour '
    'atteindre un niveau de securite adapté a un systeme GxP critique.',
    body_style
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'Deuxiemement, la couverture de tests actuelle se concentre principalement sur les couches inferieures '
    '(validation, services, store) et les routes API. Les composants React des 15 modules fonctionnels '
    'ne disposent pas encore de tests dedies, ce qui represente un risque significatif pour la maintenabilite '
    'et la fiabilite du front-end. Enfin, le fichier mock-data.ts de 1 171 lignes est un point de '
    'complexite elevee qui pourrait beneficier d\'une refactoring en modules plus petits.',
    body_style
))

quality_data = [
    [Paragraph('<b>Dimension</b>', table_header_style),
     Paragraph('<b>Statut actuel</b>', table_header_style),
     Paragraph('<b>Evaluation</b>', table_header_style),
     Paragraph('<b>Priorite</b>', table_header_style)],
    [Paragraph('Tests unitaires', table_cell_style),
     Paragraph('824 tests passants', table_cell_center_style),
     status_badge('Termine'),
     Paragraph('-', table_cell_center_style)],
    [Paragraph('Tests E2E', table_cell_style),
     Paragraph('7 tests smoke', table_cell_center_style),
     status_badge('Partiel'),
     Paragraph('Haute', table_cell_center_style)],
    [Paragraph('Tests composants React', table_cell_style),
     Paragraph('1 fichier (52 tests)', table_cell_center_style),
     status_badge('Partiel'),
     Paragraph('Haute', table_cell_center_style)],
    [Paragraph('Typage TypeScript', table_cell_style),
     Paragraph('Mode permissif', table_cell_center_style),
     status_badge('Partiel'),
     Paragraph('Moyenne', table_cell_center_style)],
    [Paragraph('Linting ESLint', table_cell_style),
     Paragraph('Configure', table_cell_center_style),
     status_badge('Termine'),
     Paragraph('-', table_cell_center_style)],
    [Paragraph('Build production', table_cell_style),
     Paragraph('Reussi (9.8s)', table_cell_center_style),
     status_badge('Termine'),
     Paragraph('-', table_cell_center_style)],
]
story.extend(make_table(quality_data, [CONTENT_W*0.25, CONTENT_W*0.30, CONTENT_W*0.20, CONTENT_W*0.25],
                        'Tableau 7 : Evaluation de la qualite du code'))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 5. EVALUATION DE L'ARCHITECTURE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.extend(add_major_section('5. Evaluation de l\'architecture'))

story.append(add_heading('5.1 Forces architecturales', h2_style, level=1))
story.append(Paragraph(
    'L\'architecture du projet presente plusieurs forces notables qui constituent un socle solide pour '
    'le developpement futur. La separation nette entre mode Demo et mode Supabase permet une demonstration '
    'immediate sans dependance externe, tout en preservant la capacite de deploiement en production avec '
    'une base de donnees relationnelle et des politiques de securite au niveau des lignes. Le modele '
    'de service de base (BaseService) fournit une abstraction CRUD reutilisable avec scoping organisationnel '
    'automatique et journal d\'audit integre, reduisant considerablement la duplication de code.',
    body_style
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'L\'utilisation de Zod pour la validation des schemas a la fois cote client et cote serveur assure '
    'la coherence des contraintes metier. L\'integration de 42 composants shadcn/ui garantit une interface '
    'utilisateur coherente et accessible, tandis que le systeme i18n (EN/FR) prefigure le support '
    'multilingue necessaire pour un deploiement international. L\'architecture single-page application '
    'avec navigation par etat simplifie l\'experience utilisateur tout en eliminant les problemes de '
    'synchronisation de route entre le client et le serveur.',
    body_style
))

story.append(add_heading('5.2 Faiblesses et risques identifies', h2_style, level=1))
story.append(Paragraph(
    'Plusieurs faiblesses architecturales ont ete identifiees et doivent etre adressees pour garantir '
    'la conformite reglementaire et la securite du systeme en production. La faiblesse la plus critique '
    'concerne l\'authentification : le middleware actuel ne fait que rafraichir les sessions Supabase '
    'et ne redirige pas les utilisateurs non authentifies vers une page de connexion. Il n\'existe aucune '
    'protection des routes basee sur les roles au niveau du middleware, ce qui signifie que toute personne '
    'ayant acces a l\'URL peut potentiellement acceder a toutes les fonctionnalites.',
    body_style
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'Le second risque majeur concerne l\'environnement de deploiement. L\'application ne peut actuellement '
    'pas etre servie via une URL accessible dans l\'environnement sandbox, ce qui bloque toute demonstration '
    'a distance. Le serveur Next.js, qu\'il soit lance en mode developpement ou en mode production standalone, '
    'ne persiste pas dans l\'environnement sandbox, et les tentatives de connexion locale via curl echouent '
    'en raison de l\'isolation reseau.',
    body_style
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'Enfin, l\'absence de page de connexion dediee, de flux d\'inscription, de gestion de session visible '
    'et de deconnexion rend le systeme inutilisable en conditions reelles de production, meme si les fondations '
    'techniques (NextAuth, Supabase Auth) sont presentes dans les dependances. La validation reglementaire '
    'complète (IQ/OQ/PQ) documentee dans le protocole de validation ne pourra etre executee que lorsque '
    'ces elements seront en place.',
    body_style
))

risk_data = [
    [Paragraph('<b>Risque</b>', table_header_style),
     Paragraph('<b>Impact</b>', table_header_style),
     Paragraph('<b>Probabilite</b>', table_header_style),
     Paragraph('<b>Mitigation</b>', table_header_style)],
    [Paragraph('Absence d\'authentification fonctionnelle', table_cell_style),
     Paragraph('Critique', table_cell_center_style),
     Paragraph('Certain', table_cell_center_style),
     Paragraph('Implementer NextAuth + pages login/logout', table_cell_style)],
    [Paragraph('Pas de protection des routes (middleware)', table_cell_style),
     Paragraph('Critique', table_cell_center_style),
     Paragraph('Certain', table_cell_center_style),
     Paragraph('Ajouter guards RBAC dans le middleware', table_cell_style)],
    [Paragraph('Deploiement inaccessible', table_cell_style),
     Paragraph('Eleve', table_cell_center_style),
     Paragraph('Certain', table_cell_center_style),
     Paragraph('Configurer Vercel/Netlify ou Docker', table_cell_style)],
    [Paragraph('Typage permissif TypeScript', table_cell_style),
     Paragraph('Moyen', table_cell_center_style),
     Paragraph('Possible', table_cell_center_style),
     Paragraph('Activer strict mode progressivement', table_cell_style)],
    [Paragraph('Couverture de tests front-end limitee', table_cell_style),
     Paragraph('Moyen', table_cell_center_style),
     Paragraph('Possible', table_cell_center_style),
     Paragraph('Ajouter tests composants pour les 15 modules', table_cell_style)],
    [Paragraph('Pas de tests de performance/charge', table_cell_style),
     Paragraph('Moyen', table_cell_center_style),
     Paragraph('Possible', table_cell_center_style),
     Paragraph('Implementer tests k6/Artillery', table_cell_style)],
]
story.extend(make_table(risk_data, [CONTENT_W*0.25, CONTENT_W*0.12, CONTENT_W*0.13, CONTENT_W*0.50],
                        'Tableau 8 : Matrice des risques identifies'))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 6. PHASES DE DEVELOPPEMENT REALISEES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.extend(add_major_section('6. Phases de developpement realisees'))

story.append(Paragraph(
    'Le projet a ete developpe selon une approche incrementale en 6 phases, chacune apportant un ensemble '
    'coherent de fonctionnalites. Cette methode a permis de livrer progressivement des increments '
    'fonctionnels tout en maintenant la coherence architecturale globale. Le tableau ci-dessous resume '
    'les livrables de chaque phase ainsi que leur etat de completion.',
    body_style
))

phase_data = [
    [Paragraph('<b>Phase</b>', table_header_style),
     Paragraph('<b>Objectif</b>', table_header_style),
     Paragraph('<b>Livrables cles</b>', table_header_style),
     Paragraph('<b>Statut</b>', table_header_style)],
    [Paragraph('Phase 1', table_cell_style),
     Paragraph('Services et guards', table_cell_style),
     Paragraph('BaseService, 15 services Supabase, demo-store, type system, validation Zod', table_cell_style),
     status_badge('Termine')],
    [Paragraph('Phase 2', table_cell_style),
     Paragraph('Hooks et API routes', table_cell_style),
     Paragraph('6 hooks React, 14 entites CRUD API, validation, reponses standard', table_cell_style),
     status_badge('Termine')],
    [Paragraph('Phase 3', table_cell_style),
     Paragraph('Composants front-end', table_cell_style),
     Paragraph('15 vues modules, AppLayout, Sidebar, SetupWizard, Dashboard', table_cell_style),
     status_badge('Termine')],
    [Paragraph('Phase 4', table_cell_style),
     Paragraph('Integration Supabase', table_cell_style),
     Paragraph('Client browser/server/admin, middleware, mode detection, migrations SQL', table_cell_style),
     status_badge('Termine')],
    [Paragraph('Phase 5', table_cell_style),
     Paragraph('Conformite et tests', table_cell_style),
     Paragraph('824 tests, check-lists ISO/ICH/IVDR, E2E Playwright, validation protocol', table_cell_style),
     status_badge('Termine')],
    [Paragraph('Phase 6', table_cell_style),
     Paragraph('Polissage et industries', table_cell_style),
     Paragraph('Configurations industrie, rapports avances, export CSV, OOS/OOT, deviations', table_cell_style),
     status_badge('Termine')],
]
story.extend(make_table(phase_data, [CONTENT_W*0.10, CONTENT_W*0.18, CONTENT_W*0.54, CONTENT_W*0.18],
                        'Tableau 9 : Phases de developpement et livrables'))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 7. POSSIBILITES DE DEVELOPPEMENT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.extend(add_major_section('7. Possibilites de developpement'))

story.append(Paragraph(
    'Malgre l\'avancement considerable du projet, plusieurs axes de developpement prioritaires doivent etre '
    'adresses pour transformer le prototype actuel en produit deployable en production. Les sections suivantes '
    'detaille les possibilites de developpement classees par ordre de priorite, en distinguant les imperatifs '
    'reglementaires des ameliorations fonctionnelles et des optimisations techniques.',
    body_style
))

story.append(add_heading('7.1 Priorite P0 - Imperatifs critiques', h2_style, level=1))
story.append(Paragraph(
    '<b>Authentification et autorisation</b> : L\'implementation complete du flux d\'authentification est '
    'la priorite absolue. Cela comprend la creation d\'une page de connexion/deconnexion, l\'activation '
    'de NextAuth avec fournisseurs Supabase, la protection des routes par le middleware avec redirection '
    'vers la page de connexion pour les utilisateurs non authentifies, et l\'ajout de guards base sur les '
    'roles au niveau du middleware pour empecher l\'acces non autorise aux modules sensibles. Ce travail '
    'est indispensable pour toute mise en production, meme interne, car sans authentification, le systeme '
    'ne peut pas garantir la tracabilite requise par la norme ISO 13485 et le 21 CFR Part 11.',
    body_style
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    '<b>Deploiement accessible</b> : La configuration d\'un environnement de deploiement fonctionnel est '
    'essentielle pour permettre les tests d\'acceptation, les demonstrations aux parties prenantes et la '
    'validation reglementaire. Les options recommandees incluent le deploiement sur Vercel (plateforme '
    'native pour Next.js), la containerisation Docker avec docker-compose pour un deploiement on-premise, '
    'ou l\'utilisation d\'un VPS avec un serveur Caddy deja configure dans le projet. Le fichier Caddyfile '
    'present dans le projet suggere que cette option a ete envisagee.',
    body_style
))

story.append(add_heading('7.2 Priorite P1 - Conformite reglementaire', h2_style, level=1))
story.append(Paragraph(
    '<b>Journal d\'audit complet et immutable</b> : Bien que le systeme enregistre deja les operations '
    'CRUD dans le journal d\'audit via le BaseService, il est necessaire de renforcer cette fonctionnalite '
    'pour atteindre la conformite 21 CFR Part 11. Cela implique l\'ajout d\'horodatage avec resolution '
    'sub-seconde, la signature cryptographique des entrees d\'audit pour empecher toute modification '
    'a posteriori, l\'implementation d\'un mecanisme de verification d\'integrite du journal, et la creation '
    'd\'une interface de consultation du journal d\'audit avec filtres avancees et export.',
    body_style
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    '<b>Workflows d\'approbation complets</b> : Les workflows d\'approbation des documents, CAPA et changements '
    'doivent etre enrichis pour supporter des scenarios multi-etales avec notifications, escalades automatiques, '
    'et gestion des delegations d\'approbation. Chaque transition d\'etat doit declencher un enregistrement '
    'dans le journal d\'audit avec la signature electronique de l\'utilisateur ayant effectue l\'action.',
    body_style
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    '<b>Validation reglementaire IQ/OQ/PQ</b> : Le protocole de validation existe deja (PDF de 18 pages avec '
    '113 cas de test), mais son execution effective necessite un environnement de deploiement stable et '
    'un systeme d\'authentification fonctionnel. L\'execution et la documentation des resultats de validation '
    'seront requises avant toute mise en service dans un environnement GxP.',
    body_style
))

story.append(add_heading('7.3 Priorite P2 - Enrichissements fonctionnels', h2_style, level=1))
story.append(Paragraph(
    '<b>Notifications et alertes</b> : L\'implementation d\'un systeme de notifications en temps reel '
    'permettrait d\'informer les utilisateurs des evenements critiques : approbations en attente, CAPA '
    'depassees, formations arrives a expiration, audits planifies. L\'integration de WebSocket (deja '
    'presente dans les dependances via le repertoire examples/) permettrait la notification push, tandis '
    'qu\'un systeme de notifications par email via un service tiers (SendGrid, AWS SES) completerait '
    'le dispositif pour les utilisateurs non connectes.',
    body_style
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    '<b>Tableau de bord avance et analytics</b> : Le tableau de bord actuel affiche des KPIs statiques. '
    'L\'ajout de graphiques d\'evolution temporelle, de tendances de conformite, de comparaisons inter-périodes '
    'et d\'indicateurs predictifs (risque de deviation, probabilite de non-conformite) apporterait une '
    'valeur considerable aux responsables qualite. L\'integration de Recharts (deja dans les dependances) '
    'facilite cette evolution.',
    body_style
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    '<b>API publique et integrations</b> : La creation d\'une API REST documentee (OpenAPI/Swagger) permettrait '
    'l\'integration avec des systemes tiers courants dans l\'industrie pharmaceutique : ERP (SAP, Oracle), '
    'LIMS (Laboratory Information Management Systems), et systemes de gestion d\'etiquettes. Cette ouverture '
    'transformerait le QMS d\'un outil isole en un composant central de l\'ecosysteme qualite.',
    body_style
))

story.append(add_heading('7.4 Priorite P3 - Optimisations techniques', h2_style, level=1))
story.append(Paragraph(
    '<b>Renforcement TypeScript</b> : L\'activation progressive du mode strict TypeScript (noImplicitAny: true, '
    'ignoreBuildErrors: false) ameliorerait la securite du typage et la maintenabilite du code. Cette '
    'migration peut etre effectuee de maniere incrementale, fichier par fichier, en commencant par les '
    'modules critiques (validation, services, API routes).',
    body_style
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    '<b>Performance et scalabilite</b> : L\'optimisation des performances inclut l\'implementation du '
    'rendu cote serveur (SSR) pour les pages a forte visibilite, la mise en cache des requetes frequentes '
    'via TanStack Query, la pagination cote serveur pour les grandes collections de documents, et '
    'l\'optimisation des images et assets statiques. Des tests de charge avec k6 ou Artillery permettraient '
    'de valider la tenue du systeme sous contrainte.',
    body_style
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    '<b>Accessibilite (WCAG 2.1 AA)</b> : L\'audit d\'accessibilite du front-end est necessaire pour '
    'garantir la conformite aux normes WCAG 2.1 AA, particulierement importante pour les applications '
    'utilisees dans des environnements reglementes. L\'utilisation de shadcn/ui (base sur Radix UI) '
    'offre une bonne base d\'accessibilite, mais des verifications specifiques sont requises pour les '
    'formulaires complexes et les tableaux de donnees.',
    body_style
))

# Roadmap table
roadmap_data = [
    [Paragraph('<b>Priorite</b>', table_header_style),
     Paragraph('<b>Fonctionnalite</b>', table_header_style),
     Paragraph('<b>Effort estime</b>', table_header_style),
     Paragraph('<b>Impact</b>', table_header_style)],
    [Paragraph('P0', table_cell_center_style),
     Paragraph('Authentification NextAuth + pages login/logout', table_cell_style),
     Paragraph('3-5 jours', table_cell_center_style),
     Paragraph('Critique', table_cell_center_style)],
    [Paragraph('P0', table_cell_center_style),
     Paragraph('Protection des routes (middleware RBAC)', table_cell_style),
     Paragraph('2-3 jours', table_cell_center_style),
     Paragraph('Critique', table_cell_center_style)],
    [Paragraph('P0', table_cell_center_style),
     Paragraph('Deploiement Vercel/Docker accessible', table_cell_style),
     Paragraph('1-2 jours', table_cell_center_style),
     Paragraph('Critique', table_cell_center_style)],
    [Paragraph('P1', table_cell_center_style),
     Paragraph('Journal d\'audit immutable + signature crypto', table_cell_style),
     Paragraph('5-7 jours', table_cell_center_style),
     Paragraph('Eleve', table_cell_center_style)],
    [Paragraph('P1', table_cell_center_style),
     Paragraph('Workflows d\'approbation multi-etales', table_cell_style),
     Paragraph('7-10 jours', table_cell_center_style),
     Paragraph('Eleve', table_cell_center_style)],
    [Paragraph('P1', table_cell_center_style),
     Paragraph('Execution validation IQ/OQ/PQ', table_cell_style),
     Paragraph('3-5 jours', table_cell_center_style),
     Paragraph('Eleve', table_cell_center_style)],
    [Paragraph('P2', table_cell_center_style),
     Paragraph('Systeme de notifications (WebSocket + email)', table_cell_style),
     Paragraph('7-10 jours', table_cell_center_style),
     Paragraph('Moyen', table_cell_center_style)],
    [Paragraph('P2', table_cell_center_style),
     Paragraph('Tableau de bord avance + analytics', table_cell_style),
     Paragraph('5-7 jours', table_cell_center_style),
     Paragraph('Moyen', table_cell_center_style)],
    [Paragraph('P2', table_cell_center_style),
     Paragraph('API publique (OpenAPI/Swagger)', table_cell_style),
     Paragraph('5-7 jours', table_cell_center_style),
     Paragraph('Moyen', table_cell_center_style)],
    [Paragraph('P3', table_cell_center_style),
     Paragraph('TypeScript strict mode', table_cell_style),
     Paragraph('5-7 jours', table_cell_center_style),
     Paragraph('Moyen', table_cell_center_style)],
    [Paragraph('P3', table_cell_center_style),
     Paragraph('Tests de performance + SSR', table_cell_style),
     Paragraph('5-7 jours', table_cell_center_style),
     Paragraph('Faible', table_cell_center_style)],
    [Paragraph('P3', table_cell_center_style),
     Paragraph('Audit accessibilite WCAG 2.1 AA', table_cell_style),
     Paragraph('3-5 jours', table_cell_center_style),
     Paragraph('Faible', table_cell_center_style)],
]
story.extend(make_table(roadmap_data, [CONTENT_W*0.10, CONTENT_W*0.45, CONTENT_W*0.20, CONTENT_W*0.25],
                        'Tableau 10 : Feuille de route de developpement'))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 8. RECOMMANDATIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.extend(add_major_section('8. Recommandations'))

story.append(add_heading('8.1 Actions immediares (semaine 1-2)', h2_style, level=1))
story.append(Paragraph(
    'La premiere action a entreprendre est la mise en place de l\'authentification complete avec NextAuth '
    'et Supabase Auth. Cela implique la creation d\'une page de connexion avec support des fournisseurs '
    'd\'identite (email/mot de passe, Google, Microsoft), une page de gestion de profil, un mecanisme de '
    'deconnexion, et la protection de toutes les routes applicatives par le middleware. En parallele, '
    'le deploiement sur une plateforme accessible (Vercel recommande pour Next.js) doit etre configure '
    'pour permettre les tests et demonstrations a distance.',
    body_style
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'Il est egalement recommande de creer un fichier .env.example documentant l\'ensemble des variables '
    'd\'environnement requises, afin de faciliter la configuration par de nouveaux developpeurs ou '
    'administrateurs systeme. Ce fichier doit inclure les cles Supabase, les secrets NextAuth, '
    'l\'URL de la base de donnees, et toute autre variable necessaire au fonctionnement du systeme.',
    body_style
))

story.append(add_heading('8.2 Actions a court terme (mois 1-2)', h2_style, level=1))
story.append(Paragraph(
    'Le renforcement du journal d\'audit avec signature cryptographique et verification d\'integrite est '
    'l\'etape suivante prioritaire pour atteindre la conformite 21 CFR Part 11. L\'implementation des '
    'workflows d\'approbation multi-etales avec notifications et escalades automatiques complementera '
    'cette conformite. L\'execution du protocole de validation IQ/OQ/PQ dans un environnement stable '
    'permettra de documenter formellement la conformite du systeme.',
    body_style
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'L\'extension de la couverture de tests aux composants React des 15 modules fonctionnels est '
    'egalement essentielle. Chaque vue de module devrait disposer au minimum de tests verifiant le '
    'rendu correct, les interactions utilisateur principales (creation, modification, suppression), '
    'et les cas limites (donnees manquantes, erreurs de validation). L\'objectif devrait etre d\'atteindre '
    'un minimum de 80% de couverture de code sur les composants critiques.',
    body_style
))

story.append(add_heading('8.3 Actions a moyen terme (mois 3-6)', h2_style, level=1))
story.append(Paragraph(
    'Le developpement des fonctionnalites avancees (notifications, tableau de bord analytics, API publique) '
    'constitue le troisieme palier de developpement. Ces enrichissements transformeront le systeme d\'un '
    'outil de gestion de la qualite basique en une plateforme collaborative et integrable, capable de '
    's\'inserer dans l\'ecosysteme numerique des entreprises pharmaceutiques et des dispositifs medicaux. '
    'L\'ajout de langues supplementaires (allemand, espagnol, japonais) elargira le marche potentiel '
    'au-dela de la zone EN/FR actuellement supportee.',
    body_style
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'Enfin, la migration vers un mode strict TypeScript et la realisation d\'un audit de performance '
    'et d\'accessibilite permettront d\'atteindre un niveau de qualite industrielle adapte au contexte '
    'reglementaire GxP. L\'automatisation du pipeline CI/CD avec des controles qualite automatiques '
    '(lint, tests, build, securite) garantira la maintenabilite a long terme du projet.',
    body_style
))

# Summary scoring table
scoring_data = [
    [Paragraph('<b>Dimension</b>', table_header_style),
     Paragraph('<b>Note / 10</b>', table_header_style),
     Paragraph('<b>Commentaire</b>', table_header_style)],
    [Paragraph('Couverture fonctionnelle', table_cell_style),
     Paragraph('<b>9.5</b>', table_cell_center_style),
     Paragraph('15/15 modules implementes, tous operationnels en mode demo', table_cell_style)],
    [Paragraph('Qualite du code', table_cell_style),
     Paragraph('<b>7.0</b>', table_cell_center_style),
     Paragraph('Bon structure generale, mais typage permissif et quelques fichiers trop longs', table_cell_style)],
    [Paragraph('Tests et validation', table_cell_style),
     Paragraph('<b>7.5</b>', table_cell_center_style),
     Paragraph('824 tests passants, mais couverture front-end insuffisante', table_cell_style)],
    [Paragraph('Architecture', table_cell_style),
     Paragraph('<b>8.0</b>', table_cell_center_style),
     Paragraph('Dual-mode eleguant, services bien structures, mais lacunes securite', table_cell_style)],
    [Paragraph('Securite et conformite', table_cell_style),
     Paragraph('<b>4.0</b>', table_cell_center_style),
     Paragraph('Fondations presentes mais auth absente, middleware incomplet', table_cell_style)],
    [Paragraph('Deployabilite', table_cell_style),
     Paragraph('<b>3.5</b>', table_cell_center_style),
     Paragraph('Build reussi mais pas d\'environnement de deploiement fonctionnel', table_cell_style)],
    [Paragraph('Documentation', table_cell_style),
     Paragraph('<b>6.5</b>', table_cell_center_style),
     Paragraph('Protocole de validation existe, mais manque de doc technique et API', table_cell_style)],
    [Paragraph('<b>NOTE GLOBALE</b>', table_cell_style),
     Paragraph('<b>6.6</b>', table_cell_center_style),
     Paragraph('<b>Base solide avec lacunes critiques sur securite et deploiement</b>', table_cell_style)],
]
story.extend(make_table(scoring_data, [CONTENT_W*0.25, CONTENT_W*0.12, CONTENT_W*0.63],
                        'Tableau 11 : Scoring global du projet'))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 9. CONCLUSION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.extend(add_major_section('9. Conclusion'))

story.append(Paragraph(
    'Le projet QMS SaaS Pro represente un effort de developpement considerable, avec 38 237 lignes de code '
    'couvrant 15 modules fonctionnels complets et 824 tests passants. La couverture fonctionnelle est '
    'excellente, l\'architecture est bien pensee avec le mecanisme dual-mode, et les fondations techniques '
    'pour la conformite reglementaire sont en place. Cependant, le projet se situe actuellement dans un '
    'etat de prototype avance plutot que de produit deployable.',
    body_style
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'Les deux obstacles majeurs au deploiement en production sont l\'absence d\'authentification fonctionnelle '
    'et l\'impossibilite de servir l\'application via une URL accessible. Ces lacunes sont critiques dans '
    'le contexte reglementaire GxP ou la tracabilite des acces et la securite des donnees sont des '
    'exigences incontournables. La resolution de ces problemes (estimee a 6-10 jours de developpement) '
    'transformerait le prototype en un systeme evaluable et potentiellement certifiable.',
    body_style
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'La feuille de route proposee s\'articule en 4 niveaux de priorite (P0 a P3) couvrant une periode '
    'de 6 mois. Les priorites P0 (authentification, deploiement) sont des prealables indispensables, '
    'les priorites P1 (conformite reglementaire) sont necessaires pour toute utilisation dans un contexte '
    'GxP, et les priorites P2/P3 (enrichissements fonctionnels et optimisations) apportent la valeur '
    'ajoutee competitive. Avec un investissement estime de 2-3 mois supplementaires, le projet peut '
    'atteindre un niveau de maturite suffisant pour une mise en production dans un environnement '
    'pharmaceutique ou dispositifs medicaux.',
    body_style
))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BUILD
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
doc.multiBuild(story)
print(f"Report generated: {OUTPUT_PATH}")

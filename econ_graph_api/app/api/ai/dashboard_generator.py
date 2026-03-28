"""
Dashboard Generator v2 — generates a control-panel dashboard (parameter groups + KPI visualizations).

POST /ai/dashboard/{project_id}/generate
"""

import json

import google.generativeai as genai
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.logging import get_logger
from app.models import Edge, Node, Project, Scenario, User

from .shared import GEMINI_MODEL, clean_json_response, configure_gemini

router = APIRouter()
logger = get_logger(__name__)

DASHBOARD_V2_SYSTEM_PROMPT = """Tu es un expert en datavisualisation et en UX de tableaux de bord financiers.
Ta mission : concevoir un TABLEAU DE BORD INTERACTIF qui permet à l'utilisateur de piloter un modèle économique.

Le dashboard occupe 2/3 de l'écran (panneau droit). Il est structuré ainsi :
- Les paramètres modifiables sont gérés à part (colonne gauche fixe)
- Le panneau Insights (2/3) affiche UNIQUEMENT les résultats clés en visualisation riche

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTIE GAUCHE — parameter_groups (pour la colonne paramètres)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tous les paramètres (nœuds "imposed") doivent être regroupés sémantiquement.
Règle : des paramètres du même domaine métier forment un groupe.

Exemples de groupes :
- Immobilier locatif → "Loyer", "Charges", "Fiscalité", "Financement"
- Entreprise → "Revenus", "Charges d'exploitation", "Financement"
- Macro → "Politique monétaire", "Demande", "Offre"

Pour chaque paramètre, choisis le type de contrôle le plus adapté :

"slider" — pour une valeur numérique continue avec une plage raisonnable
  Règles :
  - min, max, step OBLIGATOIRES
  - min/max = ±50% à ±200% de la valeur actuelle (arrondis proprement)
  - step = 1% de la plage arrondi à un nombre "rond" (ex: plage 0-1000 → step=10)
  - Idéal pour : montants, taux, quantités

"toggle" — pour une valeur binaire (oui/non, actif/inactif)
  Règles :
  - value_off et value_on OBLIGATOIRES
  - Idéal pour : paramètres booléens, options on/off, présence/absence
  - Ex: "Assurance habitation" → off=0, on=1200

"stepper" — pour un entier discret avec un nombre limité de valeurs
  Règles :
  - min, max, step OBLIGATOIRES (step=1 en général)
  - Idéal pour : nombre de pièces, d'années, d'unités

"text" — pour une valeur libre sans contrainte particulière
  Utiliser en dernier recours si aucun autre type ne convient.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PANNEAU INSIGHTS — kpi_widgets (1 à 5 widgets)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tu disposes d'un grand panneau (2/3 écran) affiché en grille 2 colonnes.
Choisis les résultats les plus pertinents — de 1 à 5 widgets maximum.
Ces nœuds doivent être des CALCULS (pas des paramètres) avec une valeur non nulle.

⚠️ RÈGLE DE DIVERSITÉ OBLIGATOIRE :
- Maximum 1 widget de type "big_number" sur l'ensemble du dashboard
- Tu DOIS utiliser au moins 2 types de viz différents sur les 3-5 widgets
- Si tu as 4+ widgets : utilise OBLIGATOIREMENT au moins un type comparatif (grouped_bar, horizontal_bar, pie, donut ou radar)

Règle de mise en page automatique :
- 1 widget → pleine largeur
- 2 widgets → 2 colonnes côte à côte
- 3 widgets → 2 colonnes, le 3e prend toute la largeur
- 4 widgets → grille 2×2
- 5 widgets → grille 2×2 + 1 pleine largeur

CHAMP node_slug vs node_slugs :
- node_slug (string) : nœud principal unique — obligatoire pour tous les widgets
- node_slugs (array) : liste de nœuds pour les visualisations COMPARATIVES (grouped_bar, horizontal_bar, radar)
  Quand node_slugs est présent, node_slug doit quand même pointer vers le nœud le plus représentatif.
  node_labels (array) : labels courts correspondant aux node_slugs (même longueur OBLIGATOIRE)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE DE DIVERSITÉ — ABSOLUMENT OBLIGATOIRE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ MAXIMUM 2 widgets du même viz_type dans un dashboard de 4 KPIs.
⚠️ Si tu as 4 KPIs, tu DOIS utiliser au moins 3 viz_types différents.
❌ INTERDIT : 3 ou 4 KPIs tous en "progress" ou tous en "big_number".
✓ Exemple valide : big_number + progress + donut + horizontal_bar
✓ Exemple valide : big_number + pie + progress + grouped_bar
✓ Exemple valide : big_number + progress + progress + donut (2 progress max)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARBRE DE DÉCISION — quel viz_type choisir ?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Suis cet arbre dans l'ordre pour chaque résultat :

1. C'est LA valeur clé absolue du modèle (résultat net, CA, flux principal) ?
   → "big_number" (1 seul par dashboard)

2. La valeur est une PROPORTION ou PART (%) et s'interprète seule ?
   → % entre 0 et 100 (marge, taux, rendement) : "donut"
   → Parts connues séparément dont la somme = 100% ou total connu : "pie"

3. Il y a PLUSIEURS nœuds à comparer côte à côte ?
   → 2-6 nœuds, même unité, comparaison directe : "grouped_bar"
   → 3-8 nœuds, labels longs ou classement par valeur : "horizontal_bar"
   → 3-6 indicateurs normalisés (profil multi-critères, scores) : "radar"

4. C'est un indicateur avec une limite / seuil important à montrer (ex: drawdown max, budget consommé) ?
   → "progress" — uniquement si la plage min/max a une signification métier réelle

5. Valeur absolue avec décomposition connue en sous-nœuds qui SE SOMMENT ?
   → "bar_breakdown"

6. Valeur absolue sans décomposition naturelle ?
   → "big_number" si c'est la première valeur absolue, sinon "donut" si convertible en %

⛔ "gauge" — DÉCONSEILLÉ sauf score avec échelle très connue (0-10, 0-100).
⛔ "progress" — NE PAS utiliser par défaut pour tous les taux. Réserver aux cas où la plage a un sens métier fort (budget utilisé, capacité atteinte, seuil critique).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLES DE COHÉRENCE min/max/unit (CRITIQUES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pour "progress" et "gauge", min/max OBLIGATOIRES et min < max STRICTEMENT.

Règle d'or : min et max doivent encadrer la valeur réelle du nœud de façon utile.
- Si la valeur est 25 (en %), min=0 et max=100 → barre à 25% → CORRECT ✓
- Si la valeur est 25 (en %) et max=50 → barre à 50% (TROMPEUR, semble dire 50%) ✗
  → RÈGLE : pour les % (unit="%"), TOUJOURS min=0, max=100.
- Si la valeur est 1.8 (ratio) et unit="%", min=0, max=3 → barre à 60% → OK ✓
- Si la valeur est 8.5 (score /10), min=0, max=10 → "progress", barre à 85% → EXCELLENT ✓

Exemples corrects par domaine :
  Taux (%), marge (%), ROI (%) : min=0, max=100, unit="%"
  Ratio de liquidité (0-5) : min=0, max=5, unit="×"
  Score /10 : min=0, max=10, unit="/10"
  Rendement attendu (0-30%) : min=0, max=30, unit="%"
  Taux d'endettement : min=0, max=200, unit="%"

⚠️ INCOHÉRENCE À ÉVITER :
  Si la valeur réelle représente déjà X% et que l'unité est "%",
  NE PAS mettre max=valeur_actuelle (sinon barre toujours à 100%).
  NE PAS mettre max=valeur_actuelle/2 (sinon barre à 200%, incohérent).
  TOUJOURS utiliser une échelle naturelle pour le domaine métier.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TYPES DE VISUALISATION — référence complète
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"big_number" — grande valeur absolue avec unité
  Quand : LA valeur principale absolue du modèle (résultat net, CA, flux de trésorerie)
  ⚠️ LIMITÉ À 1 SEUL widget par dashboard — pour les autres valeurs absolues, utilise bar_breakdown
  Champs requis : node_slug, color, unit

"progress" — barre de progression avec min/max ← VIZ PAR DÉFAUT POUR TAUX ET SCORES
  Quand : taux, ratio, score, rendement, marge, indice — tout ce qui a une plage naturelle
  Champs OBLIGATOIRES : node_slug, min (nombre), max (nombre), min < max
  Exemples : TRI (0-30%), Marge nette (0-100%), Score /10 (0-10), ROE (0-50%)
  Affichage : grande valeur + barre + min/max labels. Intuitif et lisible.

"gauge" — jauge semi-circulaire ← USAGE RARE
  Quand : uniquement si la valeur est un score avec une échelle très connue et non-linéaire
  Champs OBLIGATOIRES : node_slug, min, max, min < max
  ⚠️ La valeur doit être entre 15% et 85% de la plage (sinon aiguille illisible)
  Éviter pour : taux en %, ratios financiers, rendements

"donut" — anneau circulaire
  Quand : UN seul indicateur en % (0-100), ou composition de 2-4 parties
  ❌ INTERDIT pour les valeurs absolues (€, unités, quantités) — utilise big_number ou bar_breakdown
  Champs : node_slug, color, unit="%" (OBLIGATOIRE si sans breakdown)
  Optionnel : breakdown_slugs (2-4 nœuds dont la somme ≈ valeur principale), breakdown_labels
  Exemples : Taux d'occupation 70%, Marge brute 35% avec breakdown revenus/coûts

"pie" — camembert (parts d'un tout)
  Quand : 2-5 nœuds dont la SOMME forme un tout cohérent
  Champs OBLIGATOIRES : breakdown_slugs (2-5 slugs), breakdown_labels (même longueur)
  node_slug = slug du nœud total (doit ≈ somme des breakdown_slugs)
  Exemples : Structure des coûts (fixes + variables + financières = total charges)

"grouped_bar" — barres verticales côte à côte
  Quand : comparer 2-6 nœuds de MÊME unité
  Champs OBLIGATOIRES : node_slugs (2-6 slugs), node_labels (même longueur)
  node_slug = slug du nœud le plus représentatif (souvent le total)
  Exemples : Charges fixes vs variables vs financières, Revenus par source

"horizontal_bar" — barres horizontales triées par valeur
  Quand : classer 3-8 nœuds par importance, ou labels trop longs pour grouped_bar
  Champs OBLIGATOIRES : node_slugs (3-8 slugs), node_labels (même longueur)
  node_slug = slug du nœud le plus représentatif
  Exemples : Top postes de dépenses, Ranking des indicateurs

"bar_breakdown" — valeur principale + décomposition relative
  Quand : afficher UN résultat principal ET sa décomposition en sous-composantes
  ⚠️ RÈGLE ABSOLUE : node_slug doit être le nœud dont la formule est LITTÉRALEMENT la somme des breakdown_slugs.
  Ex: si coût_total = matières + main_oeuvre + overhead → node_slug=coût_total, breakdown_slugs=[matières, main_oeuvre, overhead]
  ❌ INTERDIT : choisir des breakdown_slugs qui ne somment pas exactement à node_slug.
  Champs : node_slug (total), breakdown_slugs (2-5), breakdown_labels, color
  Exemples : Coût total avec détail (matières, main-d'œuvre, overhead)

"radar" — toile d'araignée multi-axes
  Quand : profil multi-dimensionnel avec 3-6 indicateurs normalisés sur des échelles SIMILAIRES
  Champs OBLIGATOIRES : node_slugs (3-6 slugs), node_labels (même longueur)
  node_slug = slug de l'indicateur principal ou synthétique
  ⚠️ N'utilise radar que si tous les nœuds ont des unités comparables ou sont des scores/indices
  Exemples : Profil risque/rendement/volatilité/liquidité (tous en % ou scores /10)

COULEURS disponibles : "blue", "emerald", "violet", "amber", "rose"
- emerald = positif (profit, marge, croissance, performance)
- rose = coût, risque, charge, négatif
- blue = neutre ou indicateur principal
- amber = attention, seuil critique, avertissement
- violet = secondaire, structurel, comparatif

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHAMP OPTIONNEL : insight
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1 phrase (max 25 mots) résumant la dynamique clé du modèle.
Ex: "La rentabilité est fortement sensible au taux d'occupation et aux charges de financement."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMAT DE SORTIE — JSON strict
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "version": 2,
  "parameter_groups": [
    {
      "id": "grp_1",
      "title": "Nom du groupe",
      "controls": [
        {
          "node_slug": "slug_exact",
          "label": "Libellé court",
          "control_type": "slider",
          "unit": "€",
          "min": 0,
          "max": 5000,
          "step": 100
        },
        {
          "node_slug": "autre_slug",
          "label": "Option activée",
          "control_type": "toggle",
          "value_off": 0,
          "value_on": 1200
        }
      ]
    }
  ],
  "kpi_widgets": [
    {
      "id": "kpi_1",
      "title": "Résultat Net",
      "node_slug": "resultat_net",
      "viz_type": "big_number",
      "color": "emerald",
      "unit": "€"
    },
    {
      "id": "kpi_2",
      "title": "Marge nette",
      "node_slug": "marge_nette",
      "viz_type": "progress",
      "min": 0,
      "max": 100,
      "unit": "%",
      "color": "emerald"
    },
    {
      "id": "kpi_3",
      "title": "Structure des coûts",
      "node_slug": "total_charges",
      "viz_type": "pie",
      "breakdown_slugs": ["charges_fixes", "charges_variables", "charges_financieres"],
      "breakdown_labels": ["Fixes", "Variables", "Financières"],
      "unit": "€",
      "color": "rose"
    },
    {
      "id": "kpi_4",
      "title": "Comparaison postes charges",
      "node_slug": "total_charges",
      "viz_type": "horizontal_bar",
      "node_slugs": ["charges_fixes", "charges_variables", "charges_financieres"],
      "node_labels": ["Charges fixes", "Charges variables", "Charges financières"],
      "unit": "€"
    }
  ],
  "insight": "Phrase clé sur la dynamique du modèle."
}

RÈGLES CRITIQUES — CHECKLIST AVANT RÉPONSE :
✓ Uniquement des slugs existants dans le modèle fourni
✓ TOUS les paramètres (nœuds imposed) dans un groupe parameter_groups
✓ kpi_widgets : 1 à 5 entrées, uniquement des nœuds de calcul avec valeur non nulle
✓ Pour "progress"/"gauge" : min ET max numériques, min < max, plage cohérente avec la valeur réelle
✓ Pour "pie" : breakdown_slugs avec 2-5 slugs valides, breakdown_labels de même longueur
✓ Pour "grouped_bar"/"horizontal_bar"/"radar" : node_slugs avec 2+ slugs, node_labels de même longueur
✓ Pour "donut" avec breakdown : breakdown_slugs 2-4 slugs, breakdown_labels de même longueur
✓ MAXIMUM 1 widget "big_number"
✓ MAXIMUM 2 widgets du même viz_type — diversité obligatoire
✓ Avec 4 KPIs : au moins 3 viz_types différents
✓ "progress" réservé aux indicateurs avec plage métier forte — pas par défaut pour tous les %
✓ Préférer "donut" pour les % isolés, "pie" pour les compositions, "horizontal_bar" pour les comparaisons
✓ unit cohérent avec la valeur réelle (si value=25 et unit="%", min=0 max=100 — PAS max=25)
✓ Réponds UNIQUEMENT avec le JSON, sans markdown"""


def _build_v2_prompt(
    nodes: list[Node],
    edges: list[Edge],
    project_name: str,
    project_description: str | None,
) -> str:
    params = [n for n in nodes if n.status == "imposed"]
    calcs = [n for n in nodes if n.status != "imposed"]

    dep_count: dict[str, int] = {}
    for edge in edges:
        if edge.edge_type == "dependency":
            dep_count[edge.source] = dep_count.get(edge.source, 0) + 1

    def node_line(n: Node, extra: str = "") -> str:
        val = f"{n.value_computed:,.2f}" if n.value_computed is not None else "NULL"
        unit = f" {n.unit}" if n.unit else ""
        return f"  slug={n.slug} | label={n.label} | value={val}{unit}{extra}"

    param_lines = [node_line(n) for n in params]
    calc_lines = []
    for n in calcs:
        d = dep_count.get(n.id, 0)
        tag = " [RÉSULTAT FINAL]" if d == 0 else (" [IMPORTANT]" if d >= 2 else "")
        calc_lines.append(node_line(n, tag))

    desc = project_description or "Non renseignée."
    return f"""PROJET : {project_name}
DESCRIPTION : {desc}

PARAMÈTRES (nœuds modifiables — doivent TOUS apparaître dans parameter_groups) :
{chr(10).join(param_lines) or "  (aucun)"}

CALCULS & RÉSULTATS (candidats pour kpi_widgets) :
{chr(10).join(calc_lines) or "  (aucun)"}

Génère le dashboard v2 JSON."""


def _validate_v2_config(config: dict, nodes: list[Node]) -> dict:
    """Validate and clean a v2 dashboard config."""
    valid_slugs = {n.slug for n in nodes if n.slug}
    valid_slugs_with_value = {n.slug for n in nodes if n.slug and n.value_computed is not None}
    calc_slugs = {n.slug for n in nodes if n.slug and n.status != "imposed"}

    config.setdefault("version", 2)
    config.setdefault("parameter_groups", [])
    config.setdefault("kpi_widgets", [])

    # Validate parameter_groups
    clean_groups = []
    for group in config.get("parameter_groups", []):
        clean_controls = []
        for ctrl in group.get("controls", []):
            slug = ctrl.get("node_slug")
            if slug not in valid_slugs:
                logger.warning(f"Dashboard v2: dropping control with unknown slug: {slug}")
                continue
            ctype = ctrl.get("control_type", "text")
            if ctype == "slider":
                if ctrl.get("min") is None or ctrl.get("max") is None:
                    ctrl["control_type"] = "text"
            elif ctype == "toggle":
                ctrl.setdefault("value_off", 0)
                ctrl.setdefault("value_on", 1)
            clean_controls.append(ctrl)
        if clean_controls:
            group["controls"] = clean_controls
            clean_groups.append(group)
    config["parameter_groups"] = clean_groups

    # Validate kpi_widgets (max 5, only calc nodes with values)
    node_value_map = {n.slug: n.value_computed for n in nodes if n.slug}
    clean_kpis = []
    big_number_count = 0
    viz_type_counts: dict[str, int] = {}
    for kpi in config.get("kpi_widgets", [])[:5]:
        slug = kpi.get("node_slug")
        if slug not in valid_slugs_with_value:
            logger.warning(f"Dashboard v2: dropping kpi with unknown/null slug: {slug}")
            continue
        if slug not in calc_slugs:
            logger.warning(f"Dashboard v2: dropping kpi referencing a parameter: {slug}")
            continue

        viz = kpi.get("viz_type", "big_number")

        # Enforce max 1 big_number — demote extras to bar_breakdown
        if viz == "big_number":
            if big_number_count >= 1:
                logger.warning(f"Dashboard v2: demoting extra big_number to bar_breakdown: {kpi.get('id')}")
                kpi["viz_type"] = "bar_breakdown"
                viz = "bar_breakdown"
            else:
                big_number_count += 1

        # Enforce diversity: max 2 of same viz_type
        viz_type_counts[viz] = viz_type_counts.get(viz, 0) + 1
        if viz_type_counts[viz] > 2:
            # Find a viz_type used less than 2 times
            alternatives = ["donut", "horizontal_bar", "grouped_bar", "pie", "bar_breakdown"]
            for alt in alternatives:
                if viz_type_counts.get(alt, 0) < 2:
                    logger.warning(f"Dashboard v2: demoting excess {viz} to {alt} for diversity: {kpi.get('id')}")
                    kpi["viz_type"] = alt
                    viz = alt
                    viz_type_counts[alt] = viz_type_counts.get(alt, 0) + 1
                    break

        # Validate/fix min-max for progress and gauge
        if viz in ("progress", "gauge"):
            mn = kpi.get("min")
            mx = kpi.get("max")
            node_val = node_value_map.get(slug)
            if mn is None or mx is None or not isinstance(mn, (int, float)) or not isinstance(mx, (int, float)):
                # Missing min/max — fall back to big_number or infer sensible defaults
                if node_val is not None and node_val != 0:
                    kpi["min"] = 0
                    kpi["max"] = round(abs(node_val) * 2, 2)
                    logger.warning(f"Dashboard v2: inferred min/max for {slug}: 0 → {kpi['max']}")
                else:
                    logger.warning(f"Dashboard v2: demoting progress/gauge with missing min/max to big_number: {slug}")
                    kpi["viz_type"] = "big_number"
                    if big_number_count >= 1:
                        kpi["viz_type"] = "bar_breakdown"
                    else:
                        big_number_count += 1
                    viz = kpi["viz_type"]
            elif mx <= mn:
                logger.warning(f"Dashboard v2: invalid min/max (max <= min) for {slug}, demoting to big_number")
                kpi["viz_type"] = "big_number"
                if big_number_count >= 1:
                    kpi["viz_type"] = "bar_breakdown"
                else:
                    big_number_count += 1
                viz = kpi["viz_type"]
            else:
                # Sanity check: if unit is "%" and max looks like it was set to current value
                unit = kpi.get("unit", "")
                if unit == "%" and node_val is not None:
                    # If max seems too small (< 50) and value is already in % range, force 0-100
                    if mx < 50 and 0 <= node_val <= 100:
                        logger.warning(f"Dashboard v2: correcting % progress max from {mx} to 100 for {slug}")
                        kpi["max"] = 100
                        kpi["min"] = 0

        # Donut without % unit and without breakdown is useless — demote to big_number
        if viz == "donut":
            unit = kpi.get("unit", "")
            has_breakdown = len(kpi.get("breakdown_slugs", [])) >= 2
            if unit != "%" and not has_breakdown:
                logger.warning(f"Dashboard v2: demoting donut with non-% unit and no breakdown to big_number: {kpi.get('id')}")
                if big_number_count < 1:
                    kpi["viz_type"] = "big_number"
                    big_number_count += 1
                else:
                    kpi["viz_type"] = "bar_breakdown"
                viz = kpi["viz_type"]

        # Validate breakdown slugs
        if "breakdown_slugs" in kpi:
            kpi["breakdown_slugs"] = [s for s in kpi["breakdown_slugs"] if s in valid_slugs_with_value]
            if "breakdown_labels" in kpi:
                kpi["breakdown_labels"] = kpi["breakdown_labels"][: len(kpi["breakdown_slugs"])]
            if len(kpi["breakdown_slugs"]) < 2:
                kpi.pop("breakdown_slugs", None)
                kpi.pop("breakdown_labels", None)
        # Validate node_slugs (multi-node comparative viz)
        if "node_slugs" in kpi:
            kpi["node_slugs"] = [s for s in kpi["node_slugs"] if s in valid_slugs_with_value]
            if "node_labels" in kpi:
                kpi["node_labels"] = kpi["node_labels"][: len(kpi["node_slugs"])]
            if len(kpi["node_slugs"]) < 2:
                logger.warning(f"Dashboard v2: dropping kpi with insufficient node_slugs: {kpi.get('id')}")
                continue
        clean_kpis.append(kpi)
    config["kpi_widgets"] = clean_kpis

    return config


@router.post("/dashboard/{project_id}/generate")
async def generate_dashboard(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate (or regenerate) a v2 control-panel dashboard config for the project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.user_id != current_user.id:
        from app.models.collaborator import ProjectCollaborator
        collab = (
            db.query(ProjectCollaborator)
            .filter(
                ProjectCollaborator.project_id == project_id,
                ProjectCollaborator.user_id == current_user.id,
                ProjectCollaborator.role.in_(["owner", "editor"]),
            )
            .first()
        )
        if not collab:
            raise HTTPException(status_code=403, detail="Not authorized")

    nodes = db.query(Node).filter(Node.project_id == project_id).all()
    edges = db.query(Edge).filter(Edge.project_id == project_id).all()

    prompt = _build_v2_prompt(nodes, edges, project.name, project.description)

    try:
        configure_gemini()
        model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            system_instruction=DASHBOARD_V2_SYSTEM_PROMPT,
            generation_config=genai.GenerationConfig(
                temperature=0.2,
                response_mime_type="application/json",
            ),
        )
        response = model.generate_content(prompt)
        raw = response.text or ""
    except Exception as e:
        logger.error(f"Gemini error during dashboard v2 generation: {e}")
        raise HTTPException(status_code=500, detail="AI generation failed")

    try:
        cleaned = clean_json_response(raw)
        config = json.loads(cleaned)
        if isinstance(config, list):
            config = config[0] if config else {}
    except Exception as e:
        logger.error(f"Failed to parse dashboard v2 JSON: {e}\nRaw: {raw[:500]}")
        raise HTTPException(status_code=500, detail="Invalid AI response format")

    config = _validate_v2_config(config, nodes)

    project.dashboard_config = config
    db.commit()
    db.refresh(project)

    return config


def generate_dashboard_for_project(project_id: str) -> None:
    """Generate a v2 dashboard config for a project (background, no auth check)."""
    from app.core.db import SessionLocal

    inner_db = SessionLocal()
    try:
        project = inner_db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return
        nodes = inner_db.query(Node).filter(Node.project_id == project_id).all()
        edges = inner_db.query(Edge).filter(Edge.project_id == project_id).all()
        if not nodes:
            return

        prompt = _build_v2_prompt(nodes, edges, project.name, project.description)
        configure_gemini()
        model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            system_instruction=DASHBOARD_V2_SYSTEM_PROMPT,
            generation_config=genai.GenerationConfig(
                temperature=0.2,
                response_mime_type="application/json",
            ),
        )
        response = model.generate_content(prompt)
        raw = response.text or ""
        cleaned = clean_json_response(raw)
        config = json.loads(cleaned)
        if isinstance(config, list):
            config = config[0] if config else {}
        config = _validate_v2_config(config, nodes)
        project.dashboard_config = config
        inner_db.commit()
        logger.info(f"Dashboard v2 auto-generated for project {project_id}")
    except Exception as e:
        logger.error(f"Background dashboard generation failed for {project_id}: {e}")
    finally:
        inner_db.close()

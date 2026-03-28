import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Optional
from dataclasses import dataclass

from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.core.config import settings
from app.core.db import SessionLocal
from app.logic import evaluate_rules
from app.models import Node, Edge, Scenario
from app.models.project_notification import ProjectNotification
from app.services.ai_suggestions import get_suggestions_for_project, format_suggestion_for_api

logger = logging.getLogger(__name__)

@dataclass(frozen=True)
class NotificationPolicy:
    dedup_hours: int
    cooldown_hours: int
    expiry_hours: int
    weights: tuple[float, float, float]
    category: str


_POLICY_BY_TYPE: dict[str, NotificationPolicy] = {
    "alert": NotificationPolicy(dedup_hours=24, cooldown_hours=0, expiry_hours=168, weights=(0.4, 0.4, 0.2), category="important"),
    "suggestion": NotificationPolicy(dedup_hours=72, cooldown_hours=24, expiry_hours=72, weights=(0.5, 0.3, 0.2), category="advice"),
    "insight": NotificationPolicy(dedup_hours=24, cooldown_hours=12, expiry_hours=48, weights=(0.4, 0.3, 0.3), category="advice"),
}

_RULE_THEME_OBJECTIVE: dict[str, tuple[str, str]] = {
    "missing_critical_data": ("data", "complete"),
    "status_consistency": ("consistency", "fix"),
    "plausible_bounds": ("consistency", "fix"),
    "confidence_bounds": ("consistency", "fix"),
    "fisher_identity": ("rates", "check"),
    "taylor_rule": ("rates", "check"),
    "uncovered_interest_parity": ("rates", "check"),
    "discount_monotonicity": ("rates", "check"),
    "forward_rate_positive": ("rates", "check"),
    "yield_curve_normal": ("rates", "check"),
}


def _fingerprint(source: str, notif_type: str, title: str, body: str | None) -> str:
    raw = f"{source}:{notif_type}:{title}:{body or ''}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _policy_for_type(notif_type: str) -> NotificationPolicy:
    return _POLICY_BY_TYPE.get(notif_type, NotificationPolicy(dedup_hours=24, cooldown_hours=12, expiry_hours=72, weights=(0.4, 0.3, 0.3), category="info"))


def _resolve_theme_objective(source: str, notif_type: str, payload: Optional[dict[str, Any]]) -> tuple[str, str]:
    if source == "rules":
        rule_id = (payload or {}).get("rule_id")
        if rule_id and rule_id in _RULE_THEME_OBJECTIVE:
            return _RULE_THEME_OBJECTIVE[rule_id]
        return ("consistency", "review")

    if source == "suggestions":
        suggestion_id = (payload or {}).get("id")
        suggestion_type = (payload or {}).get("type")
        if suggestion_id == "scenario_pessimistic":
            return ("scenario", "stress_test")
        if suggestion_id == "scenario_optimistic":
            return ("scenario", "growth")
        if suggestion_type == "add_safety_margin" or (suggestion_id or "").startswith("buffer_"):
            return ("risk", "buffer")
        return ("improvement", "optimize")

    if source == "ai":
        return ("strategy", "optimize")

    if notif_type == "alert":
        return ("consistency", "review")

    return ("general", "review")


def _make_group_key(theme: str, objective: str, now: datetime) -> str | None:
    if not theme or not objective:
        return None
    iso = now.isocalendar()
    bucket = f"{iso.year}-W{iso.week:02d}"
    return f"{theme}:{objective}:{bucket}"


def _make_dedup_key(
    source: str,
    notif_type: str,
    fingerprint: str,
    payload: Optional[dict[str, Any]],
) -> str:
    if source == "rules":
        rule_id = (payload or {}).get("rule_id")
        if rule_id:
            return f"rules:{rule_id}"
    if source == "suggestions":
        suggestion_id = (payload or {}).get("id")
        if suggestion_id:
            return f"suggestion:{suggestion_id}"
    if source == "ai":
        return f"ai:{fingerprint}"
    return f"{source}:{notif_type}:{fingerprint}"


def _recent_duplicate(
    db: Session,
    project_id: str,
    dedup_key: str,
    hours: int,
) -> Optional[ProjectNotification]:
    since = datetime.utcnow() - timedelta(hours=hours)
    return (
        db.query(ProjectNotification)
        .filter(ProjectNotification.project_id == project_id)
        .filter(ProjectNotification.dedup_key == dedup_key)
        .filter(ProjectNotification.created_at >= since)
        .order_by(ProjectNotification.created_at.desc())
        .first()
    )


def _cooldown_active(
    db: Session,
    project_id: str,
    theme: str,
    objective: str,
    hours: int,
) -> bool:
    if hours <= 0:
        return False
    since = datetime.utcnow() - timedelta(hours=hours)
    return (
        db.query(ProjectNotification)
        .filter(ProjectNotification.project_id == project_id)
        .filter(ProjectNotification.theme == theme)
        .filter(ProjectNotification.objective == objective)
        .filter(ProjectNotification.created_at >= since)
        .first()
        is not None
    )


def _impact_score(notif_type: str, payload: Optional[dict[str, Any]]) -> float:
    if notif_type == "alert":
        severity = (payload or {}).get("severity", 3)
        return max(0.2, min(1.0, float(severity) / 5.0))
    if notif_type == "suggestion":
        priority = str((payload or {}).get("priority", "")).lower()
        return {"high": 0.9, "medium": 0.6, "low": 0.3}.get(priority, 0.5)
    return 0.6


def _relevance_score(notif_type: str) -> float:
    if notif_type == "alert":
        return 0.85
    if notif_type == "suggestion":
        return 0.65
    return 0.6


def _compute_score(
    policy: NotificationPolicy,
    relevance: float,
    impact: float,
    freshness: float,
) -> float:
    w1, w2, w3 = policy.weights
    score = (w1 * relevance) + (w2 * impact) + (w3 * freshness)
    return round(score * 3.0, 3)


def _create_notification(
    db: Session,
    project_id: str,
    user_id: str,
    source: str,
    notif_type: str,
    title: str,
    body: Optional[str],
    priority: int,
    payload: Optional[dict[str, Any]] = None,
) -> Optional[ProjectNotification]:
    now = datetime.utcnow()
    policy = _policy_for_type(notif_type)
    theme, objective = _resolve_theme_objective(source, notif_type, payload)
    if _cooldown_active(db, project_id, theme, objective, policy.cooldown_hours):
        return None

    fp = _fingerprint(source, notif_type, title, body)
    dedup_key = _make_dedup_key(source, notif_type, fp, payload)
    if dedup_key:
        dup = _recent_duplicate(db, project_id, dedup_key, policy.dedup_hours)
        if dup:
            dup.aggregate_count = (dup.aggregate_count or 1) + 1
            dup.last_event_at = now
            if policy.expiry_hours > 0:
                dup.expires_at = max(dup.expires_at or now, now + timedelta(hours=policy.expiry_hours))
            impact = _impact_score(notif_type, payload)
            relevance = _relevance_score(notif_type)
            dup.score = _compute_score(policy, relevance, impact, freshness=1.0)
            return None

    impact = _impact_score(notif_type, payload)
    relevance = _relevance_score(notif_type)
    score = _compute_score(policy, relevance, impact, freshness=1.0)
    expires_at = now + timedelta(hours=policy.expiry_hours) if policy.expiry_hours > 0 else None
    group_key = _make_group_key(theme, objective, now)

    notif = ProjectNotification(
        project_id=project_id,
        user_id=user_id,
        source=source,
        type=notif_type,
        title=title,
        body=body,
        priority=priority,
        payload=payload,
        fingerprint=fp,
        theme=theme,
        objective=objective,
        dedup_key=dedup_key,
        group_key=group_key,
        score=score,
        aggregate_count=1,
        last_event_at=now,
        expires_at=expires_at,
        created_at=now,
    )
    db.add(notif)
    return notif


def _build_ai_summary(
    db: Session,
    project_id: str,
    user_id: str,
    use_ai: bool = True,
) -> Optional[dict[str, Any]]:
    if not use_ai or not settings.GOOGLE_GENERATIVE_AI_API_KEY:
        return None

    try:
        from app.api.ai.shared import configure_gemini, GEMINI_MODEL, clean_json_response
        import google.generativeai as genai
        from app.services.ai_usage import log_ai_usage, extract_usage_from_gemini_response

        nodes = db.query(Node).filter(Node.project_id == project_id).all()
        edges = db.query(Edge).filter(Edge.project_id == project_id).all()
        scenarios = db.query(Scenario).filter(Scenario.project_id == project_id).all()

        if not nodes:
            return None

        sample_nodes = []
        for n in nodes[:30]:
            sample_nodes.append({
                "id": n.id,
                "label": n.label,
                "slug": n.slug,
                "type": n.status,
                "value": n.value_computed,
                "has_formula": bool(n.computation_definition),
            })

        # Build concise node context: label, value, type
        param_nodes = [n for n in sample_nodes if not n.get("has_formula")]
        calc_nodes = [n for n in sample_nodes if n.get("has_formula")]
        result_node = calc_nodes[-1] if calc_nodes else None
        result_label = result_node["label"] if result_node else None
        result_value = result_node["value"] if result_node else None

        prompt = f"""
Tu es un conseiller business qui analyse le modèle financier d'un entrepreneur.

Modèle: {len(nodes)} variables, {len(scenarios)} scénarios.
Paramètres clés: {json.dumps([{{"label": n["label"], "valeur": n["value"]}} for n in param_nodes[:8]], ensure_ascii=False)}
Résultat principal: {result_label} = {result_value}

Ta mission: identifier UNE opportunité concrète et percutante pour cet entrepreneur.

Règles IMPÉRATIVES:
- Le titre doit être court (4 à 7 mots), accrocheur, orienté résultat concret (ex: "3 leviers pour doubler votre marge", "Simulez votre seuil de rentabilité", "Votre marge résiste-t-elle à une crise ?")
- Le corps: 1 seule phrase d'impact, avec chiffres concrets si possible
- action_prompt:
  * SEULEMENT si l'opportunité suggère une modification concrète du modèle (créer un scénario, modifier un paramètre)
  * Exemples AVEC action_prompt: "Testez un scénario de crise", "Simulez votre seuil de rentabilité", "Analysez ce levier"
  * Exemples SANS action_prompt (null): "Identifiez vos paramètres clés", "Analysez l'impact de X", "Comprendre votre structure de coûts"
  * Si pas d'action concrète: mettre null
- JAMAIS de jargon technique ("décomposer", "Fisher", "sensibilité", "analyse de sensibilité", "formule", "nœud", "arête")
- Toujours orienté impact business (marge, résultat, croissance, rentabilité, risque)

Réponds en JSON:
{{
  "title": "Titre court et percutant",
  "body": "Une phrase d'impact avec chiffres concrets si possible.",
  "action_prompt": "Instruction précise pour l'IA afin d'exécuter l'action, ou null si insight informatif uniquement"
}}
"""

        configure_gemini()
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.4,
                response_mime_type="application/json",
            ),
        )
        text = clean_json_response(response.text)
        data = json.loads(text)

        # Gemini sometimes wraps the object in a list — unwrap it
        if isinstance(data, list):
            data = data[0] if data else None
        if not isinstance(data, dict):
            return None

        # log usage if available
        try:
            prompt_tokens, completion_tokens = extract_usage_from_gemini_response(response)
            if prompt_tokens or completion_tokens:
                log_ai_usage(
                    db,
                    user_id=user_id,
                    operation_type="project_insight",
                    model_name=GEMINI_MODEL,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                )
        except Exception:
            pass

        return data
    except Exception as e:
        logger.warning("AI insight generation failed", error=str(e))
        return None


def generate_project_notifications(
    db: Session,
    project_id: str,
    user_id: str,
    max_notifications: int = 5,
    use_ai: bool = True,
) -> list[ProjectNotification]:
    created: list[ProjectNotification] = []

    now = datetime.utcnow()
    stale_cutoff = now - timedelta(days=30)
    active_unread = (
        db.query(ProjectNotification)
        .filter(ProjectNotification.project_id == project_id)
        .filter(ProjectNotification.read_at.is_(None))
        .filter(ProjectNotification.archived_at.is_(None))
        .filter(
            or_(
                ProjectNotification.expires_at > now,
                and_(ProjectNotification.expires_at.is_(None), ProjectNotification.created_at >= stale_cutoff),
            )
        )
        .count()
    )
    if active_unread >= max_notifications:
        return created

    nodes = db.query(Node).filter(Node.project_id == project_id).all()
    if not nodes:
        return created

    # AI strategic insight (highest priority — shown first)
    if len(created) < max_notifications:
        ai_payload = _build_ai_summary(db, project_id, user_id, use_ai=use_ai)
        if ai_payload:
            title = ai_payload.get("title") or "Réflexion IA"
            body = ai_payload.get("body")
            notif = _create_notification(
                db,
                project_id=project_id,
                user_id=user_id,
                source="ai",
                notif_type="insight",
                title=title,
                body=body,
                priority=4,
                payload=ai_payload,
            )
            if notif:
                created.append(notif)

    # Rule-based alerts (only surfaced if relevant to the model)
    _RULE_TITLES = {
        "missing_critical_data": "Des variables importantes n'ont pas de valeur",
        "status_consistency": "Certaines variables semblent incohérentes",
        "plausible_bounds": "Une valeur semble hors limites raisonnables",
        "confidence_bounds": "Un niveau de confiance est invalide",
        "fisher_identity": "Cohérence taux nominal / réel à vérifier",
        "taylor_rule": "Règle de politique monétaire non respectée",
        "uncovered_interest_parity": "Parité des taux d'intérêt non vérifiée",
        "discount_monotonicity": "Incohérence dans la courbe de taux",
        "forward_rate_positive": "Un taux forward est négatif",
        "yield_curve_normal": "Courbe des taux inversée",
    }

    _RULE_ACTION_PROMPTS = {
        "missing_critical_data": "Analyse le modèle et aide-moi à renseigner les variables manquantes. Quelles données critiques manquent et comment puis-je les compléter?",
        "status_consistency": "Analyse les incohérences dans le modèle et propose des corrections pour assurer la cohérence entre les variables.",
        "plausible_bounds": "Identifie les valeurs qui semblent anormales et propose un diagnostic ou une correction.",
        "confidence_bounds": "Corrige les niveaux de confiance invalides dans le modèle.",
        "fisher_identity": "Analyse la relation entre taux nominal et réel pour assurer la cohérence de la parité de Fisher.",
        "taylor_rule": "Analyse la politique monétaire et propose un ajustement des taux pour respecter la règle de Taylor.",
        "uncovered_interest_parity": "Analyse la parité des taux d'intérêt et propose des corrections.",
        "discount_monotonicity": "Corrige les incohérences dans la courbe de taux pour assurer une décroissance monotone.",
        "forward_rate_positive": "Identifie le taux forward négatif et propose une correction.",
        "yield_curve_normal": "Analyse l'inversion de la courbe des taux et propose des ajustements.",
    }

    alerts = evaluate_rules(nodes)
    # Rule types to skip surfacing as notifications (still checked, just not displayed)
    _RULES_SKIP_NOTIFICATION = {"missing_critical_data"}

    for alert in alerts:
        if len(created) >= max_notifications:
            break
        rule_id = getattr(alert, "rule_id", "")

        # Skip rules that shouldn't be surfaced as notifications
        if rule_id in _RULES_SKIP_NOTIFICATION:
            continue

        severity = int(getattr(alert, "severity", 2))
        title = _RULE_TITLES.get(rule_id, "Incohérence détectée dans le modèle")
        body = getattr(alert, "message", None)
        payload = {
            "rule_id": getattr(alert, "rule_id", None),
            "severity": severity,
            "node_ids": getattr(alert, "node_ids", []),
            "suggestion": getattr(alert, "suggestion", None),
            "action_prompt": _RULE_ACTION_PROMPTS.get(rule_id, "Analyse ce problème et propose des corrections."),
        }
        notif = _create_notification(
            db,
            project_id=project_id,
            user_id=user_id,
            source="rules",
            notif_type="alert",
            title=title,
            body=body,
            priority=max(1, 6 - severity),
            payload=payload,
        )
        if notif:
            created.append(notif)

    # Heuristic suggestions
    try:
        suggestions = get_suggestions_for_project(db, project_id, max_suggestions=3)
        for s in suggestions:
            if len(created) >= max_notifications:
                break
            data = format_suggestion_for_api(s)
            priority_map = {"high": 4, "medium": 3, "low": 2}
            suggestion_priority = priority_map.get(str(data.get("priority", "")).lower(), 2)
            notif = _create_notification(
                db,
                project_id=project_id,
                user_id=user_id,
                source="suggestions",
                notif_type="suggestion",
                title=data.get("title", "Suggestion d'amélioration"),
                body=data.get("description"),
                priority=suggestion_priority,
                payload=data,
            )
            if notif:
                created.append(notif)
    except Exception as e:
        logger.warning("Suggestions generation failed", error=str(e))

    return created[:max_notifications]


def run_insights_task(project_id: str, user_id: str, use_ai: bool = True) -> None:
    db = SessionLocal()
    try:
        generate_project_notifications(
            db,
            project_id=project_id,
            user_id=user_id,
            max_notifications=settings.INSIGHTS_MAX_PER_PROJECT,
            use_ai=use_ai,
        )
        db.commit()
    except Exception as e:
        logger.warning("run_insights_task failed", project_id=project_id, error=str(e))
        db.rollback()
    finally:
        db.close()

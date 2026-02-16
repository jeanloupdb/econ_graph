import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import SessionLocal
from app.logic import evaluate_rules
from app.models import Node, Edge, Scenario
from app.models.project_notification import ProjectNotification
from app.services.ai_suggestions import get_suggestions_for_project, format_suggestion_for_api

logger = logging.getLogger(__name__)


def _fingerprint(source: str, notif_type: str, title: str, body: str | None) -> str:
    raw = f"{source}:{notif_type}:{title}:{body or ''}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _recent_fingerprint_exists(db: Session, project_id: str, fp: str, hours: int = 24) -> bool:
    since = datetime.utcnow() - timedelta(hours=hours)
    return (
        db.query(ProjectNotification)
        .filter(ProjectNotification.project_id == project_id)
        .filter(ProjectNotification.fingerprint == fp)
        .filter(ProjectNotification.created_at >= since)
        .first()
        is not None
    )


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
    dedup_hours: int = 24,
) -> Optional[ProjectNotification]:
    fp = _fingerprint(source, notif_type, title, body)
    if _recent_fingerprint_exists(db, project_id, fp, hours=dedup_hours):
        return None

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
        created_at=datetime.utcnow(),
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

        prompt = f"""
Tu es un analyste expert qui examine un modèle de graph économique.
Objectif: proposer UNE réflexion stratégique et éventuellement un mini-quiz d'amélioration.

Contexte du modèle:
- nombre de nœuds: {len(nodes)}
- nombre d'arêtes: {len(edges)}
- scénarios: {len(scenarios)}
- exemples de nœuds: {json.dumps(sample_nodes, ensure_ascii=False)[:4000]}

Contraintes:
- Réponds en JSON.
- Ne propose qu'UNE notification principale.
- Sois concis, actionnable et orienté amélioration du modèle.
- Si tu proposes un quiz, 3 à 5 options maximum.

Format JSON attendu:
{{
  "title": "Titre court",
  "body": "Message court (1-3 phrases).",
  "quiz": {{
    "question": "Question courte",
    "options": ["Option A", "Option B", "Option C"]
  }}
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

    nodes = db.query(Node).filter(Node.project_id == project_id).all()
    if not nodes:
        return created

    # Rule-based alerts
    alerts = evaluate_rules(nodes)
    for alert in alerts[: max_notifications]:
        severity = int(getattr(alert, "severity", 2))
        title = f"Alerte: {getattr(alert, 'rule_id', 'cohérence')}"
        body = getattr(alert, "message", None)
        payload = {
            "rule_id": getattr(alert, "rule_id", None),
            "severity": severity,
            "node_ids": getattr(alert, "node_ids", []),
            "suggestion": getattr(alert, "suggestion", None),
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
            data = format_suggestion_for_api(s)
            notif = _create_notification(
                db,
                project_id=project_id,
                user_id=user_id,
                source="suggestions",
                notif_type="suggestion",
                title=data.get("title", "Suggestion d'amélioration"),
                body=data.get("description"),
                priority=2,
                payload=data,
            )
            if notif:
                created.append(notif)
    except Exception as e:
        logger.warning("Suggestions generation failed", error=str(e))

    # AI strategic insight
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
            priority=1,
            payload=ai_payload,
            dedup_hours=12,
        )
        if notif:
            created.append(notif)

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

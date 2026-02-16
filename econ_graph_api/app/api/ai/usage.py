"""
AI Usage statistics endpoint.

Endpoint:
- GET /usage: Get AI usage statistics for the current user
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.core.deps import get_current_user
from app.core.db import get_db
from app.models import User

router = APIRouter()


# ==================== RESPONSE MODELS ====================

class DailyUsage(BaseModel):
    date: str
    requests: int
    prompt_tokens: int
    completion_tokens: int
    cost_eur: float


class MonthlyUsage(BaseModel):
    month: str
    requests: int
    prompt_tokens: int
    completion_tokens: int
    cost_eur: float


class AIUsageResponse(BaseModel):
    total_requests: int
    total_prompt_tokens: int
    total_completion_tokens: int
    estimated_cost_eur: float
    daily_usage: list[DailyUsage]
    monthly_usage: list[MonthlyUsage]


# ==================== ENDPOINT ====================

@router.get("/usage", response_model=AIUsageResponse)
async def get_ai_usage(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get AI usage statistics for the current user.
    Returns total usage, daily breakdown (last 30 days), and monthly breakdown (last 12 months).
    """
    from sqlalchemy import func, extract
    from app.models.ai_usage import AIUsage
    from app.services.ai_usage import calculate_cost_eur
    
    # Get total usage
    totals = db.query(
        func.count(AIUsage.id).label("total_requests"),
        func.coalesce(func.sum(AIUsage.prompt_tokens), 0).label("total_prompt_tokens"),
        func.coalesce(func.sum(AIUsage.completion_tokens), 0).label("total_completion_tokens"),
    ).filter(AIUsage.user_id == current_user.id).first()
    
    total_requests = totals.total_requests or 0
    total_prompt_tokens = totals.total_prompt_tokens or 0
    total_completion_tokens = totals.total_completion_tokens or 0
    estimated_cost_eur = calculate_cost_eur(total_prompt_tokens, total_completion_tokens)
    
    # Get daily usage (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    daily_data = db.query(
        func.date(AIUsage.created_at).label("date"),
        func.count(AIUsage.id).label("requests"),
        func.coalesce(func.sum(AIUsage.prompt_tokens), 0).label("prompt_tokens"),
        func.coalesce(func.sum(AIUsage.completion_tokens), 0).label("completion_tokens"),
    ).filter(
        AIUsage.user_id == current_user.id,
        AIUsage.created_at >= thirty_days_ago
    ).group_by(
        func.date(AIUsage.created_at)
    ).order_by(
        func.date(AIUsage.created_at).desc()
    ).all()
    
    daily_usage = [
        DailyUsage(
            date=str(row.date),
            requests=row.requests,
            prompt_tokens=row.prompt_tokens,
            completion_tokens=row.completion_tokens,
            cost_eur=calculate_cost_eur(row.prompt_tokens, row.completion_tokens),
        )
        for row in daily_data
    ]
    
    # Get monthly usage (last 12 months)
    twelve_months_ago = datetime.utcnow() - timedelta(days=365)
    
    monthly_data = db.query(
        extract('year', AIUsage.created_at).label("year"),
        extract('month', AIUsage.created_at).label("month"),
        func.count(AIUsage.id).label("requests"),
        func.coalesce(func.sum(AIUsage.prompt_tokens), 0).label("prompt_tokens"),
        func.coalesce(func.sum(AIUsage.completion_tokens), 0).label("completion_tokens"),
    ).filter(
        AIUsage.user_id == current_user.id,
        AIUsage.created_at >= twelve_months_ago
    ).group_by(
        extract('year', AIUsage.created_at),
        extract('month', AIUsage.created_at)
    ).order_by(
        extract('year', AIUsage.created_at).desc(),
        extract('month', AIUsage.created_at).desc()
    ).all()
    
    monthly_usage = [
        MonthlyUsage(
            month=f"{int(row.year)}-{int(row.month):02d}",
            requests=row.requests,
            prompt_tokens=row.prompt_tokens,
            completion_tokens=row.completion_tokens,
            cost_eur=calculate_cost_eur(row.prompt_tokens, row.completion_tokens),
        )
        for row in monthly_data
    ]
    
    return AIUsageResponse(
        total_requests=total_requests,
        total_prompt_tokens=total_prompt_tokens,
        total_completion_tokens=total_completion_tokens,
        estimated_cost_eur=estimated_cost_eur,
        daily_usage=daily_usage,
        monthly_usage=monthly_usage,
    )

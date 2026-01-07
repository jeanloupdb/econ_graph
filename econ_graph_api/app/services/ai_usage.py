"""
AI Usage tracking service.

Logs token consumption for each AI call and provides usage statistics.
"""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.models.ai_usage import AIUsage
from app.core.logging import get_logger

logger = get_logger(__name__)

# Gemini 2.0 Flash pricing (USD per 1M tokens)
GEMINI_FLASH_INPUT_PRICE = 0.10  # $0.10 per 1M input tokens
GEMINI_FLASH_OUTPUT_PRICE = 0.40  # $0.40 per 1M output tokens
USD_TO_EUR_RATE = 0.92


def log_ai_usage(
    db: Session,
    user_id: str,
    operation_type: str,
    model_name: str,
    prompt_tokens: int,
    completion_tokens: int,
) -> AIUsage:
    """
    Log an AI usage record.
    
    Args:
        db: Database session
        user_id: The user who made the request
        operation_type: Type of operation (generate_code, create_node, graph_action, create_project)
        model_name: The AI model used (e.g., gemini-2.0-flash)
        prompt_tokens: Number of input tokens
        completion_tokens: Number of output tokens
    
    Returns:
        The created AIUsage record
    """
    usage = AIUsage(
        id=str(uuid.uuid4()),
        user_id=user_id,
        operation_type=operation_type,
        model_name=model_name,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        created_at=datetime.utcnow(),
    )
    
    db.add(usage)
    db.commit()
    
    logger.info(
        "AI usage logged",
        user_id=user_id,
        operation_type=operation_type,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
    )
    
    return usage


def extract_usage_from_gemini_response(response) -> tuple[int, int]:
    """
    Extract token counts from a Gemini API response.
    
    Args:
        response: The Gemini GenerateContentResponse object
    
    Returns:
        Tuple of (prompt_tokens, completion_tokens)
    """
    try:
        usage_metadata = getattr(response, 'usage_metadata', None)
        if usage_metadata:
            prompt_tokens = getattr(usage_metadata, 'prompt_token_count', 0) or 0
            completion_tokens = getattr(usage_metadata, 'candidates_token_count', 0) or 0
            return prompt_tokens, completion_tokens
    except Exception as e:
        logger.warning(f"Failed to extract usage metadata: {e}")
    
    return 0, 0


def calculate_cost_eur(prompt_tokens: int, completion_tokens: int) -> float:
    """
    Calculate estimated cost in EUR for given token counts.
    
    Uses Gemini 2.0 Flash pricing.
    
    Args:
        prompt_tokens: Number of input tokens
        completion_tokens: Number of output tokens
    
    Returns:
        Estimated cost in EUR
    """
    input_cost_usd = (prompt_tokens / 1_000_000) * GEMINI_FLASH_INPUT_PRICE
    output_cost_usd = (completion_tokens / 1_000_000) * GEMINI_FLASH_OUTPUT_PRICE
    total_usd = input_cost_usd + output_cost_usd
    return round(total_usd * USD_TO_EUR_RATE, 6)



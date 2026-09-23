from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, DateTime, Integer, ForeignKey
from datetime import datetime
from app.core.db import Base


class AIUsage(Base):
    """Track AI usage per user for billing and analytics."""
    __tablename__ = "ai_usage"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    operation_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "generate_code", "create_node", "graph_action", "create_project"
    model_name: Mapped[str] = mapped_column(String(50), nullable=False)  # "gemini-2.5-flash"
    prompt_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)




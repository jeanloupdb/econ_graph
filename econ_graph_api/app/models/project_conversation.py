from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime, ForeignKey, Text, Integer
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from app.core.db import Base


class ProjectConversation(Base):
    """
    Conversation history for a project's AI chat.
    Each project has one conversation that persists across sessions.
    """
    __tablename__ = "project_conversation"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(64), ForeignKey("project.id", ondelete="CASCADE"), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Summary of old messages when context gets too long
    context_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Number of messages summarized (to know where summary ends)
    summarized_until_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    project = relationship("Project", backref="conversation", uselist=False)
    messages = relationship("ConversationMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="ConversationMessage.created_at")


class ConversationMessage(Base):
    """
    Individual message in a project conversation.
    """
    __tablename__ = "conversation_message"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    conversation_id: Mapped[str] = mapped_column(String(64), ForeignKey("project_conversation.id", ondelete="CASCADE"), nullable=False)

    # Message content
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # 'user', 'assistant', 'system'
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Extra data (tokens used, actions performed, etc.)
    extra_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    conversation = relationship("ProjectConversation", back_populates="messages")

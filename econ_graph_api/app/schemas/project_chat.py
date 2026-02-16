from pydantic import BaseModel, Field
from typing import Optional, Literal, List, Any, Dict
from datetime import datetime


class AiContextTarget(BaseModel):
    kind: Literal["node", "node-field", "section"]
    id: str
    field: Optional[str] = None


class AiContextInfo(BaseModel):
    label: str
    type: Literal["parameter", "calculation", "result"]
    target: Optional[AiContextTarget] = None


class ChatMessageOut(BaseModel):
    """Output schema for a single chat message"""
    id: str
    role: Literal["user", "assistant", "system"]
    content: str
    metadata: Optional[Dict[str, Any]] = Field(default=None, alias="extra_data")
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


class ConversationOut(BaseModel):
    """Output schema for a conversation with messages"""
    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime
    context_summary: Optional[str] = None
    messages: List[ChatMessageOut] = []

    # Include generation_prompt from project for initial display
    generation_prompt: Optional[str] = None

    class Config:
        from_attributes = True


class ChatMessageCreate(BaseModel):
    """Input schema for sending a chat message"""
    content: str = Field(..., min_length=1, max_length=10000)
    context: Optional[AiContextInfo] = None


class ChatResponse(BaseModel):
    """Response from the AI chat"""
    message: ChatMessageOut
    # Actions performed by the AI (if any)
    actions_performed: List[Dict[str, Any]] = []
    # Suggested follow-up actions
    suggested_actions: List[Dict[str, str]] = []


class ConversationSummary(BaseModel):
    """Brief summary of a conversation for listing"""
    id: str
    project_id: str
    message_count: int
    last_message_at: Optional[datetime] = None
    preview: Optional[str] = None  # First ~100 chars of last message

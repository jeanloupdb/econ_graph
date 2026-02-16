import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.project_conversation import ProjectConversation


def get_or_create_conversation(db: Session, project_id: str) -> ProjectConversation:
    """Get existing conversation or create a new one."""
    conversation = db.query(ProjectConversation).filter(
        ProjectConversation.project_id == project_id
    ).first()

    if not conversation:
        conversation = ProjectConversation(
            id=str(uuid.uuid4()),
            project_id=project_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    return conversation

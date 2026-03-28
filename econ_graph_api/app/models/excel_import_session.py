from datetime import datetime, timedelta
from sqlalchemy import Column, String, Integer, LargeBinary, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from app.core.db import Base


class ExcelImportSession(Base):
    __tablename__ = "excel_import_session"

    id = Column(String(16), primary_key=True)
    user_id = Column(String(64), nullable=False, index=True)

    # Status lifecycle: uploaded → scanning → awaiting_selection → importing → completed
    #                                       → qualified_refused
    #                                       → failed
    status = Column(String(32), nullable=False, default="scanning")

    file_name = Column(String(256), nullable=False)
    file_size = Column(Integer, nullable=False)
    # Stored temporarily until commit, then cleared to save space
    file_bytes = Column(LargeBinary, nullable=True)

    # Result of qualify_workbook() — candidate blocks, verdict, warnings
    scan_result = Column(JSONB, nullable=True)

    # Scope selected by the user (target sheets / block ids)
    selected_scope = Column(JSONB, nullable=True)

    # Filled after successful commit
    project_id = Column(String(64), nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Sessions expire after 1 hour — cleaned up lazily
    expires_at = Column(DateTime, nullable=False, index=True)

    @classmethod
    def new(cls, session_id: str, user_id: str, file_name: str, file_size: int, file_bytes: bytes) -> "ExcelImportSession":
        now = datetime.utcnow()
        return cls(
            id=session_id,
            user_id=user_id,
            status="scanning",
            file_name=file_name,
            file_size=file_size,
            file_bytes=file_bytes,
            created_at=now,
            updated_at=now,
            expires_at=now + timedelta(hours=1),
        )

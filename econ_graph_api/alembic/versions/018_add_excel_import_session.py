"""add excel_import_session table

Revision ID: 018_add_excel_import_session
Revises: 017_add_dashboard_config
Create Date: 2026-03-13
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "018_add_excel_import_session"
down_revision = "017_add_dashboard_config"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "excel_import_session",
        sa.Column("id", sa.String(16), primary_key=True),
        sa.Column("user_id", sa.String(64), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="scanning"),
        sa.Column("file_name", sa.String(256), nullable=False),
        sa.Column("file_size", sa.Integer, nullable=False),
        sa.Column("file_bytes", sa.LargeBinary, nullable=True),
        sa.Column("scan_result", JSONB, nullable=True),
        sa.Column("selected_scope", JSONB, nullable=True),
        sa.Column("project_id", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
        sa.Column("expires_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_excel_import_session_user_id", "excel_import_session", ["user_id"])
    op.create_index("ix_excel_import_session_expires_at", "excel_import_session", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_excel_import_session_expires_at")
    op.drop_index("ix_excel_import_session_user_id")
    op.drop_table("excel_import_session")

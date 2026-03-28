"""add project notifications

Revision ID: 015_add_project_notifications
Revises: 014_add_smart_profile
Create Date: 2026-02-07
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "015_add_project_notifications"
down_revision = "014_add_smart_profile"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    from sqlalchemy import inspect
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    if "project_notification" not in existing_tables:
        op.create_table(
            "project_notification",
            sa.Column("id", sa.String(length=64), primary_key=True, nullable=False),
            sa.Column("project_id", sa.String(length=64), sa.ForeignKey("project.id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", sa.String(length=64), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
            sa.Column("source", sa.String(length=32), nullable=False),
            sa.Column("type", sa.String(length=32), nullable=False),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("body", sa.Text(), nullable=True),
            sa.Column("priority", sa.Integer(), nullable=False, server_default="3"),
            sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("fingerprint", sa.String(length=64), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("read_at", sa.DateTime(), nullable=True),
        )

    existing_idxs = {idx["name"] for idx in inspector.get_indexes("project_notification")}
    if "ix_project_notification_project_created" not in existing_idxs:
        op.create_index("ix_project_notification_project_created", "project_notification", ["project_id", "created_at"])
    if "ix_project_notification_user_created" not in existing_idxs:
        op.create_index("ix_project_notification_user_created", "project_notification", ["user_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_project_notification_user_created", table_name="project_notification")
    op.drop_index("ix_project_notification_project_created", table_name="project_notification")
    op.drop_table("project_notification")

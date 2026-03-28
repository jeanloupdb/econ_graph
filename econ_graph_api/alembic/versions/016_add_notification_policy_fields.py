"""add notification policy fields

Revision ID: 016_notif_policy
Revises: 015_add_project_notifications
Create Date: 2026-02-23
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "016_notif_policy"
down_revision = "015_add_project_notifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    from sqlalchemy import inspect, text
    inspector = inspect(conn)
    existing_cols = {c["name"] for c in inspector.get_columns("project_notification")}
    existing_idxs = {idx["name"] for idx in inspector.get_indexes("project_notification")}

    if "theme" not in existing_cols:
        op.add_column("project_notification", sa.Column("theme", sa.String(length=32), nullable=True))
    if "objective" not in existing_cols:
        op.add_column("project_notification", sa.Column("objective", sa.String(length=32), nullable=True))
    if "dedup_key" not in existing_cols:
        op.add_column("project_notification", sa.Column("dedup_key", sa.String(length=128), nullable=True))
    if "group_key" not in existing_cols:
        op.add_column("project_notification", sa.Column("group_key", sa.String(length=128), nullable=True))
    if "score" not in existing_cols:
        op.add_column("project_notification", sa.Column("score", sa.Float(), nullable=True))
    if "aggregate_count" not in existing_cols:
        op.add_column("project_notification", sa.Column("aggregate_count", sa.Integer(), nullable=False, server_default="1"))
    if "last_event_at" not in existing_cols:
        op.add_column("project_notification", sa.Column("last_event_at", sa.DateTime(), nullable=True))
    if "expires_at" not in existing_cols:
        op.add_column("project_notification", sa.Column("expires_at", sa.DateTime(), nullable=True))
    if "archived_at" not in existing_cols:
        op.add_column("project_notification", sa.Column("archived_at", sa.DateTime(), nullable=True))

    if "ix_project_notification_dedup_key" not in existing_idxs:
        op.create_index(
            "ix_project_notification_dedup_key",
            "project_notification",
            ["project_id", "dedup_key"],
        )
    if "ix_project_notification_group_key" not in existing_idxs:
        op.create_index(
            "ix_project_notification_group_key",
            "project_notification",
            ["project_id", "group_key"],
        )

    op.execute("UPDATE project_notification SET aggregate_count = 1 WHERE aggregate_count IS NULL")
    op.execute("UPDATE project_notification SET last_event_at = created_at WHERE last_event_at IS NULL")


def downgrade() -> None:
    op.drop_index("ix_project_notification_group_key", table_name="project_notification")
    op.drop_index("ix_project_notification_dedup_key", table_name="project_notification")

    op.drop_column("project_notification", "archived_at")
    op.drop_column("project_notification", "expires_at")
    op.drop_column("project_notification", "last_event_at")
    op.drop_column("project_notification", "aggregate_count")
    op.drop_column("project_notification", "score")
    op.drop_column("project_notification", "group_key")
    op.drop_column("project_notification", "dedup_key")
    op.drop_column("project_notification", "objective")
    op.drop_column("project_notification", "theme")

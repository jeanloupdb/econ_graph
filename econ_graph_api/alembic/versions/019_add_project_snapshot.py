"""add project_snapshot table and project.head_snapshot_id

Revision ID: 019_add_project_snapshot
Revises: 018_add_excel_import_session
Create Date: 2026-09-23
"""

from alembic import op
import sqlalchemy as sa

revision = "019_add_project_snapshot"
down_revision = "018_add_excel_import_session"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # main.py fait deja un create_all() au demarrage : la table ou la colonne
    # peuvent exister avant cette migration, on ne cree que ce qui manque
    inspector = sa.inspect(op.get_bind())

    if not inspector.has_table("project_snapshot"):
        _create_project_snapshot()

    project_columns = {c["name"] for c in inspector.get_columns("project")}
    if "head_snapshot_id" not in project_columns:
        op.add_column("project", sa.Column("head_snapshot_id", sa.String(64), nullable=True))


def _create_project_snapshot() -> None:
    op.create_table(
        "project_snapshot",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "project_id",
            sa.String(64),
            sa.ForeignKey("project.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("parent_snapshot_id", sa.String(64), nullable=True),
        sa.Column(
            "author_user_id",
            sa.String(64),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("trigger", sa.String(32), nullable=False, server_default="manual"),
        sa.Column("message", sa.Text, nullable=True),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("smgp_payload", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_index(
        "ix_project_snapshot_project_created", "project_snapshot", ["project_id", "created_at"]
    )
    op.create_index(
        "ix_project_snapshot_project_hash", "project_snapshot", ["project_id", "content_hash"]
    )


def downgrade() -> None:
    op.drop_column("project", "head_snapshot_id")
    op.drop_index("ix_project_snapshot_project_hash", table_name="project_snapshot")
    op.drop_index("ix_project_snapshot_project_created", table_name="project_snapshot")
    op.drop_table("project_snapshot")

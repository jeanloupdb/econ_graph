"""add dashboard_config to project

Revision ID: 017_add_dashboard_config
Revises: 016_notif_policy
Create Date: 2026-03-04
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision = "017_add_dashboard_config"
down_revision = "016_notif_policy"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    from sqlalchemy import inspect
    inspector = inspect(conn)
    existing_cols = {c["name"] for c in inspector.get_columns("project")}

    if "dashboard_config" not in existing_cols:
        op.add_column("project", sa.Column("dashboard_config", JSONB, nullable=True))


def downgrade() -> None:
    op.drop_column("project", "dashboard_config")

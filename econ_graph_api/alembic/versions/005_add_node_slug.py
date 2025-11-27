"""Add slug column to node table and enforce per-project uniqueness.

Revision ID: 005_add_node_slug
Revises: 004_add_composites_table
Create Date: 2024-05-20 00:00:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "005_add_node_slug"
down_revision = "004_add_composites_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("node", sa.Column("slug", sa.String(length=128), nullable=True))
    op.execute("UPDATE node SET slug = id")
    op.alter_column("node", "slug", nullable=False)
    op.create_unique_constraint("uq_node_project_slug", "node", ["project_id", "slug"])


def downgrade() -> None:
    op.drop_constraint("uq_node_project_slug", "node", type_="unique")
    op.drop_column("node", "slug")

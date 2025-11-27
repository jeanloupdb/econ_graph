"""Add composite_id column to node table.

Revision ID: 006_add_node_composite_id
Revises: 005_add_node_slug
Create Date: 2024-05-20 00:30:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "006_add_node_composite_id"
down_revision = "005_add_node_slug"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "node",
        sa.Column("composite_id", sa.String(length=64), nullable=True)
    )
    op.create_foreign_key(
        "fk_node_composite",
        "node",
        "composite",
        ["composite_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_node_composite", "node", type_="foreignkey")
    op.drop_column("node", "composite_id")

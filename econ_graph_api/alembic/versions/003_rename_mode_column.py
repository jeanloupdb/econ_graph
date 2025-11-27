"""Rename scenario_node_override.mode column to override_mode

Revision ID: 003
Revises: 002
Create Date: 2025-11-18

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade():
    """Rename column mode -> override_mode on scenario_node_override."""
    op.alter_column(
        "scenario_node_override",
        "mode",
        new_column_name="override_mode",
    )


def downgrade():
    """Revert column name override_mode -> mode."""
    op.alter_column(
        "scenario_node_override",
        "override_mode",
        new_column_name="mode",
    )


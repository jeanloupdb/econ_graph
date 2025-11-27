"""Add mode and override_code to scenario_node_override

Revision ID: 002
Revises: 001
Create Date: 2025-11-18

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade():
  """Add mode and override_code columns to scenario_node_override."""
  op.add_column(
      "scenario_node_override",
      sa.Column(
          "mode",
          sa.String(16),
          nullable=False,
          server_default="value",
      ),
  )
  op.add_column(
      "scenario_node_override",
      sa.Column(
          "override_code",
          sa.Text(),
          nullable=True,
      ),
  )


def downgrade():
  """Remove mode and override_code columns from scenario_node_override."""
  op.drop_column("scenario_node_override", "override_code")
  op.drop_column("scenario_node_override", "mode")


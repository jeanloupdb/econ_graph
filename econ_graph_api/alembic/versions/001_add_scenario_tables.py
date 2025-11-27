"""Add scenario and scenario_node_override tables

Revision ID: 001
Revises:
Create Date: 2025-11-18

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Create scenario and scenario_node_override tables."""
    # Create scenario table
    op.create_table(
        'scenario',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('project_id', sa.String(64), sa.ForeignKey('project.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('color', sa.String(7), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )

    # Create scenario_node_override table
    op.create_table(
        'scenario_node_override',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('scenario_id', sa.String(64), sa.ForeignKey('scenario.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('node_id', sa.String(64), sa.ForeignKey('node.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('override_value', sa.Float(), nullable=True),
    )


def downgrade():
    """Drop scenario tables."""
    op.drop_table('scenario_node_override')
    op.drop_table('scenario')

"""Add ai_usage table for tracking AI consumption

Revision ID: 007_add_ai_usage_table
Revises: 4c81d9590bc6
Create Date: 2025-01-07

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '007_add_ai_usage_table'
down_revision = '4c81d9590bc6'
branch_labels = None
depends_on = None


def upgrade():
    """Create ai_usage table."""
    op.create_table(
        'ai_usage',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('user_id', sa.String(64), sa.ForeignKey('user.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('operation_type', sa.String(50), nullable=False),
        sa.Column('model_name', sa.String(50), nullable=False),
        sa.Column('prompt_tokens', sa.Integer(), nullable=False, default=0),
        sa.Column('completion_tokens', sa.Integer(), nullable=False, default=0),
        sa.Column('created_at', sa.DateTime(), nullable=False, index=True),
    )


def downgrade():
    """Drop ai_usage table."""
    op.drop_table('ai_usage')



"""Add generation_prompt and description to Project

Revision ID: 009_add_project_prompt_fields
Revises: 4c81d9590bc6
Create Date: 2026-01-09

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '009_add_project_prompt_fields'
down_revision = '007_add_ai_usage_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add generation_prompt column - stores the original prompt used to generate the project
    op.add_column('project', sa.Column('generation_prompt', sa.Text(), nullable=True))
    
    # Add description column - stores the AI-understood intent or user description
    op.add_column('project', sa.Column('description', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('project', 'description')
    op.drop_column('project', 'generation_prompt')

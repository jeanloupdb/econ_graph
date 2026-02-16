"""add project status and wizard_state

Revision ID: 010_add_project_status
Revises: 009_add_project_prompt_fields
Create Date: 2026-01-20 15:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '010_add_project_status'
down_revision = '009_add_project_prompt_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Add status column with default 'completed' for existing projects
    op.add_column('project', sa.Column('status', sa.String(20), nullable=False, server_default='completed'))
    
    # Add wizard_state JSON column for draft conversations
    op.add_column('project', sa.Column('wizard_state', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('project', 'wizard_state')
    op.drop_column('project', 'status')

"""add user wizard_state

Revision ID: 012_add_user_wizard_state
Revises: 011_jsonb
Create Date: 2026-01-20 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '012_add_user_wizard_state'
down_revision = '011_jsonb'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('user', sa.Column('wizard_state', postgresql.JSONB(astext_type=sa.Text()), nullable=True))

def downgrade():
    op.drop_column('user', 'wizard_state')

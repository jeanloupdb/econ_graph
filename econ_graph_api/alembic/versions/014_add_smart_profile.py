"""add smart_profile column to user

Revision ID: 014_add_smart_profile
Revises: 013_project_conversation
Create Date: 2026-01-22

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '014_add_smart_profile'
down_revision = '013_project_conversation'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add smart_profile column to user table
    op.add_column('user', sa.Column('smart_profile', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    # Remove smart_profile column from user table
    op.drop_column('user', 'smart_profile')

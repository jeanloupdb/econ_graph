"""convert wizard_state to jsonb

Revision ID: 011_jsonb
Revises: 010_add_project_status
Create Date: 2026-01-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "011_jsonb"
down_revision = "010_add_project_status"
branch_labels = None
depends_on = None


def upgrade():
    # Convert wizard_state from JSON to JSONB for better PostgreSQL support
    op.execute("ALTER TABLE project ALTER COLUMN wizard_state TYPE JSONB USING wizard_state::JSONB")


def downgrade():
    # Convert back to JSON
    op.execute("ALTER TABLE project ALTER COLUMN wizard_state TYPE JSON USING wizard_state::JSON")

"""add project conversation tables

Revision ID: 013_project_conversation
Revises: 012_add_user_wizard_state
Create Date: 2026-01-22 21:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '013_project_conversation'
down_revision = '012_add_user_wizard_state'
branch_labels = None
depends_on = None


def upgrade():
    # Create project_conversation table
    op.create_table(
        'project_conversation',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('project_id', sa.String(64), sa.ForeignKey('project.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('context_summary', sa.Text(), nullable=True),
        sa.Column('summarized_until_index', sa.Integer(), nullable=False, server_default='0'),
    )
    op.create_index('ix_project_conversation_project_id', 'project_conversation', ['project_id'])

    # Create conversation_message table
    op.create_table(
        'conversation_message',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('conversation_id', sa.String(64), sa.ForeignKey('project_conversation.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('extra_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_conversation_message_conversation_id', 'conversation_message', ['conversation_id'])
    op.create_index('ix_conversation_message_created_at', 'conversation_message', ['created_at'])


def downgrade():
    op.drop_index('ix_conversation_message_created_at', table_name='conversation_message')
    op.drop_index('ix_conversation_message_conversation_id', table_name='conversation_message')
    op.drop_table('conversation_message')
    op.drop_index('ix_project_conversation_project_id', table_name='project_conversation')
    op.drop_table('project_conversation')

"""Add crop_quality_results table for AI crop quality visual grading.

Revision ID: 006_add_crop_quality_results
Revises: 005_add_batch_workflow_columns
Create Date: 2026-09-04

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '006_add_crop_quality_results'
down_revision: Union[str, None] = '005_add_batch_workflow_columns'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'crop_quality_results',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('product_id', sa.String(length=50), nullable=True),
        sa.Column('image_url', sa.String(length=500), nullable=True),
        sa.Column('crop', sa.String(length=100), nullable=False),
        sa.Column('total_score', sa.Float(), nullable=False),
        sa.Column('grade', sa.String(length=10), nullable=False),
        sa.Column('factor_scores', sa.JSON(), nullable=False),
        sa.Column('detected_issues', sa.JSON(), nullable=False),
        sa.Column('recommendation', sa.Text(), nullable=True),
        sa.Column('analysis_mode', sa.String(length=20), nullable=False, server_default='demo'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_crop_quality_results_id'), 'crop_quality_results', ['id'], unique=False)
    op.create_index(op.f('ix_crop_quality_results_product_id'), 'crop_quality_results', ['product_id'], unique=False)
    op.create_index(op.f('ix_crop_quality_results_crop'), 'crop_quality_results', ['crop'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_crop_quality_results_crop'), table_name='crop_quality_results')
    op.drop_index(op.f('ix_crop_quality_results_product_id'), table_name='crop_quality_results')
    op.drop_index(op.f('ix_crop_quality_results_id'), table_name='crop_quality_results')
    op.drop_table('crop_quality_results')

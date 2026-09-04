"""Add CV model columns (farmer_id, confidence, model_name, model_version) to crop_quality_results.

Revision ID: 007_add_cv_model_columns
Revises: 006_add_crop_quality_results
Create Date: 2026-09-04

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '007_add_cv_model_columns'
down_revision: Union[str, None] = '006_add_crop_quality_results'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('crop_quality_results', sa.Column('farmer_id', sa.String(50), nullable=True))
    op.add_column('crop_quality_results', sa.Column('confidence', sa.Float(), nullable=True))
    op.add_column('crop_quality_results', sa.Column('model_name', sa.String(100), nullable=True))
    op.add_column('crop_quality_results', sa.Column('model_version', sa.String(50), nullable=True))

    op.create_foreign_key(
        'fk_crop_quality_results_farmer_id',
        'crop_quality_results',
        'users',
        ['farmer_id'],
        ['id'],
        ondelete='SET NULL'
    )
    op.create_index(op.f('ix_crop_quality_results_farmer_id'), 'crop_quality_results', ['farmer_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_crop_quality_results_farmer_id'), table_name='crop_quality_results')
    op.drop_constraint('fk_crop_quality_results_farmer_id', 'crop_quality_results', type_='foreignkey')
    op.drop_column('crop_quality_results', 'model_version')
    op.drop_column('crop_quality_results', 'model_name')
    op.drop_column('crop_quality_results', 'confidence')
    op.drop_column('crop_quality_results', 'farmer_id')

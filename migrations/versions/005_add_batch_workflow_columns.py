"""Add workflow, scheduled date, freight charge, and OTP columns to delivery_batches.

Revision ID: 005_add_batch_workflow_columns
Revises: 004_add_mandi_prices
Create Date: 2026-09-04

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005_add_batch_workflow_columns'
down_revision: Union[str, None] = '004_add_mandi_prices'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('delivery_batches', sa.Column('delivery_location', sa.String(255), nullable=True))
    op.add_column('delivery_batches', sa.Column('scheduled_at', sa.DateTime(), nullable=True))
    op.add_column('delivery_batches', sa.Column('transportation_charge', sa.Numeric(12, 2), nullable=True))
    op.add_column('delivery_batches', sa.Column('pickup_otp', sa.String(10), nullable=True))
    op.add_column('delivery_batches', sa.Column('pickup_otp_expires_at', sa.DateTime(), nullable=True))
    op.add_column('delivery_batches', sa.Column('pickup_otp_attempts', sa.Integer(), server_default='0', nullable=True))
    op.add_column('delivery_batches', sa.Column('picked_up_at', sa.DateTime(), nullable=True))
    op.add_column('delivery_batches', sa.Column('delivered_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('delivery_batches', 'delivered_at')
    op.drop_column('delivery_batches', 'picked_up_at')
    op.drop_column('delivery_batches', 'pickup_otp_attempts')
    op.drop_column('delivery_batches', 'pickup_otp_expires_at')
    op.drop_column('delivery_batches', 'pickup_otp')
    op.drop_column('delivery_batches', 'transportation_charge')
    op.drop_column('delivery_batches', 'scheduled_at')
    op.drop_column('delivery_batches', 'delivery_location')

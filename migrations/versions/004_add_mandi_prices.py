"""Add mandi_prices table with composite indexes and idempotency hash.

Revision ID: 004_add_mandi_prices
Revises: 003_add_settlement_and_payments
Create Date: 2026-09-04

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004_add_mandi_prices'
down_revision: Union[str, None] = '003_add_settlement_and_payments'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'mandi_prices',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('commodity', sa.String(100), nullable=False, index=True),
        sa.Column('market', sa.String(100), nullable=False, index=True),
        sa.Column('state', sa.String(100), nullable=False, index=True),
        sa.Column('district', sa.String(100), nullable=True),
        sa.Column('variety', sa.String(100), nullable=True),
        sa.Column('grade', sa.String(50), nullable=True),
        sa.Column('price_date', sa.String(50), nullable=False, index=True),
        sa.Column('unit', sa.String(50), server_default='Rs/Quintal', nullable=False),
        sa.Column('min_price', sa.Numeric(10, 2), nullable=True),
        sa.Column('max_price', sa.Numeric(10, 2), nullable=True),
        sa.Column('modal_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('price_per_kg', sa.Numeric(10, 2), nullable=False),
        sa.Column('source', sa.String(100), server_default='data.gov.in - Agmarknet', nullable=False),
        sa.Column('source_resource_id', sa.String(100), server_default='9ef84268-d588-465a-a308-a864a43d0070', nullable=False),
        sa.Column('record_hash', sa.String(64), unique=True, index=True, nullable=False),
        sa.Column('fetched_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    # Composite indexes for fast commodity-market and commodity-state lookups
    op.create_index('ix_mandi_commodity_market_date', 'mandi_prices', ['commodity', 'market', 'price_date'])
    op.create_index('ix_mandi_commodity_state_date', 'mandi_prices', ['commodity', 'state', 'price_date'])


def downgrade() -> None:
    op.drop_index('ix_mandi_commodity_state_date', table_name='mandi_prices')
    op.drop_index('ix_mandi_commodity_market_date', table_name='mandi_prices')
    op.drop_table('mandi_prices')

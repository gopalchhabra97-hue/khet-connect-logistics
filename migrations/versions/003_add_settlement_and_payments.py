"""Add settlement columns to orders, payments table, and driver_payouts table.

Revision ID: 003_add_settlement_and_payments
Revises: 002_add_password_hash
Create Date: 2026-09-03

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003_add_settlement_and_payments'
down_revision: Union[str, None] = '002_add_password_hash'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add settlement and delivery columns to orders
    op.add_column('orders', sa.Column('product_subtotal', sa.Numeric(12, 2), nullable=True))
    op.add_column('orders', sa.Column('advance_percentage', sa.Numeric(5, 2), server_default='30.0', nullable=True))
    op.add_column('orders', sa.Column('advance_amount', sa.Numeric(12, 2), nullable=True))
    op.add_column('orders', sa.Column('advance_payment_status', sa.String(50), server_default='unpaid', nullable=True))
    op.add_column('orders', sa.Column('remaining_product_amount', sa.Numeric(12, 2), nullable=True))
    op.add_column('orders', sa.Column('remaining_payment_status', sa.String(50), server_default='unpaid', nullable=True))
    op.add_column('orders', sa.Column('transportation_charge', sa.Numeric(12, 2), nullable=True))
    op.add_column('orders', sa.Column('total_payable_amount', sa.Numeric(12, 2), nullable=True))
    op.add_column('orders', sa.Column('payment_status', sa.String(50), server_default='pending', nullable=True))
    op.add_column('orders', sa.Column('delivery_otp', sa.String(10), nullable=True))
    op.add_column('orders', sa.Column('delivery_otp_expires_at', sa.DateTime(), nullable=True))
    op.add_column('orders', sa.Column('delivery_otp_attempts', sa.Integer(), server_default='0', nullable=True))
    op.add_column('orders', sa.Column('delivery_confirmed_at', sa.DateTime(), nullable=True))
    op.add_column('orders', sa.Column('assigned_driver_id', sa.String(50), sa.ForeignKey('drivers.id', ondelete='SET NULL'), nullable=True))

    # 2. Create payments table
    op.create_table(
        'payments',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('order_id', sa.String(50), sa.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('buyer_id', sa.String(50), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('payment_type', sa.String(50), nullable=False),  # 'advance' or 'final'
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('status', sa.String(50), server_default='paid', nullable=False),  # 'pending', 'paid', 'failed'
        sa.Column('payment_method', sa.String(50), server_default='simulated', nullable=False),
        sa.Column('transaction_reference', sa.String(100), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('paid_at', sa.DateTime(), nullable=True),
    )

    # 3. Create driver_payouts table
    op.create_table(
        'driver_payouts',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('order_id', sa.String(50), sa.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('driver_id', sa.String(50), sa.ForeignKey('drivers.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('status', sa.String(50), server_default='payable', nullable=False),  # 'pending', 'payable', 'paid'
        sa.Column('transaction_reference', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('paid_at', sa.DateTime(), nullable=True),
    )

    # 4. Backfill calculated values for existing seeded orders
    op.execute("""
        UPDATE orders
        SET product_subtotal = ROUND(CAST(quantity * price_per_unit AS numeric), 2),
            advance_percentage = 30.0,
            advance_amount = ROUND(CAST(quantity * price_per_unit * 0.30 AS numeric), 2),
            advance_payment_status = 'unpaid',
            remaining_product_amount = ROUND(CAST(quantity * price_per_unit * 0.70 AS numeric), 2),
            remaining_payment_status = 'unpaid',
            transportation_charge = 600.00,
            total_payable_amount = ROUND(CAST(quantity * price_per_unit + 600.00 AS numeric), 2),
            payment_status = 'pending'
        WHERE product_subtotal IS NULL;
    """)


def downgrade() -> None:
    op.drop_table('driver_payouts')
    op.drop_table('payments')
    op.drop_column('orders', 'assigned_driver_id')
    op.drop_column('orders', 'delivery_confirmed_at')
    op.drop_column('orders', 'delivery_otp_attempts')
    op.drop_column('orders', 'delivery_otp_expires_at')
    op.drop_column('orders', 'delivery_otp')
    op.drop_column('orders', 'payment_status')
    op.drop_column('orders', 'total_payable_amount')
    op.drop_column('orders', 'transportation_charge')
    op.drop_column('orders', 'remaining_payment_status')
    op.drop_column('orders', 'remaining_product_amount')
    op.drop_column('orders', 'advance_payment_status')
    op.drop_column('orders', 'advance_amount')
    op.drop_column('orders', 'advance_percentage')
    op.drop_column('orders', 'product_subtotal')

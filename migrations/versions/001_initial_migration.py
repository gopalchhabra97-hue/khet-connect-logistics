"""Initial migration: Create core tables.

Revision ID: 001_initial
Revises: 
Create Date: 2026-09-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(50), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('org', sa.String(255), nullable=True),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index('ix_users_name', 'users', ['name'])
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_role', 'users', ['role'])

    # Products table
    op.create_table(
        'products',
        sa.Column('id', sa.String(50), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('quantity', sa.Integer, nullable=False),
        sa.Column('unit', sa.String(50), nullable=False),
        sa.Column('price', sa.Float, nullable=False),
        sa.Column('location', sa.String(255), nullable=False),
        sa.Column('seller_id', sa.String(50), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('seller_name', sa.String(255), nullable=True),
        sa.Column('available', sa.Boolean, default=True),
        sa.Column('harvest_date', sa.String(50), nullable=True),
        sa.Column('verified', sa.Boolean, default=False),
        sa.Column('image', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['seller_id'], ['users.id']),
    )
    op.create_index('ix_products_name', 'products', ['name'])
    op.create_index('ix_products_category', 'products', ['category'])
    op.create_index('ix_products_location', 'products', ['location'])
    op.create_index('ix_products_seller_id', 'products', ['seller_id'])
    op.create_index('ix_products_available', 'products', ['available'])

    # Orders table
    op.create_table(
        'orders',
        sa.Column('id', sa.String(50), nullable=False),
        sa.Column('buyer_id', sa.String(50), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('buyer_name', sa.String(255), nullable=True),
        sa.Column('product_id', sa.String(50), sa.ForeignKey('products.id'), nullable=False),
        sa.Column('product_name', sa.String(255), nullable=True),
        sa.Column('quantity', sa.Integer, nullable=False),
        sa.Column('unit', sa.String(50), nullable=False),
        sa.Column('price_per_unit', sa.Float, nullable=False),
        sa.Column('pickup_location', sa.String(255), nullable=False),
        sa.Column('delivery_location', sa.String(255), nullable=False),
        sa.Column('order_date', sa.String(50), nullable=False),
        sa.Column('expected_delivery', sa.String(50), nullable=True),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('batch_id', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['buyer_id'], ['users.id']),
        sa.ForeignKeyConstraint(['product_id'], ['products.id']),
    )
    op.create_index('ix_orders_buyer_id', 'orders', ['buyer_id'])
    op.create_index('ix_orders_product_id', 'orders', ['product_id'])
    op.create_index('ix_orders_pickup_location', 'orders', ['pickup_location'])
    op.create_index('ix_orders_delivery_location', 'orders', ['delivery_location'])
    op.create_index('ix_orders_status', 'orders', ['status'])
    op.create_index('ix_orders_batch_id', 'orders', ['batch_id'])

    # Order Items table
    op.create_table(
        'order_items',
        sa.Column('id', sa.String(50), nullable=False),
        sa.Column('order_id', sa.String(50), sa.ForeignKey('orders.id'), nullable=False),
        sa.Column('product_id', sa.String(50), sa.ForeignKey('products.id'), nullable=False),
        sa.Column('quantity', sa.Integer, nullable=False),
        sa.Column('unit', sa.String(50), nullable=False),
        sa.Column('price_per_unit', sa.Float, nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id']),
        sa.ForeignKeyConstraint(['product_id'], ['products.id']),
    )
    op.create_index('ix_order_items_order_id', 'order_items', ['order_id'])

    # Vehicles table
    op.create_table(
        'vehicles',
        sa.Column('id', sa.String(50), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('registration', sa.String(50), nullable=False),
        sa.Column('capacity', sa.Integer, nullable=False),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('base_location', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('registration'),
    )
    op.create_index('ix_vehicles_registration', 'vehicles', ['registration'])
    op.create_index('ix_vehicles_status', 'vehicles', ['status'])

    # Drivers table
    op.create_table(
        'drivers',
        sa.Column('id', sa.String(50), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('phone', sa.String(20), nullable=False),
        sa.Column('license', sa.String(50), nullable=False),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('base_location', sa.String(255), nullable=False),
        sa.Column('vehicle_id', sa.String(50), sa.ForeignKey('vehicles.id'), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('license'),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id']),
    )
    op.create_index('ix_drivers_name', 'drivers', ['name'])
    op.create_index('ix_drivers_license', 'drivers', ['license'])
    op.create_index('ix_drivers_status', 'drivers', ['status'])

    # Delivery Batches table
    op.create_table(
        'delivery_batches',
        sa.Column('id', sa.String(50), nullable=False),
        sa.Column('order_ids', sa.JSON, nullable=False),
        sa.Column('pickup_location', sa.String(255), nullable=False),
        sa.Column('delivery_stops', sa.JSON, nullable=False),
        sa.Column('total_quantity', sa.Integer, nullable=False),
        sa.Column('vehicle_id', sa.String(50), sa.ForeignKey('vehicles.id'), nullable=True),
        sa.Column('driver_id', sa.String(50), sa.ForeignKey('drivers.id'), nullable=True),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('distance_km', sa.Float, nullable=True),
        sa.Column('eta_minutes', sa.Integer, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id']),
        sa.ForeignKeyConstraint(['driver_id'], ['drivers.id']),
    )
    op.create_index('ix_delivery_batches_pickup_location', 'delivery_batches', ['pickup_location'])
    op.create_index('ix_delivery_batches_status', 'delivery_batches', ['status'])

    # Add foreign key from orders to delivery_batches
    op.create_foreign_key('fk_orders_batch_id', 'orders', 'delivery_batches', ['batch_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_orders_batch_id', 'orders')
    op.drop_table('delivery_batches')
    op.drop_table('drivers')
    op.drop_table('vehicles')
    op.drop_table('order_items')
    op.drop_table('orders')
    op.drop_table('products')
    op.drop_table('users')

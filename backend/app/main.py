from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.base import Base
from app.db.database import engine
from app import models  # noqa: F401 - Import models to register them with Base

from app.routers.products import router as products_router
from app.routers.orders import router as orders_router
from app.routers.auth import router as auth_router
from app.routers.vehicles import router as vehicles_router
from app.routers.drivers import router as drivers_router
from app.routers.forecast import router as forecast_router
from app.routers.payments import router as payments_router

# Create database tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="KHETSETU API")

# CORS configuration for local development
# Supports standard Vite dev server ports (8080, 5173, 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(products_router, prefix="/api/v1")
app.include_router(orders_router, prefix="/api/v1")
app.include_router(vehicles_router, prefix="/api/v1")
app.include_router(drivers_router, prefix="/api/v1")
app.include_router(forecast_router, prefix="/api/v1")
app.include_router(payments_router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint with API identification."""
    return {
        "service": "KHETSETU API",
        "version": "0.1.0",
        "status": "running",
        "description": "Backend for KHETSETU - Connecting Supply, Demand & Logistics"
    }


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "khetsetu-api"
    }


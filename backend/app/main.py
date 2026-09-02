from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.base import Base
from app.db.database import engine
from app import models  # noqa: F401 - Import models to register them with Base

# Create database tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="KHETSETU API")

# CORS configuration for local development
# Frontend runs on http://localhost:5173 by default
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

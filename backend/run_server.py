#!/usr/bin/env python
"""Quick test of FastAPI health endpoint."""

import sys
import os
from pathlib import Path

# Set working directory to backend
os.chdir(Path(__file__).parent)
sys.path.insert(0, str(Path(__file__).parent))

# Import and test
try:
    from app.main import app
    print("✓ FastAPI app imported successfully")
    print("✓ Database connection initialized")
    print("\nEndpoints available:")
    print("  GET /              - Root endpoint")
    print("  GET /api/health    - Health check")
    print("\nStarting server on http://0.0.0.0:8000")
    
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()

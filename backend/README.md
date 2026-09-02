# KHETSETU Backend API

Minimal Python FastAPI backend for KHETSETU (Phase 1A).

## Setup

### 1. Create a Python Virtual Environment

```bash
cd backend
python -m venv venv
```

### 2. Activate the Virtual Environment

**On Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

**On Windows (Command Prompt):**
```cmd
venv\Scripts\activate.bat
```

**On macOS/Linux:**
```bash
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

## Running the Server

Start the FastAPI development server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The server will start on `http://localhost:8000`

## API Endpoints

### Health Check
```
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "service": "khetsetu-api"
}
```

### Root Endpoint
```
GET /
```

Response:
```json
{
  "service": "KHETSETU API",
  "version": "0.1.0",
  "status": "running",
  "description": "Backend for KHETSETU - Connecting Supply, Demand & Logistics"
}
```

## API Documentation

Once the server is running, visit:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## Notes

- Phase 1A: Minimal API without database, authentication, or ML
- Frontend and backend run independently
- Frontend continues to use DemoStore and mockData
- No modifications to existing frontend code

# Brikell — AI-Native Real Estate Due Diligence Platform

## Overview
Takes property inputs + uploaded documents, runs 20 AI-powered DD modules via GPT-4o, flags missing documents, and produces branded PDF reports for Danish commercial real estate.

## Tech Stack
- **Frontend:** React 19 + TypeScript, Vite (port 5173), Tailwind CSS + shadcn/ui
- **Backend:** Python 3.11 + FastAPI (port 8000)
- **Database:** SQLite at `data/brikell.db` (WAL mode)
- **AI:** OpenAI GPT-4o for all agents (temperature=0)
- **PDF:** WeasyPrint + Jinja2 templates in `/backend/templates`
- **Storage:** `/vault/{project_id}/uploads` and `/vault/{project_id}/reports`

## Pipeline
Input → Document Parser (Python-native) → Data Reconciler (GPT-4o) → Module Runner (20 modules) → HITL Review → Report Generator → PDF

## Running
```bash
# Backend
cd backend && pip install -e . && uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm install && npm run dev

# Init DB
python backend/scripts/init_db.py
```

## API
All endpoints at `/api/v1/` — projects, documents, inputs, modules, reports, chat, health

## Key Conventions
- All monetary values in DKK thousands
- All areas in sqm
- Module outputs: executive_summary, key_metrics, risk_flags
- Three-tier data priority: User Input > Extracted > AI Estimated
- Danish RE terminology: lejelov, bebyggelsesprocent, lokalplan, etc.

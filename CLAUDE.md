# Brikell — AI-Native Real Estate Due Diligence Platform

## What this is
A web application that takes property inputs, runs 20 AI-powered DD modules,
and produces a branded PDF report. Built for Danish commercial real estate.
Operated by Jenan ApS, founder Christian.

## Tech Stack
- Frontend: React + TypeScript, built with Vite, running on port 5173
- Backend: Python + FastAPI, running on port 8000
- Database: SQLite at data/brikell.db with WAL mode
- AI: OpenAI gpt-4o for all agents
- PDF: WeasyPrint + Jinja2, templates in /templates
- File storage: /vault/{project_id}/uploads and /vault/{project_id}/reports

## Key Commands
Start backend: cd backend && source ../venv/bin/activate && uvicorn app.main:app --reload
Start frontend: cd frontend && npm run dev
Init database: python scripts/init_db.py
API docs: http://localhost:8000/docs

## Architecture
Input → Document Parser → Data Reconciler → Module Runner (20 modules) → HITL Review → Report Generator → PDF

## Three sidebar sections
1. Workflows (/projects) — create and run DD reports
2. Vault (/vault) — all completed reports
3. AI Assistant (/chat) — natural language queries over vault

## Current status
[Update this after every session]
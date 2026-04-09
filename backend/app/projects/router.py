import json

from fastapi import APIRouter, Depends, HTTPException
import sqlite3

from ..database import get_db
from .schemas import ProjectCreate, ProjectUpdate, ProjectResponse
from . import service

router = APIRouter()


@router.post("", response_model=ProjectResponse)
def create(body: ProjectCreate, db: sqlite3.Connection = Depends(get_db)):
    return service.create_project(db, body.name, body.address)


@router.get("", response_model=list[ProjectResponse])
def list_all(db: sqlite3.Connection = Depends(get_db)):
    return service.list_projects(db)


@router.get("/{project_id}", response_model=ProjectResponse)
def get_one(project_id: str, db: sqlite3.Connection = Depends(get_db)):
    project = service.get_project(db, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
def update(project_id: str, body: ProjectUpdate, db: sqlite3.Connection = Depends(get_db)):
    project = service.update_project(db, project_id, **body.model_dump(exclude_unset=True))
    if not project:
        raise HTTPException(404, "Project not found")
    return project


@router.delete("/{project_id}")
def delete(project_id: str, db: sqlite3.Connection = Depends(get_db)):
    if not service.delete_project(db, project_id):
        raise HTTPException(404, "Project not found")
    return {"ok": True}


@router.get("/{project_id}/gaps")
def get_gaps(project_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Return the full DD gap report for a project."""
    row = db.execute(
        "SELECT dd_gap_report FROM projects WHERE id = ?", (project_id,)
    ).fetchone()
    if not row:
        raise HTTPException(404, "Project not found")
    if not row["dd_gap_report"]:
        return {"ready_to_run": False, "overall_completeness_pct": 0, "message": "No documents uploaded yet."}
    return json.loads(row["dd_gap_report"])


@router.get("/{project_id}/gaps/summary")
def get_gaps_summary(project_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Return a simplified gap summary for frontend display."""
    row = db.execute(
        "SELECT dd_gap_report FROM projects WHERE id = ?", (project_id,)
    ).fetchone()
    if not row:
        raise HTTPException(404, "Project not found")
    if not row["dd_gap_report"]:
        return {
            "completeness_pct": 0,
            "ready_to_run": False,
            "sufficient_count": 0,
            "partial_count": 0,
            "missing_count": 0,
            "auto_count": 0,
            "modules": {},
            "missing_summary": [],
            "document_suggestions": [],
        }
    report = json.loads(row["dd_gap_report"])
    modules = report.get("modules", {})
    return {
        "completeness_pct": report.get("overall_completeness_pct", 0),
        "ready_to_run": report.get("ready_to_run", False),
        "sufficient_count": sum(1 for m in modules.values() if m["status"] == "sufficient"),
        "partial_count": sum(1 for m in modules.values() if m["status"] == "partial"),
        "missing_count": sum(1 for m in modules.values() if m["status"] == "missing"),
        "auto_count": sum(1 for m in modules.values() if m["status"] == "auto"),
        "modules": modules,
        "missing_summary": report.get("missing_summary", []),
        "document_suggestions": report.get("document_suggestions", []),
    }

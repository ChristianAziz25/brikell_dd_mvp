import json
import sqlite3
import uuid
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.agents.module_runner import run_modules_background
from app.database import get_db
from app.modules.definitions import MODULE_CONFIGS

router = APIRouter(tags=["modules"])


@router.post("/projects/{project_id}/run-modules")
def run_modules(
    project_id: str,
    background_tasks: BackgroundTasks,
    db: sqlite3.Connection = Depends(get_db),
):
    # Verify project exists
    project = db.execute(
        "SELECT id FROM projects WHERE id = ?", (project_id,)
    ).fetchone()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Create pending rows for all 20 modules (INSERT OR IGNORE preserves existing)
    now = datetime.now().isoformat()
    for module in MODULE_CONFIGS:
        db.execute(
            "INSERT OR IGNORE INTO module_outputs "
            "(id, project_id, module_key, module_number, status, created_at) "
            "VALUES (?, ?, ?, ?, 'pending', ?)",
            (str(uuid.uuid4()), project_id, module.key, module.number, now),
        )
    db.execute(
        "UPDATE projects SET status = 'running', updated_at = ? WHERE id = ?",
        (now, project_id),
    )
    db.commit()

    # Start background task
    background_tasks.add_task(run_modules_background, project_id)

    return {
        "status": "running",
        "message": "Module chain started",
        "total_modules": 20,
    }


@router.get("/projects/{project_id}/modules")
def list_modules(
    project_id: str,
    db: sqlite3.Connection = Depends(get_db),
):
    project = db.execute(
        "SELECT id FROM projects WHERE id = ?", (project_id,)
    ).fetchone()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    rows = db.execute(
        "SELECT * FROM module_outputs "
        "WHERE project_id = ? ORDER BY module_number",
        (project_id,),
    ).fetchall()

    modules = []
    for row in rows:
        module = dict(row)
        # Parse JSON fields
        for field in ("output_data", "key_metrics", "risk_flags"):
            if module.get(field):
                try:
                    module[field] = json.loads(module[field])
                except (json.JSONDecodeError, TypeError):
                    pass
        modules.append(module)

    return modules


@router.get("/projects/{project_id}/modules/progress")
def module_progress(
    project_id: str,
    db: sqlite3.Connection = Depends(get_db),
):
    project = db.execute(
        "SELECT id FROM projects WHERE id = ?", (project_id,)
    ).fetchone()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    rows = db.execute(
        "SELECT module_key, module_number, status FROM module_outputs "
        "WHERE project_id = ? ORDER BY module_number",
        (project_id,),
    ).fetchall()

    counts = {"complete": 0, "running": 0, "failed": 0, "pending": 0}
    current_module = None

    for row in rows:
        s = row["status"]
        if s in counts:
            counts[s] += 1
        if s == "running":
            current_module = row["module_key"]

    return {
        "total": 20,
        "complete": counts["complete"],
        "running": counts["running"],
        "failed": counts["failed"],
        "pending": counts["pending"],
        "current_module": current_module,
    }

import json
import sqlite3

from fastapi import APIRouter, BackgroundTasks, Depends

from ..database import get_db
from ..agents.module_runner import run_all_modules
from .definitions import MODULE_CONFIGS

router = APIRouter()


@router.post("/{project_id}/run-modules")
def start_modules(project_id: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_all_modules, project_id)
    return {"status": "modules_started", "total": len(MODULE_CONFIGS)}


@router.get("/{project_id}/modules")
def list_modules(project_id: str, db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute(
        "SELECT * FROM module_outputs WHERE project_id = ? ORDER BY module_number",
        (project_id,),
    ).fetchall()

    results = []
    for row in rows:
        r = dict(row)
        if r["output_data"]:
            r["output_data"] = json.loads(r["output_data"])
        if r["key_metrics"]:
            r["key_metrics"] = json.loads(r["key_metrics"])
        if r["risk_flags"]:
            r["risk_flags"] = json.loads(r["risk_flags"])
        results.append(r)

    return results


@router.get("/{project_id}/modules/progress")
def module_progress(project_id: str, db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute(
        "SELECT status, COUNT(*) as cnt FROM module_outputs WHERE project_id = ? GROUP BY status",
        (project_id,),
    ).fetchall()

    counts = {r["status"]: r["cnt"] for r in rows}
    total = len(MODULE_CONFIGS)
    tracked = sum(counts.values())

    return {
        "total": total,
        "pending": total - tracked + counts.get("pending", 0),
        "running": counts.get("running", 0),
        "complete": counts.get("complete", 0),
        "failed": counts.get("failed", 0),
    }

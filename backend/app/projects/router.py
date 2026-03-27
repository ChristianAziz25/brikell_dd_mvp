import sqlite3

from fastapi import APIRouter, BackgroundTasks, Depends, status

from app.agents.reconciler import reconcile
from app.config import settings
from app.database import get_db
from app.projects.schemas import ProjectCreate, ProjectResponse, ProjectUpdate
from app.projects.service import (
    create_project,
    delete_project,
    get_project,
    list_projects,
    update_project,
    update_project_status,
)

router = APIRouter(tags=["projects"])


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create(data: ProjectCreate, db: sqlite3.Connection = Depends(get_db)):
    return create_project(data, db)


@router.get("/projects", response_model=list[ProjectResponse])
def list_all(db: sqlite3.Connection = Depends(get_db)):
    return list_projects(db)


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get(project_id: str, db: sqlite3.Connection = Depends(get_db)):
    return get_project(project_id, db)


@router.put("/projects/{project_id}", response_model=ProjectResponse)
def update(project_id: str, data: ProjectUpdate, db: sqlite3.Connection = Depends(get_db)):
    return update_project(project_id, data, db)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(project_id: str, db: sqlite3.Connection = Depends(get_db)):
    delete_project(project_id, db)


async def _run_reconcile(project_id: str):
    conn = sqlite3.connect(settings.DATABASE_PATH, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.row_factory = sqlite3.Row
    try:
        await reconcile(project_id, conn)
    finally:
        conn.close()


@router.post("/projects/{project_id}/reconcile")
async def reconcile_project(
    project_id: str,
    background_tasks: BackgroundTasks,
    db: sqlite3.Connection = Depends(get_db),
):
    update_project_status(project_id, "reconciling", db)
    background_tasks.add_task(_run_reconcile, project_id)
    return {"status": "reconciling", "message": "Reconciliation started"}


@router.get("/projects/{project_id}/reconciled")
def get_reconciled(project_id: str, db: sqlite3.Connection = Depends(get_db)):
    import json
    from fastapi import HTTPException

    get_project(project_id, db)  # 404 if not found
    row = db.execute(
        "SELECT data FROM project_inputs "
        "WHERE project_id = ? AND input_type = 'reconciled' "
        "ORDER BY created_at DESC LIMIT 1",
        (project_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="No reconciled data yet")
    return json.loads(row["data"])

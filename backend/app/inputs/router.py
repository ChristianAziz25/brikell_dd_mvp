from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
import sqlite3

from ..database import get_db
from .schemas import InputSave
from . import service

router = APIRouter()


@router.post("/{project_id}/inputs")
def save_input(project_id: str, body: InputSave, db: sqlite3.Connection = Depends(get_db)):
    if body.input_type not in service.VALID_INPUT_TYPES:
        raise HTTPException(400, f"Invalid input_type: {body.input_type}")
    return service.upsert_input(db, project_id, body.input_type, body.data)


@router.get("/{project_id}/inputs")
def get_inputs(project_id: str, db: sqlite3.Connection = Depends(get_db)):
    return service.get_inputs(db, project_id)


@router.post("/{project_id}/reconcile")
def reconcile(project_id: str, background_tasks: BackgroundTasks):
    from ..agents.reconciler import reconcile_project
    background_tasks.add_task(reconcile_project, project_id)
    return {"status": "reconciliation_started"}

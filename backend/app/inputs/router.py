import sqlite3

from fastapi import APIRouter, Depends, status

from app.database import get_db
from app.inputs.schemas import InputData, InputResponse
from app.inputs.service import get_inputs, upsert_input

router = APIRouter(tags=["inputs"])


@router.post(
    "/projects/{project_id}/inputs",
    response_model=InputResponse,
    status_code=status.HTTP_200_OK,
)
def save_input(
    project_id: str,
    body: InputData,
    db: sqlite3.Connection = Depends(get_db),
):
    return upsert_input(project_id, body.input_type, body.data, source="manual", db=db)


@router.get("/projects/{project_id}/inputs")
def list_inputs(
    project_id: str,
    db: sqlite3.Connection = Depends(get_db),
):
    return get_inputs(project_id, db)

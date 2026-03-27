import sqlite3

from fastapi import APIRouter, Depends, status

from app.database import get_db
from app.projects.schemas import ProjectCreate, ProjectResponse, ProjectUpdate
from app.projects.service import (
    create_project,
    delete_project,
    get_project,
    list_projects,
    update_project,
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

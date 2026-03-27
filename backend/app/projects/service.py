import sqlite3
import uuid
from datetime import datetime

from fastapi import HTTPException

from app.projects.schemas import ProjectCreate, ProjectResponse, ProjectUpdate


def create_project(data: ProjectCreate, db: sqlite3.Connection) -> ProjectResponse:
    project_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    db.execute(
        """
        INSERT INTO projects (id, name, address, acquisition_price, hold_period_years,
            return_target_pct, gba_sqm, unit_count, build_year, energy_label,
            heating_source, lokalplan_ref, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
        """,
        (
            project_id, data.name, data.address, data.acquisition_price,
            data.hold_period_years, data.return_target_pct, data.gba_sqm,
            data.unit_count, data.build_year, data.energy_label,
            data.heating_source, data.lokalplan_ref, now, now,
        ),
    )
    db.commit()
    return get_project(project_id, db)


def get_project(project_id: str, db: sqlite3.Connection) -> ProjectResponse:
    db.row_factory = sqlite3.Row
    row = db.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectResponse(**dict(row))


def list_projects(db: sqlite3.Connection) -> list[ProjectResponse]:
    db.row_factory = sqlite3.Row
    rows = db.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
    return [ProjectResponse(**dict(row)) for row in rows]


def update_project(project_id: str, data: ProjectUpdate, db: sqlite3.Connection) -> ProjectResponse:
    updates = data.model_dump(exclude_none=True)
    if not updates:
        return get_project(project_id, db)
    updates["updated_at"] = datetime.now().isoformat()
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [project_id]
    db.execute(f"UPDATE projects SET {set_clause} WHERE id = ?", values)
    db.commit()
    return get_project(project_id, db)


def delete_project(project_id: str, db: sqlite3.Connection) -> dict:
    get_project(project_id, db)  # raises 404 if not found
    db.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    db.commit()
    return {"deleted": True}


def update_project_status(project_id: str, status: str, db: sqlite3.Connection) -> ProjectResponse:
    get_project(project_id, db)  # raises 404 if not found
    now = datetime.now().isoformat()
    db.execute(
        "UPDATE projects SET status = ?, updated_at = ? WHERE id = ?",
        (status, now, project_id),
    )
    db.commit()
    return get_project(project_id, db)

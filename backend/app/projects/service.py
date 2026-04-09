import sqlite3
import uuid
from datetime import datetime, timezone


def create_project(db: sqlite3.Connection, name: str, address: str | None) -> dict:
    project_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO projects (id, name, address, status, created_at, updated_at) VALUES (?, ?, ?, 'draft', ?, ?)",
        (project_id, name, address, now, now),
    )
    db.commit()
    return dict(db.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone())


def list_projects(db: sqlite3.Connection) -> list[dict]:
    rows = db.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
    return [dict(r) for r in rows]


def get_project(db: sqlite3.Connection, project_id: str) -> dict | None:
    row = db.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    return dict(row) if row else None


def update_project(db: sqlite3.Connection, project_id: str, **fields) -> dict | None:
    updates = {k: v for k, v in fields.items() if v is not None}
    if not updates:
        return get_project(db, project_id)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [project_id]
    db.execute(f"UPDATE projects SET {set_clause} WHERE id = ?", values)
    db.commit()
    return get_project(db, project_id)


def delete_project(db: sqlite3.Connection, project_id: str) -> bool:
    cursor = db.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    db.commit()
    return cursor.rowcount > 0

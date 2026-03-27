import json
import sqlite3
import uuid
from datetime import datetime

from app.inputs.schemas import InputResponse


def upsert_input(
    project_id: str,
    input_type: str,
    data: dict,
    source: str = "manual",
    db: sqlite3.Connection = None,
) -> InputResponse:
    db.row_factory = sqlite3.Row
    row = db.execute(
        "SELECT id FROM project_inputs WHERE project_id = ? AND input_type = ?",
        (project_id, input_type),
    ).fetchone()

    now = datetime.now().isoformat()
    data_json = json.dumps(data)

    if row:
        db.execute(
            "UPDATE project_inputs SET data = ?, source = ? WHERE id = ?",
            (data_json, source, row["id"]),
        )
        db.commit()
        updated = db.execute(
            "SELECT * FROM project_inputs WHERE id = ?", (row["id"],)
        ).fetchone()
        return _to_response(updated)
    else:
        input_id = str(uuid.uuid4())
        db.execute(
            "INSERT INTO project_inputs (id, project_id, input_type, data, source, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (input_id, project_id, input_type, data_json, source, now),
        )
        db.commit()
        inserted = db.execute(
            "SELECT * FROM project_inputs WHERE id = ?", (input_id,)
        ).fetchone()
        return _to_response(inserted)


def get_inputs(project_id: str, db: sqlite3.Connection) -> dict:
    db.row_factory = sqlite3.Row
    rows = db.execute(
        "SELECT * FROM project_inputs WHERE project_id = ?", (project_id,)
    ).fetchall()
    return {row["input_type"]: json.loads(row["data"]) for row in rows}


def _to_response(row: sqlite3.Row) -> InputResponse:
    return InputResponse(
        id=row["id"],
        project_id=row["project_id"],
        input_type=row["input_type"],
        data=json.loads(row["data"]),
        source=row["source"],
        created_at=row["created_at"],
    )

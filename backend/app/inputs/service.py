import json
import sqlite3
import uuid
from datetime import datetime, timezone


VALID_INPUT_TYPES = {"property", "planning", "financial", "rent_roll", "reconciled"}


def upsert_input(
    db: sqlite3.Connection,
    project_id: str,
    input_type: str,
    data: dict,
    source: str = "manual",
) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    existing = db.execute(
        "SELECT id FROM project_inputs WHERE project_id = ? AND input_type = ?",
        (project_id, input_type),
    ).fetchone()

    if existing:
        db.execute(
            "UPDATE project_inputs SET data = ?, source = ?, created_at = ? WHERE id = ?",
            (json.dumps(data), source, now, existing["id"]),
        )
        db.commit()
        row = db.execute("SELECT * FROM project_inputs WHERE id = ?", (existing["id"],)).fetchone()
    else:
        input_id = str(uuid.uuid4())
        db.execute(
            "INSERT INTO project_inputs (id, project_id, input_type, data, source, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (input_id, project_id, input_type, json.dumps(data), source, now),
        )
        db.commit()
        row = db.execute("SELECT * FROM project_inputs WHERE id = ?", (input_id,)).fetchone()

    result = dict(row)
    result["data"] = json.loads(result["data"])
    return result


def get_inputs(db: sqlite3.Connection, project_id: str) -> dict[str, dict]:
    rows = db.execute(
        "SELECT * FROM project_inputs WHERE project_id = ?", (project_id,)
    ).fetchall()
    out = {}
    for row in rows:
        r = dict(row)
        r["data"] = json.loads(r["data"])
        out[r["input_type"]] = r
    return out

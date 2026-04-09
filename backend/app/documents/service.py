import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path


def save_document(
    db: sqlite3.Connection,
    project_id: str,
    original_filename: str,
    file_type: str,
    file_size: int,
    file_bytes: bytes,
) -> dict:
    doc_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    vault_dir = Path("vault") / project_id / "uploads"
    vault_dir.mkdir(parents=True, exist_ok=True)
    safe_name = f"{doc_id}_{original_filename}"
    vault_path = str(vault_dir / safe_name)
    Path(vault_path).write_bytes(file_bytes)

    db.execute(
        """INSERT INTO documents
           (id, project_id, filename, original_filename, file_type, file_size_bytes, vault_path, parse_status, uploaded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)""",
        (doc_id, project_id, safe_name, original_filename, file_type, file_size, vault_path, now),
    )
    db.commit()
    return dict(db.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone())


def list_documents(db: sqlite3.Connection, project_id: str) -> list[dict]:
    rows = db.execute(
        "SELECT * FROM documents WHERE project_id = ? ORDER BY uploaded_at DESC",
        (project_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def get_document(db: sqlite3.Connection, doc_id: str) -> dict | None:
    row = db.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
    return dict(row) if row else None


def update_document_type(db: sqlite3.Connection, doc_id: str, document_type: str) -> dict | None:
    db.execute("UPDATE documents SET document_type = ? WHERE id = ?", (document_type, doc_id))
    db.commit()
    return get_document(db, doc_id)


def delete_document(db: sqlite3.Connection, doc_id: str) -> bool:
    doc = get_document(db, doc_id)
    if not doc:
        return False
    path = Path(doc["vault_path"])
    if path.exists():
        path.unlink()
    db.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    db.commit()
    return True

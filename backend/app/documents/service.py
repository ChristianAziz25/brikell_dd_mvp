import os
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import HTTPException

from app.documents.schemas import DocumentResponse

VAULT_ROOT = Path("/Users/christianaziz/projects/vault")


def save_document(
    project_id: str,
    file_bytes: bytes,
    original_filename: str,
    file_type: str,
    file_size_bytes: int,
    db: sqlite3.Connection,
) -> DocumentResponse:
    upload_dir = VAULT_ROOT / project_id / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    doc_id = str(uuid.uuid4())
    filename = f"{doc_id}_{original_filename}"
    vault_path = str(upload_dir / filename)

    with open(vault_path, "wb") as f:
        f.write(file_bytes)

    now = datetime.now().isoformat()
    db.execute(
        """INSERT INTO documents
           (id, project_id, filename, original_filename, file_type,
            file_size_bytes, vault_path, parse_status, uploaded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)""",
        (doc_id, project_id, filename, original_filename, file_type,
         file_size_bytes, vault_path, now),
    )
    db.commit()
    return get_document(doc_id, db)


def get_documents(
    project_id: str, db: sqlite3.Connection
) -> list[DocumentResponse]:
    rows = db.execute(
        "SELECT * FROM documents WHERE project_id = ? ORDER BY uploaded_at DESC",
        (project_id,),
    ).fetchall()
    return [DocumentResponse(**dict(row)) for row in rows]


def get_document(doc_id: str, db: sqlite3.Connection) -> DocumentResponse:
    row = db.execute(
        "SELECT * FROM documents WHERE id = ?", (doc_id,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse(**dict(row))


def delete_document(doc_id: str, db: sqlite3.Connection) -> dict:
    doc = get_document(doc_id, db)
    if os.path.exists(doc.vault_path):
        os.remove(doc.vault_path)
    db.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    db.commit()
    return {"deleted": True}

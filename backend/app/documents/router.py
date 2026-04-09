from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
import sqlite3
from pathlib import Path

from ..database import get_db
from .schemas import DocumentResponse, DocumentTypeUpdate
from . import service
from ..agents.parser import parse_document
from .missing import get_missing_documents

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".csv", ".xlsx", ".xls", ".txt"}


@router.post("/projects/{project_id}/documents", response_model=list[DocumentResponse])
async def upload(
    project_id: str,
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    db: sqlite3.Connection = Depends(get_db),
):
    results = []
    for f in files:
        ext = Path(f.filename or "").suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(400, f"Unsupported file type: {ext}")
        file_bytes = await f.read()
        doc = service.save_document(
            db, project_id, f.filename or "unnamed", ext.lstrip("."), len(file_bytes), file_bytes
        )
        background_tasks.add_task(parse_document, doc["id"], doc["vault_path"], doc["file_type"])
        results.append(doc)
    return results


@router.get("/projects/{project_id}/documents", response_model=list[DocumentResponse])
def list_docs(project_id: str, db: sqlite3.Connection = Depends(get_db)):
    return service.list_documents(db, project_id)


@router.get("/documents/{doc_id}/download")
def download(doc_id: str, db: sqlite3.Connection = Depends(get_db)):
    doc = service.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    path = Path(doc["vault_path"])
    if not path.exists():
        raise HTTPException(404, "File not found on disk")
    return FileResponse(str(path), filename=doc["original_filename"])


@router.put("/documents/{doc_id}", response_model=DocumentResponse)
def update_type(doc_id: str, body: DocumentTypeUpdate, db: sqlite3.Connection = Depends(get_db)):
    doc = service.update_document_type(db, doc_id, body.document_type)
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


@router.get("/projects/{project_id}/missing-documents")
def missing_docs(project_id: str, db: sqlite3.Connection = Depends(get_db)):
    return get_missing_documents(db, project_id)


@router.delete("/documents/{doc_id}")
def delete(doc_id: str, db: sqlite3.Connection = Depends(get_db)):
    if not service.delete_document(db, doc_id):
        raise HTTPException(404, "Document not found")
    return {"ok": True}

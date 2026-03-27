import mimetypes
import os
import sqlite3
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.agents.parser import parse_document
from app.database import get_db
from app.documents.schemas import DocumentResponse
from app.documents.service import (
    delete_document,
    get_document,
    get_documents,
    save_document,
)

router = APIRouter(tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".csv", ".docx", ".xlsx", ".xls", ".txt"}


@router.post(
    "/projects/{project_id}/documents",
    response_model=list[DocumentResponse],
    status_code=status.HTTP_201_CREATED,
)
async def upload_documents(
    project_id: str,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: sqlite3.Connection = Depends(get_db),
):
    # Read all file bytes immediately
    file_data = []
    for file in files:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{ext}' not allowed. Accepted: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            )
        contents = await file.read()
        file_data.append((contents, file.filename or "unknown", ext, len(contents)))

    results = []
    for file_bytes, original_filename, file_type, file_size_bytes in file_data:
        doc = save_document(
            project_id, file_bytes, original_filename, file_type, file_size_bytes, db
        )
        background_tasks.add_task(
            parse_document, project_id, doc.id, doc.vault_path, file_type
        )
        results.append(doc)
    return results


@router.get(
    "/projects/{project_id}/documents",
    response_model=list[DocumentResponse],
)
def list_documents(
    project_id: str,
    db: sqlite3.Connection = Depends(get_db),
):
    return get_documents(project_id, db)


@router.get("/documents/{doc_id}/download")
def download_document(
    doc_id: str,
    db: sqlite3.Connection = Depends(get_db),
):
    doc = get_document(doc_id, db)
    if not os.path.exists(doc.vault_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    media_type = mimetypes.guess_type(doc.original_filename)[0] or "application/octet-stream"
    return FileResponse(
        doc.vault_path,
        media_type=media_type,
        filename=doc.original_filename,
    )


@router.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_document(
    doc_id: str,
    db: sqlite3.Connection = Depends(get_db),
):
    delete_document(doc_id, db)

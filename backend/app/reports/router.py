import sqlite3
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from ..database import get_db
from . import service

router = APIRouter()


@router.post("/projects/{project_id}/reports")
def generate(project_id: str, db: sqlite3.Connection = Depends(get_db)):
    try:
        return service.generate_report(db, project_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/projects/{project_id}/reports")
def list_reports(project_id: str):
    return service.list_reports(project_id)


@router.get("/projects/{project_id}/reports/{report_id}/download")
def download(project_id: str, report_id: str):
    pdf_path = Path("vault") / project_id / "reports" / f"{report_id}.pdf"
    if not pdf_path.exists():
        raise HTTPException(404, "Report not found")
    return FileResponse(str(pdf_path), filename=f"brikell_report_{report_id[:8]}.pdf", media_type="application/pdf")

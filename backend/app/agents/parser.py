import json
import logging
import sqlite3
from typing import Optional

import pandas as pd
import pdfplumber
from docx import Document
from pydantic import BaseModel

from app.agents.llm_client import llm
from app.config import settings

logger = logging.getLogger(__name__)

MAX_CHARS = 100_000


def _table_to_markdown(table: list[list]) -> str:
    """Convert a list-of-lists table to a pipe-separated markdown table."""
    if not table or not table[0]:
        return ""
    header = table[0]
    rows = table[1:]
    lines = [" | ".join(str(c or "") for c in header)]
    lines.append(" | ".join("---" for _ in header))
    for row in rows:
        lines.append(" | ".join(str(c or "") for c in row))
    return "\n".join(lines)


def extract_raw_text(file_path: str, file_type: str) -> str:
    """Extract text and tables from a document file."""

    if file_type == ".pdf":
        parts: list[str] = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    parts.append(text)
                tables = page.extract_tables()
                for table in tables:
                    md = _table_to_markdown(table)
                    if md:
                        parts.append(f"[TABLE]\n{md}\n[/TABLE]")
        return "\n\n".join(parts)[:MAX_CHARS]

    elif file_type == ".docx":
        doc = Document(file_path)
        parts = []
        for para in doc.paragraphs:
            if para.text.strip():
                parts.append(para.text)
        for table in doc.tables:
            rows = []
            for row in table.rows:
                rows.append([cell.text for cell in row.cells])
            md = _table_to_markdown(rows)
            if md:
                parts.append(f"[TABLE]\n{md}\n[/TABLE]")
        return "\n\n".join(parts)[:MAX_CHARS]

    elif file_type == ".csv":
        df = pd.read_csv(file_path)
        md = df.to_markdown()
        return f"[TABLE]\n{md}\n[/TABLE]"[:MAX_CHARS]

    elif file_type in (".xlsx", ".xls"):
        df = pd.read_excel(file_path)
        md = df.to_markdown()
        return f"[TABLE]\n{md}\n[/TABLE]"[:MAX_CHARS]

    else:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()[:MAX_CHARS]


class UnitBreakdown(BaseModel):
    unit_id: Optional[str] = None
    tenant: Optional[str] = None
    sqm: Optional[float] = None
    rent_per_sqm: Optional[float] = None
    lease_end: Optional[str] = None


class PropertyExtraction(BaseModel):
    address: Optional[str] = None
    building_type: Optional[str] = None
    total_gba_sqm: Optional[float] = None
    unit_count: Optional[int] = None
    build_year: Optional[int] = None
    energy_label: Optional[str] = None
    heating_source: Optional[str] = None
    rent_per_sqm_residential: Optional[float] = None
    rent_per_sqm_commercial: Optional[float] = None
    total_annual_rent: Optional[float] = None
    vacancy_rate_pct: Optional[float] = None
    opex_per_sqm: Optional[float] = None
    number_of_tenants: Optional[int] = None
    unit_breakdown: Optional[list[UnitBreakdown]] = None
    notes: Optional[str] = None
    source_document: Optional[str] = None


def _get_db() -> sqlite3.Connection:
    """Create a fresh database connection for background tasks."""
    import os

    os.makedirs(os.path.dirname(settings.DATABASE_PATH), exist_ok=True)
    conn = sqlite3.connect(settings.DATABASE_PATH, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.row_factory = sqlite3.Row
    return conn


async def parse_document(
    project_id: str,
    document_id: str,
    file_path: str,
    file_type: str,
) -> None:
    """Parse a document and extract structured property data."""
    db = _get_db()
    try:
        db.execute(
            "UPDATE documents SET parse_status = 'parsing' WHERE id = ?",
            (document_id,),
        )
        db.commit()

        try:
            raw_text = extract_raw_text(file_path, file_type)
        except Exception as e:
            logger.error("Text extraction failed for %s: %s", document_id, e)
            db.execute(
                "UPDATE documents SET parse_status = 'failed' WHERE id = ?",
                (document_id,),
            )
            db.commit()
            return

        result: PropertyExtraction = llm.parse(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a real estate analyst extracting structured data "
                        "from Danish commercial real estate documents. Extract all "
                        "relevant property data you can find. All monetary values "
                        "should be in DKK. All areas in square metres. If a field "
                        "is not found in the document, leave it as null. Do not "
                        "guess or estimate — only extract what is explicitly stated."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Extract structured data from this document:\n\n{raw_text}",
                },
            ],
            response_model=PropertyExtraction,
            temperature=0,
        )

        result.source_document = file_path.rsplit("/", 1)[-1]

        db.execute(
            "UPDATE documents SET parsed_data = ?, parse_status = 'parsed' WHERE id = ?",
            (json.dumps(result.model_dump(), ensure_ascii=False), document_id),
        )
        db.commit()

    except Exception as e:
        logger.error("Parse failed for %s: %s", document_id, e)
        db.execute(
            "UPDATE documents SET parse_status = 'failed' WHERE id = ?",
            (document_id,),
        )
        db.commit()
    finally:
        db.close()

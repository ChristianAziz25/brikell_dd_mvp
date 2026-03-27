import json
import logging
import sqlite3
import uuid
from typing import Literal, Optional, Union

from pydantic import BaseModel

from app.agents.llm_client import llm
from app.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class FieldValue(BaseModel):
    value: Union[str, float, int, None]
    source: Literal["user_input", "extracted", "ai_estimated"]
    confidence: float
    reasoning: Optional[str] = None


class ReconciliationResult(BaseModel):
    address: FieldValue
    acquisition_price: FieldValue
    total_gba_sqm: FieldValue
    unit_count: FieldValue
    build_year: FieldValue
    energy_label: FieldValue
    heating_source: FieldValue
    lokalplan_ref: FieldValue
    bebyggelsesprocent_permitted: FieldValue
    max_etager: FieldValue
    formaal: FieldValue
    current_passing_rent: FieldValue
    market_rent_per_sqm: FieldValue
    vacancy_rate_pct: FieldValue
    exit_yield_pct: FieldValue
    ltv_pct: FieldValue
    interest_rate_pct: FieldValue
    opex_total: FieldValue
    strategic_category: FieldValue
    lejelov_classification: FieldValue
    v1_v2_status: FieldValue
    restrictions_notes: FieldValue


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Main reconciliation function
# ---------------------------------------------------------------------------

async def reconcile(
    project_id: str,
    db: sqlite3.Connection | None = None,
) -> ReconciliationResult:
    """Merge manual inputs, extracted document data, and AI estimates."""

    own_db = db is None
    if own_db:
        db = _get_db()

    try:
        # 1. Load project_inputs grouped by input_type
        rows = db.execute(
            "SELECT input_type, data FROM project_inputs WHERE project_id = ?",
            (project_id,),
        ).fetchall()

        inputs_by_type: dict[str, list[dict]] = {}
        for row in rows:
            input_type = row["input_type"]
            data = json.loads(row["data"])
            inputs_by_type.setdefault(input_type, []).append(data)

        # 2. Load parsed documents
        docs = db.execute(
            "SELECT original_filename, parsed_data FROM documents "
            "WHERE project_id = ? AND parse_status = 'parsed'",
            (project_id,),
        ).fetchall()

        extracted: list[dict] = []
        for doc in docs:
            if doc["parsed_data"]:
                extracted.append({
                    "filename": doc["original_filename"],
                    "data": json.loads(doc["parsed_data"]),
                })

        # 3. Build context string
        project = db.execute(
            "SELECT address FROM projects WHERE id = ?",
            (project_id,),
        ).fetchone()
        address_hint = project["address"] if project and project["address"] else "this property"

        context_parts = [
            "PROJECT INPUTS (entered manually by the user — treat as USER INPUT):",
        ]
        for itype in ("property", "financial", "planning", "rent_roll"):
            if itype in inputs_by_type:
                context_parts.append(
                    f"  {itype.replace('_', ' ').title()}: "
                    f"{json.dumps(inputs_by_type[itype], ensure_ascii=False)}"
                )

        context_parts.append("\nEXTRACTED FROM DOCUMENTS:")
        if extracted:
            for item in extracted:
                context_parts.append(
                    f"  From {item['filename']}: "
                    f"{json.dumps(item['data'], ensure_ascii=False)}"
                )
        else:
            context_parts.append("  (no parsed documents available)")

        context_parts.append(
            "\nRULES:\n"
            "- User input always overrides extracted data\n"
            "- Extracted data always overrides AI estimates\n"
            "- For missing fields, provide your best estimate for a Danish "
            f"commercial real estate property at {address_hint}\n"
            "- For AI estimates, explain your reasoning\n"
            "- Confidence: 1.0=certain, 0.8=high, 0.6=medium, 0.4=low"
        )

        context = "\n".join(context_parts)

        # 4. Call LLM
        result: ReconciliationResult = llm.parse(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a senior real estate analyst reconciling "
                        "property data from multiple sources for a Danish "
                        "commercial real estate due diligence. Follow the "
                        "rules exactly."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"{context}\n\n"
                        "Reconcile all data and return a complete ReconciliationResult."
                    ),
                },
            ],
            response_model=ReconciliationResult,
            temperature=0,
        )

        # 5. Save result to project_inputs
        result_json = json.dumps(result.model_dump(), ensure_ascii=False)

        # Upsert: delete any prior reconciled row, then insert fresh
        db.execute(
            "DELETE FROM project_inputs "
            "WHERE project_id = ? AND input_type = 'reconciled'",
            (project_id,),
        )
        db.execute(
            "INSERT INTO project_inputs (id, project_id, input_type, data, source) "
            "VALUES (?, ?, 'reconciled', ?, 'agent')",
            (str(uuid.uuid4()), project_id, result_json),
        )
        db.commit()

        logger.info("Reconciliation complete for project %s", project_id)
        return result

    except Exception:
        logger.exception("Reconciliation failed for project %s", project_id)
        raise
    finally:
        if own_db:
            db.close()

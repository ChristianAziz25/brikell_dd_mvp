"""Data reconciler — merges user inputs, document extracts, and AI estimates.

Three-tier priority: User Input > Extracted Data > AI Estimated.
"""

import json
import sqlite3
from typing import Optional

from pydantic import BaseModel

from .llm_client import LLMClient
from ..config import settings


class FieldValue(BaseModel):
    value: Optional[str] = None
    source: str  # user_input, extracted, ai_estimated
    confidence: float  # 0.0 - 1.0
    reasoning: str


class ReconciliationResult(BaseModel):
    address: Optional[FieldValue] = None
    acquisition_price: Optional[FieldValue] = None
    total_gba_sqm: Optional[FieldValue] = None
    unit_count: Optional[FieldValue] = None
    build_year: Optional[FieldValue] = None
    energy_label: Optional[FieldValue] = None
    heating_source: Optional[FieldValue] = None
    lokalplan_ref: Optional[FieldValue] = None
    bebyggelsesprocent: Optional[FieldValue] = None
    max_etager: Optional[FieldValue] = None
    formaal: Optional[FieldValue] = None
    current_passing_rent: Optional[FieldValue] = None
    market_rent_per_sqm: Optional[FieldValue] = None
    vacancy_pct: Optional[FieldValue] = None
    exit_yield_pct: Optional[FieldValue] = None
    ltv_pct: Optional[FieldValue] = None
    interest_rate_pct: Optional[FieldValue] = None
    opex_total: Optional[FieldValue] = None
    strategic_category: Optional[FieldValue] = None
    lejelov_classification: Optional[FieldValue] = None
    v1_v2_status: Optional[FieldValue] = None
    restrictions: Optional[FieldValue] = None


SYSTEM_PROMPT = """You are a real estate data reconciler for Danish commercial properties.

You receive:
1. USER INPUTS — manually entered data (highest priority)
2. DOCUMENT EXTRACTS — raw text from uploaded documents
3. Your task: reconcile all data into structured fields

RULES:
- User Input > Extracted Data > AI Estimated
- For each field, output: value, source, confidence (0.0-1.0), reasoning
- If a field has conflicting values, prefer user input, then document extract
- If data is missing from both sources, you may estimate ONLY if you have strong contextual evidence; otherwise leave null
- All monetary values in DKK thousands
- All areas in sqm
- Be conservative — use ONLY provided data where possible
- Do NOT guess or fabricate data
"""


def reconcile_project(project_id: str) -> dict:
    """Run reconciliation for a project. Called as background task."""
    db = sqlite3.connect(settings.DATABASE_PATH)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA busy_timeout=5000")

    try:
        # Load user inputs
        inputs = db.execute(
            "SELECT input_type, data FROM project_inputs WHERE project_id = ? AND input_type != 'reconciled'",
            (project_id,),
        ).fetchall()

        user_data = {}
        for row in inputs:
            user_data[row["input_type"]] = json.loads(row["data"])

        # Load parsed documents
        docs = db.execute(
            "SELECT original_filename, raw_text FROM documents WHERE project_id = ? AND parse_status = 'parsed'",
            (project_id,),
        ).fetchall()

        doc_texts = []
        for doc in docs:
            if doc["raw_text"]:
                doc_texts.append(f"--- {doc['original_filename']} ---\n{doc['raw_text'][:20000]}")

        # Build context
        context_parts = ["=== USER INPUTS ==="]
        for input_type, data in user_data.items():
            context_parts.append(f"\n[{input_type.upper()}]\n{json.dumps(data, indent=2)}")

        context_parts.append("\n\n=== DOCUMENT EXTRACTS ===")
        if doc_texts:
            context_parts.append("\n\n".join(doc_texts))
        else:
            context_parts.append("No documents uploaded.")

        user_message = "\n".join(context_parts)

        # Call LLM
        llm = LLMClient()
        result = llm.parse(SYSTEM_PROMPT, user_message, ReconciliationResult)

        # Store reconciled data
        from ..inputs.service import upsert_input
        upsert_input(db, project_id, "reconciled", result.model_dump(), source="reconciler")

        return result.model_dump()

    finally:
        db.close()

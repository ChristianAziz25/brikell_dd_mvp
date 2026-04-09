"""Orchestrator — loads extracted document text for a property, runs five specialist
agents in sequence (building, planning, tenancy, market, financials), and collects
all outputs into a single JSON report object."""

import json
import sqlite3
from datetime import datetime, timezone
from pydantic import BaseModel

from .llm_client import LLMClient
from ..config import settings


# ---------------------------------------------------------------------------
# Pydantic schemas for structured output from each specialist agent
# ---------------------------------------------------------------------------

class BuildingReport(BaseModel):
    executive_summary: str
    year_built: int | None = None
    gba_sqm: float | None = None
    nla_sqm: float | None = None
    floors: int | None = None
    energy_label: str | None = None
    heating_source: str | None = None
    building_condition: str | None = None
    risk_flags: list[str] = []


class PlanningReport(BaseModel):
    executive_summary: str
    lokalplan_ref: str | None = None
    bebyggelsesprocent: float | None = None
    max_etager: int | None = None
    formaal: str | None = None
    zoning_status: str | None = None
    open_cases: list[str] = []
    risk_flags: list[str] = []


class TenancyReport(BaseModel):
    executive_summary: str
    unit_count: int | None = None
    occupied_units: int | None = None
    vacancy_pct: float | None = None
    wale_years: float | None = None
    regulated_units: int | None = None
    liberalised_units: int | None = None
    passing_rent_dkk_k: float | None = None
    risk_flags: list[str] = []


class MarketReport(BaseModel):
    executive_summary: str
    location_score: float | None = None
    transit_score: float | None = None
    comparable_yield: float | None = None
    erv_per_sqm: float | None = None
    supply_pipeline_sqm: float | None = None
    demand_outlook: str | None = None
    risk_flags: list[str] = []


class FinancialsReport(BaseModel):
    executive_summary: str
    acquisition_price_dkk_k: float | None = None
    gross_rental_income_dkk_k: float | None = None
    total_opex_dkk_k: float | None = None
    noi_dkk_k: float | None = None
    cap_rate_pct: float | None = None
    irr_pct: float | None = None
    risk_flags: list[str] = []


# ---------------------------------------------------------------------------
# Specialist agent definitions
# ---------------------------------------------------------------------------

SPECIALISTS = [
    {
        "name": "building",
        "schema": BuildingReport,
        "system_prompt": (
            "You are a specialist building surveyor for Danish commercial real estate "
            "due diligence. Analyse the provided property documents and extract all "
            "building-related information: construction year, gross/net areas, floors, "
            "energy label, heating source, and overall building condition. "
            "Flag any risks (e.g. asbestos, poor energy rating, deferred maintenance). "
            "All areas in sqm, monetary values in DKK thousands. "
            "Return structured JSON matching the requested schema."
        ),
    },
    {
        "name": "planning",
        "schema": PlanningReport,
        "system_prompt": (
            "You are a specialist planning consultant for Danish commercial real estate "
            "due diligence. Analyse the provided property documents for planning and "
            "regulatory information: lokalplan reference, bebyggelsesprocent, max etager, "
            "formaal, zoning status, and any open regulatory cases. "
            "Flag risks such as non-conforming use, pending enforcement, or restrictive "
            "local plans. Return structured JSON matching the requested schema."
        ),
    },
    {
        "name": "tenancy",
        "schema": TenancyReport,
        "system_prompt": (
            "You are a specialist tenancy analyst for Danish commercial real estate "
            "due diligence. Analyse the provided property documents for tenancy and "
            "leasing information: unit count, occupancy, WALE, regulated vs liberalised "
            "units under Danish lejelov, and passing rent. "
            "Flag risks such as high vacancy, short WALE, rent regulation exposure, "
            "or tenant concentration. All monetary values in DKK thousands. "
            "Return structured JSON matching the requested schema."
        ),
    },
    {
        "name": "market",
        "schema": MarketReport,
        "system_prompt": (
            "You are a specialist market research analyst for Danish commercial real "
            "estate due diligence. Analyse the provided property documents for market "
            "context: location quality, transit access, comparable yields, estimated "
            "rental value per sqm, supply pipeline, and demand outlook. "
            "Flag risks such as oversupply, weak demand, or unfavourable yield trends. "
            "Return structured JSON matching the requested schema."
        ),
    },
    {
        "name": "financials",
        "schema": FinancialsReport,
        "system_prompt": (
            "You are a specialist financial analyst for Danish commercial real estate "
            "due diligence. Analyse the provided property documents for financial "
            "metrics: acquisition price, gross rental income, operating expenses, NOI, "
            "cap rate, and IRR. All monetary values in DKK thousands. "
            "Flag risks such as thin margins, aggressive assumptions, or unfunded capex. "
            "Return structured JSON matching the requested schema."
        ),
    },
]


# ---------------------------------------------------------------------------
# Database helper
# ---------------------------------------------------------------------------

def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

def run_orchestrator(property_id: str) -> dict:
    """Load all extracted document text for a property, run each specialist agent
    in sequence, and return a combined JSON report.

    Args:
        property_id: The project/property UUID.

    Returns:
        dict with keys: property_id, property_name, generated_at, specialists
        (building, planning, tenancy, market, financials), and aggregate risk_flags.
    """
    db = _get_db()
    llm = LLMClient()

    try:
        # ------------------------------------------------------------------
        # 1. Load project metadata
        # ------------------------------------------------------------------
        project = db.execute(
            "SELECT * FROM projects WHERE id = ?", (property_id,)
        ).fetchone()
        if not project:
            return {"error": f"Property {property_id} not found"}

        # ------------------------------------------------------------------
        # 2. Load all extracted document text
        # ------------------------------------------------------------------
        docs = db.execute(
            "SELECT original_filename, document_type, raw_text "
            "FROM documents WHERE project_id = ? AND parse_status = 'parsed'",
            (property_id,),
        ).fetchall()

        doc_extracts = []
        for doc in docs:
            if doc["raw_text"]:
                text = doc["raw_text"][:15_000]
                label = doc["document_type"] or doc["original_filename"]
                doc_extracts.append(f"--- {label} ({doc['original_filename']}) ---\n{text}")

        if not doc_extracts:
            return {"error": "No parsed documents found for this property"}

        # ------------------------------------------------------------------
        # 3. Also load any user / reconciled inputs for extra context
        # ------------------------------------------------------------------
        input_rows = db.execute(
            "SELECT input_type, data FROM project_inputs WHERE project_id = ?",
            (property_id,),
        ).fetchall()
        user_inputs = {row["input_type"]: json.loads(row["data"]) for row in input_rows}

        # ------------------------------------------------------------------
        # 4. Build shared context sent to every specialist
        # ------------------------------------------------------------------
        context = (
            f"PROPERTY: {project['name']}\n"
            f"ADDRESS: {project['address'] or 'N/A'}\n\n"
            f"=== USER / RECONCILED INPUTS ===\n"
            f"{json.dumps(user_inputs, indent=2)}\n\n"
            f"=== DOCUMENT EXTRACTS ===\n"
            f"{chr(10).join(doc_extracts)}"
        )

        # ------------------------------------------------------------------
        # 5. Run each specialist agent sequentially
        # ------------------------------------------------------------------
        report: dict = {
            "property_id": property_id,
            "property_name": project["name"],
            "address": project["address"],
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "specialists": {},
            "risk_flags": [],
        }

        for spec in SPECIALISTS:
            name = spec["name"]
            print(f"[Orchestrator] Running {name} agent...")
            try:
                result = llm.parse(spec["system_prompt"], context, spec["schema"])
                result_dict = result.model_dump()
                report["specialists"][name] = result_dict
                report["risk_flags"].extend(result_dict.get("risk_flags", []))
                print(f"[Orchestrator] {name} — done")
            except Exception as e:
                print(f"[Orchestrator] {name} — FAILED: {e}")
                report["specialists"][name] = {"error": str(e)}

        return report

    finally:
        db.close()

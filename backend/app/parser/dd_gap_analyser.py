"""DD Gap Analyser — maps extracted signals against 16 DD modules.

Returns a structured gap report with completeness scoring, missing document
recommendations, and ready-to-run status.
"""

from datetime import datetime, timezone

DD_MODULES: dict[str, dict] = {
    "M01_building_overview": {
        "label": "Building Overview",
        "track": "Technical & Building",
        "required_signals": ["contains_building_specs", "contains_floor_areas"],
        "optional_signals": ["contains_energy_data"],
        "missing_documents": [
            "BBR extract (bbr.dk)",
            "Title deed or property information sheet",
        ],
        "recommendation": "Upload the BBR extract for this property from bbr.dk or OIS.",
    },
    "M02_planning_conditions": {
        "label": "Planning Conditions",
        "track": "Legal & Regulatory",
        "required_signals": ["contains_planning_info"],
        "optional_signals": [],
        "missing_documents": [
            "Local plan PDF (lokalplan) from plandata.dk",
            "BBR extract showing permitted use codes",
        ],
        "recommendation": "Upload the local plan PDF from plandata.dk and the BBR extract.",
    },
    "M03_development_potential": {
        "label": "Development Potential",
        "track": "Technical & Building",
        "required_signals": ["contains_planning_info", "contains_floor_areas"],
        "optional_signals": ["contains_building_specs"],
        "missing_documents": [
            "Local plan PDF",
            "Site plan or building drawings showing existing footprint",
        ],
        "recommendation": "Upload the local plan and any site drawings to calculate residual building rights.",
    },
    "M04_tenancy_law_structure": {
        "label": "Tenancy Law Structure",
        "track": "Legal & Regulatory",
        "required_signals": ["contains_tenancy_info", "contains_rent_roll"],
        "optional_signals": [],
        "missing_documents": [
            "Rent roll (lejefortegnelse)",
            "Tenancy agreements (lejekontrakter)",
            "BBR extract with unit classification",
        ],
        "recommendation": "Upload the full rent roll and at least a sample of tenancy agreements to assess regulation status per unit.",
    },
    "M05_estimated_rental_value": {
        "label": "Estimated Rental Value",
        "track": "Lease & Market Value",
        "required_signals": ["contains_rent_roll", "contains_floor_areas"],
        "optional_signals": ["contains_market_data"],
        "missing_documents": [
            "Rent roll with current rents and unit areas",
            "Market rent appraisal or broker opinion",
        ],
        "recommendation": "Upload the rent roll and any market rent appraisal to compare passing rent vs ERV.",
    },
    "M06_opex_estimate": {
        "label": "OPEX Estimate",
        "track": "Lease & Market Value",
        "required_signals": ["contains_opex_data"],
        "optional_signals": ["contains_financial_data"],
        "missing_documents": [
            "Operating budget or driftsbudget",
            "Annual accounts (driftsregnskab)",
            "Land tax statement (grundskyldsbillet)",
        ],
        "recommendation": "Upload the annual operating accounts and land tax statement.",
    },
    "M07_market_research": {
        "label": "Market Research & Demographics",
        "track": "Market & Location",
        "required_signals": ["contains_market_data"],
        "optional_signals": [],
        "missing_documents": [
            "Market report or broker overview",
            "Transaction comparables",
        ],
        "recommendation": "Upload a market rent appraisal or broker overview for the local area.",
    },
    "M08_infrastructure_local_area": {
        "label": "Infrastructure & Local Area",
        "track": "Market & Location",
        "required_signals": [],
        "optional_signals": ["contains_planning_info"],
        "missing_documents": [],
        "recommendation": "This module uses location data. No specific documents required — will be auto-populated from address.",
    },
    "M09_supply_pipeline": {
        "label": "Supply Pipeline",
        "track": "Market & Location",
        "required_signals": [],
        "optional_signals": ["contains_planning_info", "contains_market_data"],
        "missing_documents": [],
        "recommendation": "This module uses public planning data. Upload any known competitor project information if available.",
    },
    "M10_ownership_structure": {
        "label": "Ownership & Title",
        "track": "Legal & Regulatory",
        "required_signals": ["contains_ownership_info"],
        "optional_signals": [],
        "missing_documents": [
            "Land registry extract (tingbogsattest) from tinglysning.dk",
            "Title deed (skøde)",
        ],
        "recommendation": "Upload the tingbogsattest from tinglysning.dk to verify ownership and encumbrances.",
    },
    "M11_technical_condition": {
        "label": "Technical Condition",
        "track": "Technical & Building",
        "required_signals": ["contains_building_specs"],
        "optional_signals": ["contains_energy_data"],
        "missing_documents": [
            "Technical inspection report (tilstandsrapport)",
            "Energy performance certificate (energimærke)",
        ],
        "recommendation": "Upload the technical inspection report and energy certificate.",
    },
    "M12_energy_esg": {
        "label": "Energy & ESG",
        "track": "Operations & ESG",
        "required_signals": ["contains_energy_data"],
        "optional_signals": [],
        "missing_documents": [
            "Energy performance certificate (energimærke)",
            "Utility consumption data (forbrug)",
        ],
        "recommendation": "Upload the energy certificate from Energistyrelsen and any utility consumption statements.",
    },
    "M13_improvement_potential": {
        "label": "Improvement Potential",
        "track": "Operations & ESG",
        "required_signals": ["contains_floor_areas", "contains_rent_roll"],
        "optional_signals": ["contains_planning_info", "contains_financial_data"],
        "missing_documents": [
            "Rent roll",
            "Local plan",
            "Operating accounts",
        ],
        "recommendation": "Upload rent roll and local plan to model conversion and uplift opportunities.",
    },
    "M14_financial_model": {
        "label": "Financial Model",
        "track": "Financial",
        "required_signals": ["contains_financial_data", "contains_rent_roll"],
        "optional_signals": ["contains_opex_data"],
        "missing_documents": [
            "Annual accounts (årsregnskab)",
            "Rent roll",
            "Operating budget",
        ],
        "recommendation": "Upload the annual accounts and rent roll to build the financial model.",
    },
    "M15_risk_flags": {
        "label": "Risk & Flag Summary",
        "track": "Financial",
        "required_signals": [],
        "optional_signals": ["contains_ownership_info", "contains_planning_info", "contains_tenancy_info"],
        "missing_documents": [],
        "recommendation": "Auto-generated from other modules. No specific documents required.",
    },
    "M16_transaction_summary": {
        "label": "Transaction Summary",
        "track": "Financial",
        "required_signals": ["contains_financial_data"],
        "optional_signals": ["contains_market_data", "contains_ownership_info"],
        "missing_documents": [
            "Sale and purchase agreement draft (SPA)",
            "Indicative valuation or NBO",
        ],
        "recommendation": "Upload any indicative valuation, NBO, or sale agreement to complete this module.",
    },
}

# Core modules that must be sufficient for ready_to_run
_CORE_MODULES = {"M01_building_overview", "M05_estimated_rental_value", "M06_opex_estimate", "M14_financial_model"}

# Static document suggestions shown when gaps exist
_DOCUMENT_SUGGESTIONS = [
    "Local plan PDF (lokalplan) — download from plandata.dk",
    "BBR extract — download from bbr.dk or OIS",
    "Energy certificate (energimærke) — from Energistyrelsen",
    "Land registry extract (tingbogsattest) — from tinglysning.dk",
    "Rent roll (lejefortegnelse) — from property manager",
    "Annual operating accounts (driftsregnskab) — from seller",
    "Tenancy agreements (lejekontrakter) — from seller or manager",
    "Market rent appraisal — from local broker",
    "Municipal plan extract (kommuneplan) — from municipality website",
]


def _compute_module_status(
    module_def: dict,
    merged_signals: dict[str, bool],
) -> dict:
    """Evaluate a single module against merged signals from all documents."""
    required = module_def["required_signals"]

    if not required:
        return {
            "label": module_def["label"],
            "track": module_def["track"],
            "required_signals": required,
            "optional_signals": module_def["optional_signals"],
            "signal_found": True,
            "status": "auto",
            "missing_documents": [],
            "recommendation": None,
        }

    found_count = sum(1 for s in required if merged_signals.get(s, False))

    if found_count == len(required):
        status = "sufficient"
    elif found_count > 0:
        status = "partial"
    else:
        status = "missing"

    return {
        "label": module_def["label"],
        "track": module_def["track"],
        "required_signals": required,
        "optional_signals": module_def["optional_signals"],
        "signal_found": found_count > 0,
        "status": status,
        "missing_documents": module_def["missing_documents"] if status != "sufficient" else [],
        "recommendation": module_def["recommendation"] if status != "sufficient" else None,
    }


def analyse_gaps(project_id: str, documents: list[dict]) -> dict:
    """Analyse DD coverage across all uploaded documents for a project.

    Args:
        project_id: The project/property ID.
        documents: List of extraction result dicts, each containing dd_signals.

    Returns:
        Structured gap report dict.
    """
    # Merge signals across all documents (OR logic)
    merged_signals: dict[str, bool] = {}
    for doc in documents:
        for key, val in doc.get("dd_signals", {}).items():
            if val:
                merged_signals[key] = True

    # Evaluate each module
    modules_result: dict[str, dict] = {}
    for module_key, module_def in DD_MODULES.items():
        modules_result[module_key] = _compute_module_status(module_def, merged_signals)

    # Counts
    sufficient_count = sum(1 for m in modules_result.values() if m["status"] == "sufficient")
    partial_count = sum(1 for m in modules_result.values() if m["status"] == "partial")
    missing_count = sum(1 for m in modules_result.values() if m["status"] == "missing")
    auto_count = sum(1 for m in modules_result.values() if m["status"] == "auto")

    overall_pct = round((sufficient_count + auto_count) / len(DD_MODULES) * 100)

    # Ready-to-run check
    core_ready = all(
        modules_result[m]["status"] == "sufficient"
        for m in _CORE_MODULES
    )
    ready = overall_pct >= 40 and core_ready

    # Build missing summary (only non-sufficient modules with required signals)
    missing_summary = []
    for module_key, mod in modules_result.items():
        if mod["status"] in ("missing", "partial"):
            priority = "high" if module_key in _CORE_MODULES else "medium"
            missing_summary.append({
                "module": module_key,
                "label": mod["label"],
                "track": mod["track"],
                "priority": priority,
                "missing_documents": mod["missing_documents"],
                "recommendation": mod["recommendation"],
            })

    # Sort: high priority first
    missing_summary.sort(key=lambda x: (0 if x["priority"] == "high" else 1, x["module"]))

    # Only suggest documents that are actually missing
    doc_suggestions = _DOCUMENT_SUGGESTIONS if missing_summary else []

    # Ready reason
    if ready:
        ready_reason = f"{sufficient_count + auto_count} of {len(DD_MODULES)} modules have sufficient data."
    else:
        missing_labels = [m["label"] for m in missing_summary[:4]]
        ready_reason = (
            f"{sufficient_count + auto_count} of {len(DD_MODULES)} modules have sufficient data. "
            f"Missing: {', '.join(missing_labels)}."
        )

    return {
        "project_id": project_id,
        "analysed_at": datetime.now(timezone.utc).isoformat(),
        "total_documents": len(documents),
        "overall_completeness_pct": overall_pct,
        "ready_to_run": ready,
        "ready_to_run_reason": ready_reason,
        "modules": modules_result,
        "missing_summary": missing_summary,
        "document_suggestions": doc_suggestions,
    }

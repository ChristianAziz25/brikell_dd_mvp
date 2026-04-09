"""Missing documents checker — compares uploaded documents against module requirements."""

import sqlite3

from ..modules.definitions import MODULE_CONFIGS


def get_missing_documents(db: sqlite3.Connection, project_id: str) -> dict:
    """Check which required document types are missing for each module."""
    # Get all uploaded document types for this project
    rows = db.execute(
        "SELECT document_type FROM documents WHERE project_id = ? AND document_type IS NOT NULL",
        (project_id,),
    ).fetchall()
    uploaded_types = {r["document_type"] for r in rows}

    modules = []
    total_required = 0
    total_uploaded = 0

    for config in MODULE_CONFIGS:
        if not config.required_document_types:
            continue
        required = set(config.required_document_types)
        present = required & uploaded_types
        missing = required - uploaded_types
        total_required += len(required)
        total_uploaded += len(present)

        modules.append({
            "module_key": config.key,
            "module_number": config.number,
            "module_name": config.name,
            "required_types": sorted(config.required_document_types),
            "uploaded_types": sorted(present),
            "missing_types": sorted(missing),
            "complete": len(missing) == 0,
        })

    overall_pct = (total_uploaded / total_required * 100) if total_required > 0 else 0

    return {
        "modules": modules,
        "overall_completeness_pct": round(overall_pct, 1),
    }

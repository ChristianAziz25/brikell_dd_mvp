import json
import logging
import sqlite3
import uuid
from datetime import datetime

from app.agents.llm_client import llm
from app.config import settings
from app.modules.definitions import MODULE_CONFIGS

logger = logging.getLogger(__name__)


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


async def run_all_modules(
    project_id: str,
    db: sqlite3.Connection,
) -> dict:
    """Run all 20 DD modules sequentially for a project."""

    # ------------------------------------------------------------------
    # STEP 1 — Load all data for this project
    # ------------------------------------------------------------------

    # Reconciled inputs
    row = db.execute(
        "SELECT data FROM project_inputs "
        "WHERE project_id = ? AND input_type = 'reconciled' "
        "ORDER BY created_at DESC LIMIT 1",
        (project_id,),
    ).fetchone()
    reconciled_data = json.loads(row["data"]) if row else {}

    # Parsed documents
    docs = db.execute(
        "SELECT original_filename, parsed_data FROM documents "
        "WHERE project_id = ? AND parse_status = 'parsed'",
        (project_id,),
    ).fetchall()

    doc_extracts = []
    for doc in docs:
        if doc["parsed_data"]:
            doc_extracts.append(
                f"  {doc['original_filename']}: "
                f"{doc['parsed_data']}"
            )

    # Project address
    project = db.execute(
        "SELECT address FROM projects WHERE id = ?",
        (project_id,),
    ).fetchone()
    address = project["address"] if project and project["address"] else "Unknown"

    base_context = (
        f"PROPERTY: {address}\n"
        f"RECONCILED DATA:\n{json.dumps(reconciled_data, indent=2, ensure_ascii=False)}\n"
        f"DOCUMENT EXTRACTS:\n" + ("\n".join(doc_extracts) if doc_extracts else "  (none)")
    )

    # ------------------------------------------------------------------
    # STEP 2 — Update project status
    # ------------------------------------------------------------------
    now = datetime.now().isoformat()
    db.execute(
        "UPDATE projects SET status = ?, updated_at = ? WHERE id = ?",
        ("running", now, project_id),
    )
    db.commit()

    # ------------------------------------------------------------------
    # STEP 3 — Track completed outputs
    # ------------------------------------------------------------------
    completed_outputs: dict[str, object] = {}

    completed = 0
    failed = 0

    # ------------------------------------------------------------------
    # STEP 4 — Run each module in order
    # ------------------------------------------------------------------
    for module in MODULE_CONFIGS:
        try:
            # 4a. Upsert module_outputs row as running
            now = datetime.now().isoformat()
            db.execute(
                "INSERT OR REPLACE INTO module_outputs "
                "(id, project_id, module_key, module_number, status, created_at) "
                "VALUES (?, ?, ?, ?, 'running', ?)",
                (str(uuid.uuid4()), project_id, module.key, module.number, now),
            )
            db.commit()

            # 4b. Build context with dependency outputs
            context = base_context
            for dep_key in module.dependencies:
                if dep_key in completed_outputs:
                    dep_result = completed_outputs[dep_key]
                    if module.key == "20_executive_summary":
                        context += (
                            f"\n\n{dep_key} SUMMARY:\n"
                            f"{dep_result.executive_summary}"
                        )
                    else:
                        context += (
                            f"\n\n{dep_key} OUTPUT:\n"
                            f"{dep_result.model_dump_json(indent=2)}"
                        )

            # 4c. Build messages
            messages = [
                {"role": "system", "content": module.system_prompt},
                {
                    "role": "user",
                    "content": (
                        f"Analyse this Danish commercial property for the "
                        f"{module.name} module.\n\n{context}"
                    ),
                },
            ]

            # 4d. Call LLM with structured output
            result = llm.parse(messages, module.schema, temperature=0)

            # 4e. Store in completed outputs
            completed_outputs[module.key] = result

            # 4f. Update module_outputs row as complete
            now = datetime.now().isoformat()
            db.execute(
                "UPDATE module_outputs SET "
                "status = 'complete', "
                "output_data = ?, "
                "executive_summary = ?, "
                "key_metrics = ?, "
                "risk_flags = ?, "
                "created_at = ? "
                "WHERE project_id = ? AND module_key = ?",
                (
                    result.model_dump_json(),
                    result.executive_summary,
                    json.dumps(result.key_metrics),
                    json.dumps(result.risk_flags),
                    now,
                    project_id,
                    module.key,
                ),
            )
            db.commit()
            completed += 1
            logger.info("Module %s complete for project %s", module.key, project_id)

        except Exception:
            # 4g. Mark as failed and continue
            failed += 1
            logger.exception(
                "Module %s failed for project %s", module.key, project_id
            )
            now = datetime.now().isoformat()
            db.execute(
                "UPDATE module_outputs SET status = 'failed', created_at = ? "
                "WHERE project_id = ? AND module_key = ?",
                (now, project_id, module.key),
            )
            db.commit()

    # ------------------------------------------------------------------
    # STEP 5 — Update project status to review
    # ------------------------------------------------------------------
    now = datetime.now().isoformat()
    db.execute(
        "UPDATE projects SET status = ?, updated_at = ? WHERE id = ?",
        ("review", now, project_id),
    )
    db.commit()

    # ------------------------------------------------------------------
    # STEP 6 — Return summary
    # ------------------------------------------------------------------
    return {
        "total_modules": len(MODULE_CONFIGS),
        "completed": completed,
        "failed": failed,
        "project_id": project_id,
    }


async def run_modules_background(project_id: str) -> dict:
    """Wrapper that creates its own DB connection for background execution."""
    conn = _get_db()
    try:
        return await run_all_modules(project_id, conn)
    finally:
        conn.close()

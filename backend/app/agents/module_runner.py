"""Module runner — executes all 20 DD modules sequentially in dependency order."""

import json
import sqlite3
import uuid
from datetime import datetime, timezone

from .llm_client import LLMClient
from ..config import settings
from ..modules.definitions import MODULE_CONFIGS


def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def run_all_modules(project_id: str) -> dict:
    """Run all 20 DD modules for a project. Called as background task."""
    db = _get_db()
    llm = LLMClient()

    try:
        # Set project status to running
        db.execute(
            "UPDATE projects SET status = 'running', updated_at = ? WHERE id = ?",
            (datetime.now(timezone.utc).isoformat(), project_id),
        )
        db.commit()

        # Load project data
        project = db.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not project:
            return {"error": "Project not found"}

        # Load reconciled data
        reconciled_row = db.execute(
            "SELECT data FROM project_inputs WHERE project_id = ? AND input_type = 'reconciled'",
            (project_id,),
        ).fetchone()
        reconciled = json.loads(reconciled_row["data"]) if reconciled_row else {}

        # Load all user inputs
        input_rows = db.execute(
            "SELECT input_type, data FROM project_inputs WHERE project_id = ? AND input_type != 'reconciled'",
            (project_id,),
        ).fetchall()
        user_inputs = {}
        for row in input_rows:
            user_inputs[row["input_type"]] = json.loads(row["data"])

        # Load parsed documents
        docs = db.execute(
            "SELECT original_filename, raw_text FROM documents WHERE project_id = ? AND parse_status = 'parsed'",
            (project_id,),
        ).fetchall()
        doc_extracts = []
        for doc in docs:
            if doc["raw_text"]:
                text = doc["raw_text"][:15000]  # Truncate per doc to manage context
                doc_extracts.append(f"--- {doc['original_filename']} ---\n{text}")

        # Build base context
        base_context = f"""PROJECT: {project['name']}
ADDRESS: {project['address'] or 'N/A'}

=== RECONCILED DATA ===
{json.dumps(reconciled, indent=2)}

=== USER INPUTS ===
{json.dumps(user_inputs, indent=2)}

=== DOCUMENT EXTRACTS ===
{chr(10).join(doc_extracts) if doc_extracts else 'No documents available.'}
"""

        # Track completed outputs for dependency context
        completed_outputs: dict[str, dict] = {}
        completed = 0
        failed = 0

        for config in MODULE_CONFIGS:
            now = datetime.now(timezone.utc).isoformat()
            module_id = str(uuid.uuid4())

            # Upsert module output row as running
            existing = db.execute(
                "SELECT id FROM module_outputs WHERE project_id = ? AND module_key = ?",
                (project_id, config.key),
            ).fetchone()
            if existing:
                db.execute(
                    "UPDATE module_outputs SET status = 'running', created_at = ? WHERE id = ?",
                    (now, existing["id"]),
                )
                module_id = existing["id"]
            else:
                db.execute(
                    "INSERT INTO module_outputs (id, project_id, module_key, module_number, status, created_at) VALUES (?, ?, ?, ?, 'running', ?)",
                    (module_id, project_id, config.key, config.number, now),
                )
            db.commit()

            try:
                # Build dependency context
                dep_context = ""
                if config.dependencies:
                    dep_parts = []
                    for dep_key in config.dependencies:
                        if dep_key in completed_outputs:
                            dep_data = completed_outputs[dep_key]
                            if config.key == "mod_20_executive_summary":
                                # Module 20 gets only executive summaries
                                dep_parts.append(
                                    f"[{dep_key}] Executive Summary: {dep_data.get('executive_summary', 'N/A')}"
                                )
                            else:
                                dep_parts.append(
                                    f"[{dep_key}]\n{json.dumps(dep_data, indent=2)}"
                                )
                    dep_context = "\n\n=== DEPENDENCY OUTPUTS ===\n" + "\n\n".join(dep_parts)

                user_message = base_context + dep_context

                # Call LLM
                result = llm.parse(config.system_prompt, user_message, config.schema)
                result_dict = result.model_dump()

                # Store result
                db.execute(
                    """UPDATE module_outputs SET
                       status = 'complete',
                       output_data = ?,
                       executive_summary = ?,
                       key_metrics = ?,
                       risk_flags = ?,
                       created_at = ?
                       WHERE id = ?""",
                    (
                        json.dumps(result_dict),
                        result_dict.get("executive_summary", ""),
                        json.dumps(result_dict.get("key_metrics", {})),
                        json.dumps(result_dict.get("risk_flags", [])),
                        datetime.now(timezone.utc).isoformat(),
                        module_id,
                    ),
                )
                db.commit()

                completed_outputs[config.key] = result_dict
                completed += 1
                print(f"[Module {config.number:02d}] {config.name} — complete")

            except Exception as e:
                print(f"[Module {config.number:02d}] {config.name} — FAILED: {e}")
                db.execute(
                    "UPDATE module_outputs SET status = 'failed' WHERE id = ?",
                    (module_id,),
                )
                db.commit()
                failed += 1

        # Set project status
        final_status = "review" if completed > 0 else "error"
        db.execute(
            "UPDATE projects SET status = ?, updated_at = ? WHERE id = ?",
            (final_status, datetime.now(timezone.utc).isoformat(), project_id),
        )
        db.commit()

        return {
            "total_modules": len(MODULE_CONFIGS),
            "completed": completed,
            "failed": failed,
        }

    finally:
        db.close()

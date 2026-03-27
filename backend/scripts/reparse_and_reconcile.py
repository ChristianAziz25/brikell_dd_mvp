"""One-time script to re-parse pending documents and reconcile for a project."""

import asyncio
import json
import sqlite3
import sys
from pathlib import Path

# Ensure the backend package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.agents.parser import parse_document
from app.agents.reconciler import reconcile
from app.config import settings

PROJECT_ID = "f721e249-81ba-4789-a162-e36073995494"


async def main() -> None:
    db = sqlite3.connect(settings.DATABASE_PATH, check_same_thread=False)
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA busy_timeout=5000")
    db.row_factory = sqlite3.Row

    # Reset failed documents back to pending so they can be re-parsed
    db.execute(
        "UPDATE documents SET parse_status = 'pending', parsed_data = NULL "
        "WHERE project_id = ? AND parse_status = 'failed'",
        (PROJECT_ID,),
    )
    db.commit()

    rows = db.execute(
        "SELECT id, original_filename, vault_path, file_type "
        "FROM documents WHERE project_id = ? AND parse_status = 'pending'",
        (PROJECT_ID,),
    ).fetchall()

    if not rows:
        print("No pending documents found for this project.")
        return

    print(f"Found {len(rows)} pending document(s)\n")

    for row in rows:
        doc_id, filename, vault_path, file_type = (
            row["id"],
            row["original_filename"],
            row["vault_path"],
            row["file_type"],
        )
        print(f"Parsing: {filename}...")
        await parse_document(PROJECT_ID, doc_id, vault_path, file_type)

        parsed = db.execute(
            "SELECT parsed_data FROM documents WHERE id = ?", (doc_id,)
        ).fetchone()
        n_fields = 0
        if parsed and parsed["parsed_data"]:
            data = json.loads(parsed["parsed_data"])
            n_fields = sum(1 for v in data.values() if v is not None)
        print(f"Parsed: {filename} - extracted {n_fields} fields")

    print("\nRunning reconciler...")
    result = await reconcile(PROJECT_ID, db=db)
    print("Done - reconciled data saved")

    db.close()


if __name__ == "__main__":
    asyncio.run(main())

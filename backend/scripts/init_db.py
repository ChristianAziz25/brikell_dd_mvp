"""Initialize the SQLite database with all required tables."""

import sqlite3
import sys
from pathlib import Path

# Allow running as: python backend/scripts/init_db.py
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings


def init_db():
    db_path = Path(settings.DATABASE_PATH)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    conn.executescript("""
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            address TEXT,
            status TEXT NOT NULL DEFAULT 'draft',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            dd_gap_report TEXT
        );

        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            filename TEXT NOT NULL,
            original_filename TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size_bytes INTEGER,
            vault_path TEXT NOT NULL,
            document_type TEXT,
            parse_status TEXT NOT NULL DEFAULT 'pending',
            raw_text TEXT,
            uploaded_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS project_inputs (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            input_type TEXT NOT NULL,
            data TEXT NOT NULL,
            source TEXT NOT NULL DEFAULT 'manual',
            created_at TEXT NOT NULL,
            UNIQUE(project_id, input_type)
        );

        CREATE TABLE IF NOT EXISTS module_outputs (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            module_key TEXT NOT NULL,
            module_number INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            output_data TEXT,
            executive_summary TEXT,
            key_metrics TEXT,
            risk_flags TEXT,
            created_at TEXT NOT NULL,
            UNIQUE(project_id, module_key)
        );

        CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
        CREATE INDEX IF NOT EXISTS idx_inputs_project ON project_inputs(project_id);
        CREATE INDEX IF NOT EXISTS idx_modules_project ON module_outputs(project_id);
    """)

    # Add dd_gap_report column if it doesn't exist (migration for existing DBs)
    cols = [row[1] for row in conn.execute("PRAGMA table_info(projects)").fetchall()]
    if "dd_gap_report" not in cols:
        conn.execute("ALTER TABLE projects ADD COLUMN dd_gap_report TEXT")

    conn.commit()
    conn.close()
    print(f"Database initialized at {db_path}")


if __name__ == "__main__":
    init_db()

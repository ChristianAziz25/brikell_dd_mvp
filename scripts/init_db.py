import os
import sqlite3

from dotenv import load_dotenv

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(ROOT_DIR, ".env"))

DATABASE_PATH = os.path.join(ROOT_DIR, os.getenv("DATABASE_PATH", "data/brikell.db"))

os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)

conn = sqlite3.connect(DATABASE_PATH)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA foreign_keys=ON")
conn.execute("PRAGMA busy_timeout=5000")

conn.executescript("""
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    acquisition_price REAL,
    hold_period_years INTEGER,
    return_target_pct REAL,
    gba_sqm REAL,
    unit_count INTEGER,
    build_year INTEGER,
    energy_label TEXT,
    heating_source TEXT,
    lokalplan_ref TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_inputs (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    input_type TEXT NOT NULL,
    data TEXT NOT NULL CHECK(json_valid(data)),
    source TEXT DEFAULT 'manual',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size_bytes INTEGER,
    vault_path TEXT NOT NULL,
    parse_status TEXT DEFAULT 'pending',
    parsed_data TEXT CHECK(json_valid(parsed_data) OR parsed_data IS NULL),
    uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS module_outputs (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    module_key TEXT NOT NULL,
    module_number INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    output_data TEXT CHECK(json_valid(output_data) OR output_data IS NULL),
    executive_summary TEXT,
    key_metrics TEXT CHECK(json_valid(key_metrics) OR key_metrics IS NULL),
    risk_flags TEXT CHECK(json_valid(risk_flags) OR risk_flags IS NULL),
    tokens_used INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, module_key)
);

CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    vault_path TEXT NOT NULL,
    irr_pct REAL,
    npv REAL,
    recommendation TEXT,
    approved_by TEXT,
    approved_at TEXT,
    generated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    project_filter TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_docs_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_modules_project ON module_outputs(project_id);
CREATE INDEX IF NOT EXISTS idx_inputs_project ON project_inputs(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_project ON reports(project_id);
""")

conn.close()
print(f"Database created at: {os.path.abspath(DATABASE_PATH)}")
print("Database initialised successfully")

import os
import sqlite3
import uuid

from dotenv import load_dotenv

load_dotenv()

DATABASE_PATH = os.getenv("DATABASE_PATH", "data/brikell.db")

conn = sqlite3.connect(DATABASE_PATH)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA foreign_keys=ON")
conn.execute("PRAGMA busy_timeout=5000")

project_id = str(uuid.uuid4())

conn.execute(
    """
    INSERT INTO projects (id, name, address, acquisition_price, gba_sqm, status)
    VALUES (?, ?, ?, ?, ?, ?)
    """,
    (project_id, "Frederiksdalsvej Demo", "Frederiksdalsvej 80-82, Virum", 45000000, 3200, "draft"),
)

conn.commit()
conn.close()
print(project_id)

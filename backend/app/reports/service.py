"""Report generation — renders module outputs into branded PDF via WeasyPrint."""

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

from ..config import settings

TEMPLATE_DIR = Path(__file__).resolve().parent.parent.parent / "templates"


def generate_report(db: sqlite3.Connection, project_id: str) -> dict:
    """Generate a PDF report for a project."""
    project = db.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not project:
        raise ValueError("Project not found")

    # Load module outputs
    rows = db.execute(
        "SELECT * FROM module_outputs WHERE project_id = ? AND status = 'complete' ORDER BY module_number",
        (project_id,),
    ).fetchall()

    modules = []
    executive_summary = None
    for row in rows:
        mod = dict(row)
        if mod["output_data"]:
            mod["output_data"] = json.loads(mod["output_data"])
        if mod["key_metrics"]:
            mod["key_metrics"] = json.loads(mod["key_metrics"])
        if mod["risk_flags"]:
            mod["risk_flags"] = json.loads(mod["risk_flags"])
        modules.append(mod)
        if mod["module_key"] == "mod_20_executive_summary":
            executive_summary = mod

    # Render HTML
    env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)))
    template = env.get_template("report.html")
    html_content = template.render(
        project=dict(project),
        modules=modules,
        executive_summary=executive_summary,
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
    )

    # Generate PDF
    report_id = str(uuid.uuid4())
    report_dir = Path("vault") / project_id / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = report_dir / f"{report_id}.pdf"

    css_path = TEMPLATE_DIR / "report.css"
    stylesheets = [str(css_path)] if css_path.exists() else []
    HTML(string=html_content).write_pdf(str(pdf_path), stylesheets=stylesheets)

    # Update project status
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "UPDATE projects SET status = 'completed', updated_at = ? WHERE id = ?",
        (now, project_id),
    )
    db.commit()

    return {
        "report_id": report_id,
        "pdf_path": str(pdf_path),
        "generated_at": now,
    }


def list_reports(project_id: str) -> list[dict]:
    """List all generated reports for a project."""
    report_dir = Path("vault") / project_id / "reports"
    if not report_dir.exists():
        return []
    reports = []
    for pdf in sorted(report_dir.glob("*.pdf"), key=lambda p: p.stat().st_mtime, reverse=True):
        reports.append({
            "report_id": pdf.stem,
            "filename": pdf.name,
            "generated_at": datetime.fromtimestamp(pdf.stat().st_mtime, tz=timezone.utc).isoformat(),
            "size_bytes": pdf.stat().st_size,
        })
    return reports

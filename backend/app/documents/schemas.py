from pydantic import BaseModel
from typing import Optional


class DocumentResponse(BaseModel):
    id: str
    project_id: str
    filename: str
    original_filename: str
    file_type: str
    file_size_bytes: Optional[int]
    vault_path: str
    document_type: Optional[str]
    parse_status: str
    uploaded_at: str


class DocumentTypeUpdate(BaseModel):
    document_type: str


ALLOWED_DOCUMENT_TYPES = [
    "bbr_extract",
    "floor_plans",
    "energy_certificate",
    "lokalplan",
    "kommuneplan",
    "occupation_permit",
    "building_permit",
    "rent_roll",
    "lease_agreements",
    "financial_model",
    "valuation_report",
    "dgnb_certificate",
    "environmental_report",
    "title_deed",
    "cadastral_map",
    "market_report",
    "structural_survey",
    "insurance_policy",
    "tax_assessment",
    "ownership_structure",
]

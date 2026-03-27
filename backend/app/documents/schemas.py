from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: str
    project_id: str
    filename: str
    original_filename: str
    file_type: str
    file_size_bytes: int | None = None
    vault_path: str
    parse_status: str
    uploaded_at: str

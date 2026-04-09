from pydantic import BaseModel
from typing import Optional, Any


class ModuleOutputResponse(BaseModel):
    id: str
    project_id: str
    module_key: str
    module_number: int
    status: str
    output_data: Optional[Any] = None
    executive_summary: Optional[str] = None
    key_metrics: Optional[Any] = None
    risk_flags: Optional[Any] = None
    created_at: str


class ModuleProgressResponse(BaseModel):
    total: int
    pending: int
    running: int
    complete: int
    failed: int

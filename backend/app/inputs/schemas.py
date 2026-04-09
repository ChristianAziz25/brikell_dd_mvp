from pydantic import BaseModel
from typing import Any, Optional


class InputSave(BaseModel):
    input_type: str  # property, planning, financial, rent_roll
    data: dict[str, Any]


class InputResponse(BaseModel):
    id: str
    project_id: str
    input_type: str
    data: Any
    source: str
    created_at: str

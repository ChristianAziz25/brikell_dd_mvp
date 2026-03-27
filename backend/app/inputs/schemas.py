from pydantic import BaseModel


class InputData(BaseModel):
    input_type: str
    data: dict


class InputResponse(BaseModel):
    id: str
    project_id: str
    input_type: str
    data: dict
    source: str
    created_at: str

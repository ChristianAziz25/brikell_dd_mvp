from pydantic import BaseModel
from typing import Optional


class ProjectCreate(BaseModel):
    name: str
    address: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    address: Optional[str]
    status: str
    created_at: str
    updated_at: str

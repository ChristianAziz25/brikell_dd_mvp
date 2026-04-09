from fastapi import APIRouter

from .schemas import ChatRequest, ChatResponse
from .service import chat

router = APIRouter()


@router.post("", response_model=ChatResponse)
def send_message(body: ChatRequest):
    result = chat(
        body.project_id,
        body.message,
        [m.model_dump() for m in body.history],
    )
    return result

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.projects.router import router as projects_router
from app.documents.router import router as documents_router
from app.inputs.router import router as inputs_router
from app.modules.router import router as modules_router
from app.reports.router import router as reports_router
from app.chat.router import router as chat_router

app = FastAPI(title="Brikell API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects_router, prefix="/api/v1")
app.include_router(documents_router, prefix="/api/v1")
app.include_router(inputs_router, prefix="/api/v1")
app.include_router(modules_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "version": "1.0"}

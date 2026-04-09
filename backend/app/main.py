from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .projects.router import router as projects_router
from .documents.router import router as documents_router
from .inputs.router import router as inputs_router
from .modules.router import router as modules_router
from .reports.router import router as reports_router
from .chat.router import router as chat_router

app = FastAPI(title="Brikell", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects_router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(documents_router, prefix="/api/v1", tags=["documents"])
app.include_router(inputs_router, prefix="/api/v1/projects", tags=["inputs"])
app.include_router(modules_router, prefix="/api/v1/projects", tags=["modules"])
app.include_router(reports_router, prefix="/api/v1", tags=["reports"])
app.include_router(chat_router, prefix="/api/v1/chat", tags=["chat"])


@app.get("/")
def root():
    return {"name": "Brikell API", "version": "0.1.0", "docs": "/docs", "health": "/api/v1/health"}


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}

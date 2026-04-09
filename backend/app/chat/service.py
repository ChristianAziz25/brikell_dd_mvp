"""RAG chat service — answers questions using uploaded document context."""

import re
import sqlite3
from collections import Counter

from ..agents.llm_client import LLMClient
from ..config import settings


SYSTEM_PROMPT = """You are Brikell's AI assistant for Danish commercial real estate due diligence.
Answer questions using ONLY the provided document context. If the context doesn't contain enough
information to answer, say so clearly.

When referencing information, mention which document it came from.
All monetary values are in DKK thousands. All areas in sqm.
Be concise and professional."""


def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def _chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return chunks


def _score_chunk(query: str, chunk: str) -> float:
    """Simple TF-based relevance scoring."""
    query_terms = set(re.findall(r'\w+', query.lower()))
    chunk_lower = chunk.lower()
    chunk_words = re.findall(r'\w+', chunk_lower)
    chunk_freq = Counter(chunk_words)

    score = 0.0
    for term in query_terms:
        if term in chunk_freq:
            score += chunk_freq[term]
        # Bonus for exact substring match
        if term in chunk_lower:
            score += 2.0
    return score


def chat(project_id: str, message: str, history: list[dict]) -> dict:
    """Answer a question using document context from the project."""
    db = _get_db()
    try:
        # Load documents
        docs = db.execute(
            "SELECT original_filename, raw_text FROM documents WHERE project_id = ? AND parse_status = 'parsed'",
            (project_id,),
        ).fetchall()

        # Also load module outputs for additional context
        modules = db.execute(
            "SELECT module_key, executive_summary FROM module_outputs WHERE project_id = ? AND status = 'complete'",
            (project_id,),
        ).fetchall()

        # Build chunks with source tracking
        scored_chunks: list[tuple[float, str, str]] = []

        for doc in docs:
            if not doc["raw_text"]:
                continue
            chunks = _chunk_text(doc["raw_text"])
            for chunk in chunks:
                score = _score_chunk(message, chunk)
                scored_chunks.append((score, chunk, doc["original_filename"]))

        # Add module summaries as chunks
        for mod in modules:
            if mod["executive_summary"]:
                score = _score_chunk(message, mod["executive_summary"])
                scored_chunks.append(
                    (score + 1.0, mod["executive_summary"], f"Module: {mod['module_key']}")
                )

        # Get top-K chunks
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        top_chunks = scored_chunks[:5]

        # Build context
        context_parts = []
        sources = set()
        for _, chunk, source in top_chunks:
            context_parts.append(f"[Source: {source}]\n{chunk}")
            sources.add(source)

        context = "\n\n---\n\n".join(context_parts) if context_parts else "No relevant documents found."

        # Build messages
        user_message = f"""DOCUMENT CONTEXT:
{context}

USER QUESTION:
{message}"""

        llm = LLMClient()

        # Build full message list with history
        messages_context = ""
        if history:
            for msg in history[-6:]:  # Last 3 exchanges
                messages_context += f"\n{msg['role'].upper()}: {msg['content']}"
            messages_context = f"\nCONVERSATION HISTORY:{messages_context}\n"
            user_message = messages_context + user_message

        answer = llm.complete(SYSTEM_PROMPT, user_message)

        return {
            "answer": answer,
            "sources": sorted(sources),
        }

    finally:
        db.close()

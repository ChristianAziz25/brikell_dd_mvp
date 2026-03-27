from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load .env from the project root (one level above backend/)
_project_root = Path(__file__).resolve().parent.parent.parent
load_dotenv(_project_root / ".env")


class Settings(BaseSettings):
    OPENAI_API_KEY: str = ""
    DATABASE_PATH: str = "data/brikell.db"


settings = Settings()

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    OPENAI_API_KEY: str = ""
    DATABASE_PATH: str = "data/brikell.db"

    model_config = {"env_file": str(Path(__file__).resolve().parent.parent.parent / ".env")}


settings = Settings()

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT_DIR / ".env", extra="ignore")

    app_name: str = "Resume JD Matching Demo"
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-5-codex", alias="OPENAI_MODEL")
    openai_embedding_model: str = Field(
        default="text-embedding-3-large",
        alias="OPENAI_EMBEDDING_MODEL",
    )
    database_url: str = Field(
        default="postgresql+psycopg://fangyuanfu@localhost:5432/resume_agent",
        alias="DATABASE_URL",
    )
    max_pdf_size_mb: int = 10
    max_pdf_pages: int = 5
    preset_jd_path: Path = ROOT_DIR / "backend" / "data" / "preset_jds.json"
    runtime_log_dir: Path = ROOT_DIR / "backend" / "data" / "logs"
    jd_upload_dir: Path = ROOT_DIR / "backend" / "data" / "jd_uploads"
    match_parallelism: int = 4


@lru_cache
def get_settings() -> Settings:
    return Settings()

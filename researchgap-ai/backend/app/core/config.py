"""
Typed settings, loaded from backend/.env. Currently only used by modules
that need config values beyond a plain connection string (database.py and
security.py read their own env vars directly via os.getenv + load_dotenv,
which is fine too -- this is for the newer services that want validation).
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    chroma_persist_dir: str = "./chroma_data"
    paper_storage_dir: str = "./paper_files"  # raw uploaded PDFs, for the split-screen reader

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
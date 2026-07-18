"""
Typed settings, loaded from backend/.env. Currently only used by modules
that need config values beyond a plain connection string (database.py and
security.py read their own env vars directly via os.getenv + load_dotenv,
which is fine too -- this is for the newer services that want validation).
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    gemini_api_key: str = "unset"  # not required yet -- Pass 3 (Gemini extraction) will need a real key
    chroma_persist_dir: str = "./chroma_data"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
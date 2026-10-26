"""Application configuration settings loaded from environment variables."""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Core application settings model."""

    app_env: str = "development"
    secret_key: str = "tara-super-secret-jwt-key-replace-in-production-32-chars"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "tara"
    mongo_db_name_test: str = "tara_test"

    seed_password: str = "ChangeMe123!"
    seed_test_phone_1: str | None = None
    seed_test_phone_2: str | None = None
    seed_test_phone_3: str | None = None

    # Bolna Provider Configuration
    bolna_api_key: str = ""
    bolna_api_base: str = "https://api.bolna.ai"
    bolna_agent_id: str = ""
    bolna_from_number: str = ""
    bolna_webhook_secret: str = ""

    # Compliance & Safety Configuration
    test_mode: bool = True
    test_allowlist: str = ""
    call_window_start: str = "09:00"
    call_window_end: str = "21:00"
    contact_cap_count: int = 2
    contact_cap_days: int = 7
    public_base_url: str = "http://localhost:8000"

    # Campaign Execution Configuration
    campaign_max_recipients: int = 200
    campaign_max_concurrent: int = 2
    campaign_dispatch_delay_seconds: float = 5.0

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

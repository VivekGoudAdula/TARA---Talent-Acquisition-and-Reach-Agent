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

    seed_password: str = "ChangeMe123!"
    seed_test_phone_1: str | None = None
    seed_test_phone_2: str | None = None
    seed_test_phone_3: str | None = None

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

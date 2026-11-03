"""
config.py — Application configuration loaded from .env via pydantic-settings.

Usage:
    from app.config import settings
    print(settings.gemini_keys)
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """
    All configuration is read from environment variables or a .env file.
    See .env.example for the full list of required variables.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Gemini API keys (rotated round-robin) ---
    gemini_key_1: str = Field(default="", alias="GEMINI_KEY_1")
    gemini_key_2: str = Field(default="", alias="GEMINI_KEY_2")
    gemini_key_3: str = Field(default="", alias="GEMINI_KEY_3")
    gemini_key_4: str = Field(default="", alias="GEMINI_KEY_4")

    # --- Local LLM ---
    ollama_url: str = Field(default="http://localhost:11434", alias="OLLAMA_URL")
    ollama_model: str = Field(default="llama3.2", alias="OLLAMA_MODEL")

    # --- Auth ---
    jwt_secret: str = Field(default="insecure-dev-secret", alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(default=60, alias="JWT_EXPIRE_MINUTES")

    # --- App ---
    app_env: str = Field(default="development", alias="APP_ENV")
    backend_port: int = Field(default=8000, alias="BACKEND_PORT")
    tick_interval_seconds: float = Field(default=5.0, alias="TICK_INTERVAL_SECONDS")
    simulation_seed: int = Field(default=42, alias="SIMULATION_SEED")

    # --- Database ---
    database_url: str = Field(
        default="sqlite+aiosqlite:///./marketplace.db", alias="DATABASE_URL"
    )

    @property
    def gemini_keys(self) -> List[str]:
        """Return non-empty Gemini keys for rotation."""
        return [
            k for k in [
                self.gemini_key_1,
                self.gemini_key_2,
                self.gemini_key_3,
                self.gemini_key_4,
            ]
            if k
        ]

    @property
    def is_dev(self) -> bool:
        return self.app_env == "development"


# Singleton — import this everywhere
settings = Settings()

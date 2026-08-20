from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "IncidentIQ"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "SECRET_DEV_KEY_INCIDENTIQ_SUPER_SAFE_CHANGE_IN_PROD_12345"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database Settings (Defaults to local SQLite for zero-setup dev, or PostgreSQL when set in env)
    DATABASE_URL: str = "sqlite+aiosqlite:///./incidentiq.db"
    
    # Redis Settings
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # LLM Settings
    LLM_PROVIDER: str = "ollama"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3:8b"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

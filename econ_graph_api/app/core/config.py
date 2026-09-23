from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_ENV: str = "local"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000

    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "econ"
    DB_USER: str = "econ_user"
    DB_PASSWORD: str = "econ_pass"
    DATABASE_URL: str | None = None

    # Security settings
    SECRET_KEY: str = "your-secret-key-change-this-in-production-use-openssl-rand-hex-32"
    GOOGLE_GENERATIVE_AI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-3.6-flash"

    # Observability settings
    LOG_LEVEL: str = "INFO"
    ENABLE_METRICS: bool = True
    ENABLE_STRUCTURED_LOGGING: bool = True
    FORCE_FULL_COMPUTE_ALL: bool = False

    # Insights / notifications
    INSIGHTS_ENABLED: bool = True
    INSIGHTS_AI_ENABLED: bool = True
    INSIGHTS_INTERVAL_MINUTES: int = 30
    INSIGHTS_MAX_PER_PROJECT: int = 3

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def db_url(self) -> str:
        if self.DATABASE_URL:
            url = self.DATABASE_URL.strip()
            if url.startswith("postgres://"):
                url = "postgresql://" + url[len("postgres://"):]
            if url.startswith("postgresql://"):
                return "postgresql+psycopg://" + url[len("postgresql://"):]
            return url
        return (
            f"postgresql+psycopg://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )


settings = Settings()

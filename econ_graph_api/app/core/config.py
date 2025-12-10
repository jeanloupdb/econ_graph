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

    # Observability settings
    LOG_LEVEL: str = "INFO"
    ENABLE_METRICS: bool = True
    ENABLE_STRUCTURED_LOGGING: bool = True
    FORCE_FULL_COMPUTE_ALL: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def db_url(self) -> str:
        return (
            self.DATABASE_URL
            or f"postgresql+psycopg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )


settings = Settings()

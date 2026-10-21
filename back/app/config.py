from pydantic_settings import BaseSettings, SettingsConfigDict


def as_psycopg_url(url: str) -> str:
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://nfl:nfl@localhost:5432/nflstats"
    enable_scheduler: bool = True
    cors_origins: str = "*"
    nfl_api_base: str = "https://api.nfldata.org"
    ai_base_url: str = "https://text.pollinations.ai/openai/v1"
    ai_model: str = "openai"
    ai_api_key: str = ""

    @property
    def sqlalchemy_url(self) -> str:
        return as_psycopg_url(self.database_url)


settings = Settings()

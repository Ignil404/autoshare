from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://autoshare:autoshare@localhost:5432/autoshare"
    SECRET_KEY: str = "change-me-in-production"
    JWT_ACCESS_TTL_MINUTES: int = 60
    JWT_REFRESH_TTL_DAYS: int = 30
    BCRYPT_COST: int = 12

    class Config:
        env_file = ".env"


settings = Settings()

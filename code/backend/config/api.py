import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

class Settings:
    API_HOST: str = os.getenv("API_HOST", "127.0.0.1")
    API_PORT: int = int(os.getenv("API_PORT", 8000))
    API_RELOAD: bool = os.getenv("API_RELOAD", "True").lower() == "true"
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"

settings = Settings()
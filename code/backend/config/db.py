import os
from pathlib import Path
from dotenv import load_dotenv

# Dynamically find project root regardless of where script is executed
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")


class DatabaseConfig:
    """Reads environment variables dynamically and returns PyMySQL connection parameters."""

    @classmethod
    def get_connection_params(cls) -> dict:
        """Returns connection settings formatted for pymysql.connect()."""
        db_host = os.getenv("DB_HOST")
        db_port = os.getenv("DB_PORT")
        db_name = os.getenv("DB_NAME")
        db_user = os.getenv("DB_USER")
        db_password = os.getenv("DB_PASSWORD")

        # Raise an explicit error if critical variables are missing
        missing = [
            name for name, val in [("DB_NAME", db_name), ("DB_USER", db_user), ("DB_PASSWORD", db_password)]
            if not val
        ]
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

        return {
            "host": db_host,
            "port": db_port,
            "user": db_user,
            "password": db_password,
            "database": db_name
        }           
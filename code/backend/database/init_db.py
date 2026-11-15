import os
import sys
from pathlib import Path
import pymysql
import re

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.config.db import DatabaseConfig

def execute_sql_file(cursor, file_path: Path):
    """Reads and executes SQL files, supporting custom DELIMITER statements like //."""
    if not file_path.exists():
        print(f"Skipping {file_path.name} (file not found)")
        return

    print(f"Executing {file_path.name}...")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Check if file contains DELIMITER directives
    if "DELIMITER" in content.upper():
        # Remove lines starting with DELIMITER
        clean_content = re.sub(
            r"(?i)^\s*DELIMITER\s+.*$", "", content, flags=re.MULTILINE
        )
        # Split blocks by //
        statements = [
            stmt.strip() for stmt in clean_content.split("//") if stmt.strip()
        ]
    else:
        # Standard files split directly by ;
        statements = [
            stmt.strip() for stmt in content.split(";") if stmt.strip()
        ]

    # Execute each SQL block independently
    for statement in statements:
        if statement:
            cursor.execute(statement)


def init_db():
    """Creates the database if missing and runs schema, triggers, and seed files."""
    params = DatabaseConfig.get_connection_params()

    # Extract database name and remove it from initial connection parameters
    db_name = params.pop("database")

    if params.get("port"):
        params["port"] = int(params["port"])

    params["client_flag"] = pymysql.constants.CLIENT.MULTI_STATEMENTS

    # 1. Connect to MySQL server without selecting a database
    print("Connecting to MySQL server...")
    connection = pymysql.connect(**params)

    try:
        with connection.cursor() as cursor:
            # 2. Create database if it does not exist
            print(f"Ensuring database '{db_name}' exists...")
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{db_name}` DEFAULT CHARACTER SET utf8mb4;"
            )
            cursor.execute(f"USE `{db_name}`;")

            # 3. Execute SQL files in order
            db_dir = Path(__file__).resolve().parent
            sql_files = [
                db_dir / "schema.sql",
                db_dir / "triggers.sql",
                db_dir / "seed.sql",
            ]

            for sql_file in sql_files:
                execute_sql_file(cursor, sql_file)

        connection.commit()
        print(f"Database '{db_name}' initialized successfully!")

    except Exception as e:
        connection.rollback()
        print(f"Database initialization failed: {e}")
        raise
    finally:
        connection.close()


if __name__ == "__main__":
    init_db()
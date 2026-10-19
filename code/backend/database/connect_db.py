import os
import sys
import pymysql
from pymysql.cursors import DictCursor

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.config.db import DatabaseConfig

def get_connection():
    """
    Creates and returns a new PyMySQL database connection.
    Uses DictCursor so query results are returned as dictionaries instead of tuples.
    """
    params = DatabaseConfig.get_connection_params()
    
    # Ensure port is an integer if provided
    if params.get("port"):
        params["port"] = int(params["port"])
        
    return pymysql.connect(
        **params,
        cursorclass=DictCursor,
        autocommit=True
    )

# Quick connection test script
if __name__ == "__main__":
    try:
        connection = get_connection()
        print("Successfully connected to MySQL database!")
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT VERSION() AS version;")
            result = cursor.fetchone()
            print(f"MySQL Version: {result['version']}")
            
        connection.close()
    except Exception as e:
        print(f"Failed to connect: {e}")
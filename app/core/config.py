import os
import urllib.parse
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DB_SERVER = os.getenv("DB_SERVER")
    DB_NAME = os.getenv("DB_NAME")
    DB_USER = os.getenv("DB_USER")
    DB_PWD = os.getenv("DB_PWD")
    DB_DRIVER = os.getenv("DB_DRIVER", "{ODBC Driver 18 for SQL Server}")
    DB_SCHEMA = os.getenv("DB_SCHEMA", "dbo")
    TABLE_CLAIMS = os.getenv("TABLE_CLAIMS", "Claims")
    TABLE_PROVIDER = os.getenv("TABLE_PROVIDER", "Provider")
    TABLE_PATIENT = os.getenv("TABLE_PATIENT", "Patient")
    TABLE_POLICY = os.getenv("TABLE_POLICY", "Policy")

    KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:29092")
    TOPIC_CLAIMS_RAW = os.getenv("TOPIC_CLAIMS_RAW", "raw_claims")
    TOPIC_CLAIMS_EVALUATED = os.getenv("TOPIC_CLAIMS_EVALUATED", "evaluated_claims")

    @property
    def DATABASE_URL(self) -> str:
        conn = (f"Driver={self.DB_DRIVER};Server=tcp:{self.DB_SERVER},1433;Database={self.DB_NAME};"
                f"Uid={self.DB_USER};Pwd={self.DB_PWD};Encrypt=yes;TrustServerCertificate=yes;Connection Timeout=30;")
        return "mssql+pyodbc:///?odbc_connect=" + urllib.parse.quote_plus(conn)

settings = Settings()
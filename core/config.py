import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Use SQLite for local development!
    DATABASE_URL = "sqlite:///./healthcare_fraud.db"

    # TABLE settings for data tables
    TABLE_CLAIMS = "Claims"
    TABLE_PATIENT = "Patient"
    TABLE_POLICY = "Policy"
    TABLE_PROVIDER = "Provider"
    TABLE_SERVICE = "Service"
    TABLE_LABELS = "LabeledData"

    # Kafka Settings (still here but not critical)
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_TOPIC: str = "healthcare-claims"
    KAFKA_CONSUMER_GROUP: str = "fraud-detection-group"

    # FastAPI Base URL (for the Consumer to send to the ML model)
    APP_BASE_URL: str = "http://localhost:8000"


settings = Settings()
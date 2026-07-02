import json
import logging
import pyodbc
import os
import sys
from confluent_kafka import Consumer, Producer, KafkaError

sys.path.append("/app")
from core.config import settings
from ML.predictor import predictor

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

producer = Producer({"bootstrap.servers": settings.KAFKA_BOOTSTRAP_SERVERS})

def delivery_report(err, msg):
    if err:
        logger.error(f"Kafka delivery failed: {err}")
    else:
        logger.info(f"Sent to {msg.topic()}")

def predict_fraud_score(claim: dict) -> dict:
    result = predictor.predict(claim)
    return {
        "claim_id": claim.get("claim_id"),
        "policy_number": claim.get("policy_number"),
        "provider_id": claim.get("provider_id"),
        "claim_amount": float(claim.get("claim_amount", 0)),
        "fraud_score": result["fraud_score"],
        "is_fraud": result["is_fraud"],
        "risk_level": result["risk_level"],
        "timestamp": claim.get("claim_date", "")
    }

def save_to_sql(data: dict):
    try:
        conn = pyodbc.connect(
            f"DRIVER={settings.DB_DRIVER};"
            f"SERVER=tcp:{settings.DB_SERVER},1433;"
            f"DATABASE={settings.DB_NAME};"
            f"UID={settings.DB_USER};"
            f"PWD={settings.DB_PWD};"
            "Encrypt=yes;TrustServerCertificate=yes;Connection Timeout=30;"
        )
        cursor = conn.cursor()
        query = f"""
        UPDATE {settings.DB_SCHEMA}.{settings.TABLE_CLAIMS}
        SET fraud_score = ?, is_fraud = ?, risk_level = ?
        WHERE claim_id = ?
        """
        cursor.execute(query, (data["fraud_score"], int(data["is_fraud"]), data["risk_level"], data["claim_id"]))
        conn.commit()
        cursor.close()
        conn.close()
        logger.info(f"Updated SQL Server: {data['claim_id']}")
    except Exception as e:
        logger.error(f"SQL error: {e}")

def publish_result(data: dict):
    try:
        producer.produce(settings.TOPIC_CLAIMS_EVALUATED, value=json.dumps(data).encode("utf-8"), callback=delivery_report)
        producer.flush()
        logger.info(f"Published to {settings.TOPIC_CLAIMS_EVALUATED}")
    except Exception as e:
        logger.error(f"Kafka publish error: {e}")

def process_claim(claim: dict):
    logger.info(f"Processing claim: {claim.get('claim_id')}")
    result = predict_fraud_score(claim)
    save_to_sql(result)
    publish_result(result)
    logger.info(f"Completed: {claim.get('claim_id')}")

def run_consumer():
    consumer = Consumer({
        "bootstrap.servers": settings.KAFKA_BOOTSTRAP_SERVERS,
        "group.id": "fraud-detection-group",
        "auto.offset.reset": "earliest",
        "enable.auto.commit": True
    })
    consumer.subscribe([settings.TOPIC_CLAIMS_RAW])
    logger.info("Fraud Consumer started")
    try:
        while True:
            msg = consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() != KafkaError._PARTITION_EOF:
                    logger.error(msg.error())
                continue
            try:
                claim = json.loads(msg.value().decode("utf-8"))
                process_claim(claim)
            except Exception as e:
                logger.error(f"Bad message: {e}")
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        consumer.close()

if __name__ == "__main__":
    run_consumer()
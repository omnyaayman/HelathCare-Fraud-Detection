from confluent_kafka import Consumer, KafkaError
from core.config import settings
import json
import logging
import requests

logger = logging.getLogger(__name__)


consumer_config = {
    "bootstrap.servers": settings.KAFKA_BOOTSTRAP_SERVERS,
    "group.id": settings.KAFKA_CONSUMER_GROUP,
    "auto.offset.reset": "earliest",   
    "enable.auto.commit": True,       
}

consumer = Consumer(consumer_config)


def process_claim(claim_data: dict) -> dict:
    
    try:
        response = requests.post(
            url=f"{settings.APP_BASE_URL}/predict",
            json=claim_data,
            timeout=10,
        )
        response.raise_for_status()
        result = response.json()
        logger.info("Prediction for claim [%s]: %s", claim_data.get("claim_id"), result)
        return result

    except requests.exceptions.RequestException:
        logger.exception("ML model call failed for claim [%s]", claim_data.get("claim_id"))
        raise


def start_consumer():
    
    consumer.subscribe([settings.KAFKA_TOPIC])
    logger.info("Kafka consumer started, listening on topic [%s]...", settings.KAFKA_TOPIC)

    try:
        while True:
            
            msg = consumer.poll(timeout=1.0)

            if msg is None:
                
                continue

            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    
                    logger.debug("End of partition reached: %s [%s]", msg.topic(), msg.partition())
                else:
                    logger.error("Kafka consumer error: %s", msg.error())
                continue

            # Isolate per-message failures so one malformed payload or a
            # transient ML outage doesn't tear down the whole consumer loop.
            try:
                raw_value = msg.value().decode("utf-8")
                claim_data = json.loads(raw_value)
                logger.info("Received claim [%s] from Kafka", claim_data.get("claim_id"))
                process_claim(claim_data)
            except (UnicodeDecodeError, json.JSONDecodeError):
                logger.exception("Skipping malformed Kafka message")
            except Exception:
                logger.exception("Failed to process Kafka claim message")

    except KeyboardInterrupt:
        logger.info("Consumer stopped by user.")

    finally:
        
        consumer.close()
        logger.info("Kafka consumer closed.")


if __name__ == "__main__":
    start_consumer()

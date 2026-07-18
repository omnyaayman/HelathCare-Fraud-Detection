from confluent_kafka import Producer
from core.config import settings
import json
import logging
import uuid

logger = logging.getLogger(__name__)


producer_config = {
    "bootstrap.servers": settings.KAFKA_BOOTSTRAP_SERVERS,  
}


producer = Producer(producer_config)


def delivery_report(err, msg):

    if err is not None:
        logger.error("Kafka delivery failed: %s", err)
    else:
        logger.info("Message delivered to [%s] partition [%s]", msg.topic(), msg.partition())


def send_claim_to_kafka(claim_data: dict) -> str:
    
    try:
        
        claim_id = str(uuid.uuid4())
        claim_data["claim_id"] = claim_id

        
        message = json.dumps(claim_data)

        
        producer.produce(
            topic=settings.KAFKA_TOPIC,
            key=claim_id,
            value=message.encode("utf-8"),
            callback=delivery_report,
        )


        producer.flush()

        logger.info("Claim [%s] sent to Kafka topic [%s]", claim_id, settings.KAFKA_TOPIC)
        return claim_id

    except Exception:
        logger.exception("Kafka producer error")
        raise

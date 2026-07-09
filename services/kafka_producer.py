from confluent_kafka import Producer
from core.config import settings
import json
import uuid


producer_config = {
    "bootstrap.servers": settings.KAFKA_BOOTSTRAP_SERVERS,  
}


producer = Producer(producer_config)


def delivery_report(err, msg):

    if err is not None:
        print(f" Kafka Delivery Failed: {err}")
    else:
        print(f" Message delivered to [{msg.topic()}] partition [{msg.partition()}]")


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

        print(f" Claim [{claim_id}] sent to Kafka topic [{settings.KAFKA_TOPIC}]")
        return claim_id

    except Exception as e:
        print(f" Kafka Producer Error: {e}")
        raise

from confluent_kafka import Consumer, KafkaError
from core.config import settings
import json
import requests


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
        print(f" Prediction for claim [{claim_data.get('claim_id')}]: {result}")
        return result

    except requests.exceptions.RequestException as e:
        print(f" ML Model Call Failed for claim [{claim_data.get('claim_id')}]: {e}")
        raise


def start_consumer():
    
    consumer.subscribe([settings.KAFKA_TOPIC])
    print(f" Kafka Consumer started, listening on topic [{settings.KAFKA_TOPIC}]...")

    try:
        while True:
            
            msg = consumer.poll(timeout=1.0)

            if msg is None:
                
                continue

            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    
                    print(f" End of partition reached: {msg.topic()} [{msg.partition()}]")
                else:
                    print(f" Kafka Consumer Error: {msg.error()}")
                continue

            
            raw_value = msg.value().decode("utf-8")
            claim_data = json.loads(raw_value)

            print(f" Received claim [{claim_data.get('claim_id')}] from Kafka")

            
            process_claim(claim_data)

    except KeyboardInterrupt:
        print(" Consumer stopped by user.")

    finally:
        
        consumer.close()
        print(" Kafka Consumer closed.")


if __name__ == "__main__":
    start_consumer()

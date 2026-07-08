import json
from confluent_kafka import Producer
from core.config import settings

class EventProducer:
    def __init__(self):
        self.producer = Producer({
            "bootstrap.servers": settings.KAFKA_BOOTSTRAP_SERVERS,

            "security.protocol": "SASL_SSL",
            "sasl.mechanisms": "PLAIN",
            "sasl.username": "$ConnectionString",
            "sasl.password": settings.EVENTHUB_CONNECTION_STRING
        })

    def delivery_report(self, err, msg):
        if err:
            print(f"Delivery failed: {err}")
        else:
            print(f"Delivered to {msg.topic()}")

    def send_claim(self, topic, payload):
        self.producer.produce(
            topic,
            json.dumps(payload).encode("utf-8"),
            callback=self.delivery_report
        )

        self.producer.poll(0)

    def close(self):
        self.producer.flush()

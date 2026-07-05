import asyncio
from typing import Optional, Dict, Any
from aiokafka import AIOKafkaProducer

class AppState:
    def __init__(self):
        self.KAFKA_PRODUCER: Optional[AIOKafkaProducer] = None
        self.kafka_ready: bool = False

state = AppState()
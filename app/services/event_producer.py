import os
import json
from azure.eventhub import EventHubProducerClient, EventData

class EventProducer:
    def __init__(self):
        conn_str = os.getenv("EVENTHUB_CONNECTION_STRING")
        eventhub_name = os.getenv("EVENTHUB_NAME")

        if not conn_str:
            raise Exception("EVENTHUB_CONNECTION_STRING is missing")

        if not eventhub_name:
            raise Exception("EVENTHUB_NAME is missing")

        self.conn_str = conn_str
        self.eventhub_name = eventhub_name

        self.client = EventHubProducerClient.from_connection_string(
            conn_str=self.conn_str,
            eventhub_name=self.eventhub_name
        )
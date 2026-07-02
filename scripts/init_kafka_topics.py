#!/usr/bin/env python3
import time
from kafka.admin import KafkaAdminClient, NewTopic
from kafka.errors import TopicAlreadyExistsError

def create_topics():
    print("⏳ Waiting for Kafka to be ready...")
    time.sleep(15)

    admin_client = KafkaAdminClient(
        bootstrap_servers="kafka:29092",
        client_id="init-topics"
    )

    topics = [
        NewTopic(name="raw_claims", num_partitions=3, replication_factor=1),
        NewTopic(name="evaluated_claims", num_partitions=3, replication_factor=1),
    ]

    for topic in topics:
        try:
            admin_client.create_topics([topic])
            print(f"✅ Topic '{topic.name}' created")
        except TopicAlreadyExistsError:
            print(f"ℹ️ Topic '{topic.name}' already exists")
        except Exception as e:
            print(f"❌ Error creating topic '{topic.name}': {e}")

    admin_client.close()
    print("✅ Topics initialization complete!")

if __name__ == "__main__":
    create_topics()
import logging
from datetime import datetime
import pandas as pd
import os

logging.basicConfig(level=logging.INFO)

FRAUD_THRESHOLD = 0.8

def detect_fraud(transaction_id, fraud_score):

    if fraud_score >= FRAUD_THRESHOLD:

        alert = {
            "transaction_id": transaction_id,
            "fraud_score": fraud_score,
            "alert_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "status": "HIGH RISK"
        }

        logging.warning(f"""
        FRAUD ALERT DETECTED
        Transaction ID: {transaction_id}
        Fraud Score: {fraud_score}
        Time: {alert['alert_time']}
        """)

        save_alert(alert)

        return alert

    else:
        logging.info(f"Transaction {transaction_id} is safe.")
        return None


def save_alert(alert):

    file_name = "fraud_alerts.csv"

    df = pd.DataFrame([alert])

    if os.path.exists(file_name):
        df.to_csv(file_name, mode='a', header=False, index=False)
    else:
        df.to_csv(file_name, index=False)

    logging.info("Alert saved successfully.")

    
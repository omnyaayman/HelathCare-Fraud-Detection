<p align="center">
  <img src="https://svg-banners.vercel.app/api?type=origin&text1=Healthcare%20Fraud&text2=Detection%20System%20🚀&width=900&height=200&color=0078D4"/>
</p>

# 🏥 Healthcare Fraud Detection System (Enterprise Edition)

[![FastAPI](https://img.shields.io/badge/API-FastAPI-05998b.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Apache Spark](https://img.shields.io/badge/Engine-Apache_Spark-E25A1C.svg?style=flat&logo=apachespark)](https://spark.apache.org/)
[![Delta Lake](https://img.shields.io/badge/Storage-Delta_Lake-00ADD8.svg?style=flat&logo=delta-lake)](https://delta.io/)
[![Azure](https://img.shields.io/badge/Cloud-Azure_SQL-0089D6.svg?style=flat&logo=microsoftazure)](https://azure.microsoft.com/)

## 📌 Project Overview
An advanced, end-to-end healthcare fraud detection pipeline. This system processes medical claims in **real-time** via FastAPI and handles **Big Data batch processing** using PySpark and Delta Lake. The core logic utilizes an **XGBoost** model paired with a custom **Medical Logic Engine** to flag suspicious activities.

---

## 🎯 Key Features
- **Real-time Inference:** REST API to audit claims instantly.
- **Explainable AI:** Uses PDP plots to explain why a claim was flagged (Distance, Red Flags, etc.).
- **Medallion Architecture:** Data organized into Bronze, Silver, and Gold layers within **Delta Lake**.
- **Medical Logic Engine:** Specialized rules to detect Z-score anomalies and medical mismatches.
- **Message Broker Integration:** Asynchronous processing using **RabbitMQ**.

---

## 🏗️ Project Architecture & Directory Structure
The system follows a modular production-ready structure:

```text
Healthcare-Fraud-System/
├── 📁 app/               # FastAPI layer (Routes, Schemas, Main)
├── 📁 core/              # Global Configurations (.env handler)
├── 📁 services/          # External Connectors (Azure SQL, RabbitMQ)
├── 📁 ml/                # XGBoost Model & Logic Engine
├── 📁 spark_worker/      # Big Data Processing (Delta Lake handler)
├── 📁 notebooks/         # EDA & Model Training Research
├── 📄 .env               # Environment Secrets (Not for GitHub)
└── 📄 requirements.txt   # Production Dependencies
<p align="center">
  <img src="https://svg-banners.vercel.app/api?type=origin&text1=Healthcare%20Fraud&text2=Detection%20System%20🚀&width=900&height=200&color=0078D4"/>
</p>

# 🏥 Healthcare Fraud Detection System 

[![FastAPI](https://img.shields.io/badge/API-FastAPI-05998b.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Apache Spark](https://img.shields.io/badge/Engine-Apache_Spark-E25A1C.svg?style=flat&logo=apachespark)](https://spark.apache.org/)
[![Delta Lake](https://img.shields.io/badge/Storage-Delta_Lake-00ADD8.svg?style=flat&logo=delta-lake)](https://delta.io/)
[![Azure](https://img.shields.io/badge/Cloud-Azure_SQL-0089D6.svg?style=flat&logo=microsoftazure)](https://azure.microsoft.com/)

## 📌 Project Overview
An advanced, end-to-end healthcare fraud detection pipeline. This system processes medical claims in **real-time** via FastAPI and handles **Big Data processing** using PySpark and Delta Lake. The core logic utilizes an **XGBoost** model paired with a custom **Medical Logic Engine** to flag suspicious activities.

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
├── 📁 core/              # # Global Configurations (.env handler)
├── 📁 frontend/             # interface of web
├── 📁 ml/                # XGBoost Model & Logic Engine
├── 📁 services/          # External Connectors (Azure SQL, RabbitMQ)
├── 📁 spark/      # Big Data Processing (Delta Lake handler)
├── 📄 .env               # Environment Secrets (Not for GitHub)
└── 📄 requirements.txt   # Production Dependencies
```
---

## 🖥️ Frontend

The system includes a **React-based dashboard** built using **Vite** for fast development and optimized builds. The frontend provides an interface to submit medical claims, visualize fraud predictions, and display analytics such as feature importance and anomaly indicators.

### Requirements

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Setup Instructions

1. Navigate to the `frontend/` directory:
  ```bash
  cd frontend
  ```
2. Install dependencies:
  ```bash
  npm install
  # or
  yarn install
  ```
3. Start the development server:
  ```bash
  npm run dev
  # or
  yarn dev
  ```

### Main Dependencies

- `react`, `react-dom` – Core UI library
- `react-router-dom` – Routing
- `chart.js`, `react-chartjs-2` – Data visualization
- `lucide-react` – Icon set
- `tailwindcss` – Utility-first CSS framework
- `vite` – Fast build tool

For development, ESLint and TypeScript types are included for code quality and type safety.
--- 
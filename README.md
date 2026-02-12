
<p align="center">
  <img src="https://svg-banners.vercel.app/api?type=origin&text1=Healthcare&%250 Fraud Detection &width=900&height=150&color=blue" />
</p>
 
<h1 align="center" style="color:#3498DB;">
  
</h1>


🏥 Healthcare Fraud Detection System

📌 Project Overview
This project aims to detect fraudulent healthcare claims using data engineering techniques and a Machine Learning model.
The pipeline follows a simplified data architecture with structured data layers and SQL analysis before applying a fraud detection ML model.

---
 
🎯 Project Objectives
Clean and prepare healthcare claims data
Perform exploratory data analysis (EDA)
Apply SQL queries for analytical insights
Build a Machine Learning model for fraud detection
Evaluate model performance

---

🏗️ Project Architecture
The project structure is organized as follows

healthcare-fraud-detection
│
├── data
│   ├── bronze   → Raw data
│   ├── silver   → Cleaned & processed data
│   └── gold     → Final analytical dataset
│
├── notebooks    → EDA & ML notebooks
├── sql          → SQL queries for analysis
├── models       → Saved ML models
├── requirements.txt
└── README.md

---

🛠️ Tools & Technologies
Python
Pandas
NumPy
SQL
Scikit-learn
Matplotlib

---

📊 Machine Learning Model
The fraud detection model classifies claims as:
Legitimate Claim
Fraudulent Claim
Steps:
Data preprocessing
Feature selection
Model training
Model evaluation (Accuracy, Precision, Recall)

---

📈 Future Improvements
Add advanced feature engineering
Handle imbalanced datasets
Deploy model as API
Automate data pipeline

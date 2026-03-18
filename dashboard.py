import streamlit as st
import pandas as pd

st.title("Healthcare Fraud Detection Dashboard 🚨")

claims = pd.read_csv("data/gold/claims_per_patient.csv")
avg_cost = pd.read_csv("data/gold/avg_cost.csv")
fraud = pd.read_csv("data/gold/fraud_cases.csv")

st.subheader("عدد العمليات لكل مريض")
st.dataframe(claims)

st.subheader("متوسط التكلفة لكل مريض")
st.dataframe(avg_cost)

st.subheader("الحالات المشبوهة")
st.dataframe(fraud)
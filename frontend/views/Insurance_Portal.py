import streamlit as st

if not st.session_state.get("logged_in"):
    st.error("You must be logged in to access this page.")
    st.stop()
elif st.session_state.get("role") != "Insurance":
    st.error("Access denied. This page is restricted to Insurance users only.")
    st.stop()

st.title("Insurance Investigation Dashboard")

col1, col2, col3 = st.columns(3)
with col1:
    st.metric("Total Claims", "0")
with col2:
    st.metric("Fraud Cases", "0")
with col3:
    st.metric("Fraud Rate", "0%")

st.divider()

tab1, tab2 = st.tabs(["Investigate Claims", "Reports"])

with tab1:
    st.subheader("Investigate Claims")
    search_col, filter_col = st.columns([3, 1])
    with search_col:
        st.text_input("Search", placeholder="Search by Claim ID, Patient ID, or Hospital name...")
    with filter_col:
        st.selectbox("Status", ["All", "Pending", "Approved", "Flagged", "Rejected"])
    st.info("No claims to display. Data will appear once the backend is connected.")

with tab2:
    st.subheader("Fraud Reports")
    st.info("No report data available yet.")
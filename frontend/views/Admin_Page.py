import streamlit as st

if not st.session_state.get("logged_in"):
    st.error("You must be logged in to access this page.")
    st.stop()
elif st.session_state.get("role") != "Admin":
    st.error("Access denied. This page is restricted to Administrators only.")
    st.stop()

st.title("Admin Control Panel")

tab1, tab2, tab3 = st.tabs([
    "Retrain Model",
    "Manage Users",
    "Model Metrics"
])

with tab1:
    st.subheader("Retrain Fraud Detection Model")
    st.write("Retrain the model using new stored claims data to improve accuracy and adapt to emerging fraud patterns.")
    st.divider()
    if st.button("Retrain Model", use_container_width=True):
        st.warning("Model retraining is not yet connected to the backend.")

with tab2:
    st.subheader("User Management")
    st.info("still havent added this.")

with tab3:
    st.subheader("Model Performance Metrics")
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Accuracy",  value="-")
    with col2:
        st.metric("Precision", value="-")
    with col3:
        st.metric("....",    value="-")
    with col4:
        st.metric("....",  value="-")
    st.divider()
    st.info("Connect the backend to display live model performance metrics.")
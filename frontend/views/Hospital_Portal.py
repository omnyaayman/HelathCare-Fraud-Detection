import streamlit as st

if not st.session_state.get("logged_in"):
    st.error("You must be logged in to access this page.")
    st.stop()
elif st.session_state.get("role") != "Hospital":
    st.error("Access denied. This page is restricted to Hospital users only.")
    st.stop()

st.title("Hospital Portal")

tab1, tab2, tab3, tab4 = st.tabs([
    "Submit Claim",
    "Track Claim",
    "Fraud Score",
    "Claim History"
])

with tab1:
    st.subheader("Submit a New Claim")
    st.info("INPUT FEATURES WILL CHANGE LATER THIS IS ONLY FOR DISPLAY")
    with st.form("claim_form", clear_on_submit=True):
        col1, col2 = st.columns(2)
        with col1:
            patient_id    = st.text_input("Patient ID *", placeholder="e.g. PAT-00123")
            admission_date = st.date_input("Admission Date")
            diagnosis     = st.text_input("Diagnosis Code (ICD-10)", placeholder="e.g. J18.9")
        with col2:
            claim_amount   = st.number_input("Claim Amount ($) *", min_value=0.0, step=100.0)
            discharge_date = st.date_input("Discharge Date")
            procedure      = st.text_input("Procedure Code", placeholder="e.g. 99213")
        notes = st.text_area("Additional Notes", placeholder="Any relevant clinical notes...")
        submitted = st.form_submit_button("Submit Claim", use_container_width=True)
        if submitted:
            if not patient_id or claim_amount <= 0:
                st.error("Patient ID and a valid Claim Amount are required.")
            elif discharge_date < admission_date:
                st.error("Discharge date cannot be before admission date.")
            else:
                st.success("Claim submitted successfully! It will be reviewed shortly.")

with tab2:
    st.subheader("Track Claim Status")
    claim_id = st.text_input("Enter Claim ID", placeholder="e.g. CLM-00456")
    if st.button("Search", use_container_width=True):
        if claim_id:
            st.info(f"No claim found for ID **{claim_id}**. Please check the ID and try again.")
        else:
            st.warning("Please enter a Claim ID to search.")

with tab3:
    st.subheader("View Fraud Risk Score")
    st.info("Submit a claim first to see its fraud risk score here. High-risk claims will be flagged for review.")

with tab4:
    st.subheader("Claim History")
    st.info("No claims have been submitted yet. Use the Submit Claim tab to add your first claim.")
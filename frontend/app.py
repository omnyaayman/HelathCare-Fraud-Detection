import streamlit as st
import os

st.set_page_config(
    page_title="Health Insurance Fraud Detection",
    layout="wide"
)

if "logged_in" not in st.session_state:
    st.session_state.logged_in = False
if "role" not in st.session_state:
    st.session_state.role = None
if "username" not in st.session_state:
    st.session_state.username = None

if not st.session_state.logged_in:
    st.markdown("""
    <style>
        [data-testid="stSidebar"]        { display: none !important; }
        [data-testid="collapsedControl"] { display: none !important; }
    </style>
    """, unsafe_allow_html=True)

    st.title("Health Insurance Fraud Detection")
    st.write("Secure portal for hospitals, insurers, and administrators")

    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        with st.container(border=True):
            st.subheader("Login")
            username = st.text_input("Username", placeholder="Enter your username")
            password = st.text_input("Password", type="password", placeholder="Enter your password")
            role = st.selectbox("Login As", ["Hospital", "Insurance", "Admin"])

            if st.button("Login", use_container_width=True):
                if not username or not password:
                    st.error("Please enter both username and password.")
                else:
                    st.session_state.logged_in = True
                    st.session_state.username = username
                    st.session_state.role = role
                    st.rerun()

else:
    with st.sidebar:
        st.markdown("### Health Insurance Fraud Detection")
        st.divider()
        st.markdown(f"**{st.session_state.username}**")
        st.caption(f"Role: {st.session_state.role}")
        if st.button("Logout", use_container_width=True):
            st.session_state.logged_in = False
            st.session_state.role = None
            st.session_state.username = None
            st.rerun()

    base_path = os.path.dirname(os.path.abspath(__file__))

    if st.session_state.role == "Admin":
        exec(open(os.path.join(base_path, "views", "Admin_Page.py")).read())
    elif st.session_state.role == "Hospital":
        exec(open(os.path.join(base_path, "views", "Hospital_Portal.py")).read())
    elif st.session_state.role == "Insurance":
        exec(open(os.path.join(base_path, "views", "Insurance_Portal.py")).read())
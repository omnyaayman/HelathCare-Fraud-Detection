#!/usr/bin/env python3
import os
import sys
import time
import requests
from dotenv import load_dotenv

load_dotenv()

METABASE_URL = os.environ.get("METABASE_URL", "http://metabase:3000")
EMAIL = os.environ.get("MB_ADMIN_EMAIL", "admin@metabase.com")
PASSWORD = os.environ.get("MB_ADMIN_PASSWORD", "metabase123")

REPORTING_DB_HOST = os.environ.get("REPORTING_DB_HOST", "reporting-db")
REPORTING_DB_PORT = int(os.environ.get("REPORTING_DB_PORT", 5432))
REPORTING_DB_USER = os.environ.get("REPORTING_DB_USER", "reporting")
REPORTING_DB_PASSWORD = os.environ.get("REPORTING_DB_PASSWORD", "reporting123")
REPORTING_DB_NAME = os.environ.get("REPORTING_DB_NAME", "reporting")

session = requests.Session()

def wait_for_metabase(max_retries=60, wait=10):
    print(f"⏳ Checking Metabase readiness at {METABASE_URL}...")
    for attempt in range(max_retries):
        try:
            resp = session.get(f"{METABASE_URL}/api/health", timeout=5)
            if resp.status_code == 200:
                print("✅ Metabase is ready!")
                return True
        except:
            pass
        print(f"⏳ Attempt {attempt+1}/{max_retries}: Metabase not ready yet. Waiting {wait}s...")
        time.sleep(wait)
    return False

def get_setup_token():
    for _ in range(10):
        try:
            resp = session.get(f"{METABASE_URL}/api/session/properties")
            if resp.status_code == 200:
                data = resp.json()
                token = data.get("setup-token")
                if token:
                    return token
        except:
            pass
        time.sleep(3)
    return None

def setup_metabase(token):
    payload = {
        "token": token,
        "user": {
            "email": EMAIL,
            "password": PASSWORD,
            "first_name": "Admin",
            "last_name": "User"
        },
        "database": {
            "name": "Reporting DB - Fraud Insights",
            "engine": "postgres",
            "details": {
                "host": REPORTING_DB_HOST,
                "port": REPORTING_DB_PORT,
                "dbname": REPORTING_DB_NAME,
                "user": REPORTING_DB_USER,
                "password": REPORTING_DB_PASSWORD,
                "ssl": False
            }
        },
        "prefs": {
            "site_name": "Fraud Detection Dashboard",
            "site_url": "http://localhost:3000"
        }
    }
    try:
        resp = session.post(f"{METABASE_URL}/api/setup", json=payload, timeout=120)
        if resp.status_code in (200, 201):
            print("✅ Metabase setup completed successfully!")
            return True
        else:
            print(f"❌ Setup failed: {resp.text}")
            return False
    except Exception as e:
        print(f"❌ Setup error: {e}")
        return False

def login():
    for _ in range(15):
        try:
            resp = session.post(
                f"{METABASE_URL}/api/session",
                json={"username": EMAIL, "password": PASSWORD},
                timeout=30
            )
            if resp.status_code == 200:
                token = resp.json().get("id")
                session.headers.update({"X-Metabase-Session": token})
                print("✅ Logged in successfully")
                return token
        except:
            pass
        time.sleep(5)
    return None

def enable_public_sharing():
    """تمكين المشاركة العامة في Metabase"""
    try:
        # محاولة تمكين المشاركة العامة عبر API
        resp = session.put(
            f"{METABASE_URL}/api/setting/public_sharing_enabled",
            json={"value": True}
        )
        if resp.status_code in (200, 201, 204):
            print("✅ Public sharing enabled successfully!")
            return True
        else:
            # محاولة الطريقة البديلة
            resp = session.post(
                f"{METABASE_URL}/api/setting",
                json={"public_sharing_enabled": True}
            )
            if resp.status_code in (200, 201, 204):
                print("✅ Public sharing enabled successfully!")
                return True
            else:
                print(f"⚠️ Could not enable public sharing: {resp.text}")
                return False
    except Exception as e:
        print(f"❌ Error enabling public sharing: {e}")
        return False

def create_dashboard_and_public_link(db_id, collection_id):
    dash_resp = session.post(
        f"{METABASE_URL}/api/dashboard",
        json={
            "name": "Fraud Detection Dashboard",
            "description": "Dashboard reading from Reporting DB (PostgreSQL)",
            "collection_id": collection_id
        }
    )
    if dash_resp.status_code not in (200, 201):
        print(f"❌ Failed to create dashboard: {dash_resp.text}")
        return None
    dash_id = dash_resp.json().get("id")
    print(f"✅ Dashboard created (ID: {dash_id})")

    # محاولة تمكين الرابط العام
    pub_resp = session.post(f"{METABASE_URL}/api/dashboard/{dash_id}/public_link")
    if pub_resp.status_code == 200:
        uuid = pub_resp.json().get("uuid")
        public_url = f"{METABASE_URL}/public/dashboard/{uuid}"
        print(f"🔓 Public link enabled: {public_url}")
        return public_url
    else:
        print(f"⚠️ Could not enable public link: {pub_resp.text}")
        return None

def main():
    print("=" * 60)
    print("🚀 Metabase Auto-Setup + Public Dashboard (PostgreSQL)")
    print("=" * 60)

    if not wait_for_metabase():
        print("❌ Metabase not ready.")
        sys.exit(1)

    token = get_setup_token()
    if token:
        print("✅ Setup token obtained.")
        if not setup_metabase(token):
            print("❌ Setup failed. Exiting.")
            sys.exit(1)
    else:
        print("ℹ️ No setup token. Assuming Metabase already set up.")

    session_token = login()
    if not session_token:
        print("❌ Login failed. Check credentials.")
        sys.exit(1)

    # تمكين المشاركة العامة
    enable_public_sharing()

    # التأكد من وجود قاعدة البيانات
    db_resp = session.get(f"{METABASE_URL}/api/database")
    db_id = None
    if db_resp.status_code == 200:
        for db in db_resp.json().get("data", []):
            if db.get("name") == "Reporting DB - Fraud Insights":
                db_id = db["id"]
                break
        if not db_id:
            create_db_payload = {
                "name": "Reporting DB - Fraud Insights",
                "engine": "postgres",
                "details": {
                    "host": REPORTING_DB_HOST,
                    "port": REPORTING_DB_PORT,
                    "dbname": REPORTING_DB_NAME,
                    "user": REPORTING_DB_USER,
                    "password": REPORTING_DB_PASSWORD,
                    "ssl": False
                },
                "is_full_sync": True
            }
            create_resp = session.post(f"{METABASE_URL}/api/database", json=create_db_payload)
            if create_resp.status_code in (200, 201):
                db_id = create_resp.json().get("id")
                print(f"✅ Reporting database connected (ID: {db_id})")
            else:
                print(f"❌ Failed to connect database: {create_resp.text}")
                sys.exit(1)

    # إنشاء Collection
    coll_resp = session.post(
        f"{METABASE_URL}/api/collection",
        json={
            "name": "Fraud Detection Dashboards",
            "description": "Public dashboards",
            "color": "#EF4444"
        }
    )
    if coll_resp.status_code in (200, 201):
        collection_id = coll_resp.json().get("id")
        print(f"✅ Collection created (ID: {collection_id})")
    else:
        collection_id = None

    public_url = create_dashboard_and_public_link(db_id, collection_id)
    if public_url:
        print("\n" + "=" * 60)
        print("✅ Public link generated successfully!")
        print("📌 Open this link directly (NO LOGIN REQUIRED):")
        print(f"   {public_url}")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("⚠️ Could not generate public link.")
        print("🌐 Open Metabase UI and create dashboard manually:")
        print(f"   {METABASE_URL}")
        print(f"   👤 {EMAIL}")
        print(f"   🔑 {PASSWORD}")
        print("=" * 60)

if __name__ == "__main__":
    print("⏳ Waiting 10 seconds before initialization...")
    time.sleep(10)
    main()
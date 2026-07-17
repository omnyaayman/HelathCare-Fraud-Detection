
import requests
import base64

# Encode credentials
username = "admin_insurance"
password = "password123"
credentials = f"{username}:{password}"
encoded_creds = base64.b64encode(credentials.encode()).decode()

headers = {
    "Authorization": f"Basic {encoded_creds}",
    "Accept": "application/json"
}

# Test /api/stats
print("=== Testing /api/stats ===")
try:
    r = requests.get("http://localhost:8000/api/stats", headers=headers)
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
except Exception as e:
    print(f"Error: {e}")

# Test /api/charts/monthly-claims
print("\n=== Testing /api/charts/monthly-claims ===")
try:
    r = requests.get("http://localhost:8000/api/charts/monthly-claims", headers=headers)
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
except Exception as e:
    print(f"Error: {e}")

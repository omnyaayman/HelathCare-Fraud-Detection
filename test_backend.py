
import requests

BASE_URL = "http://localhost:8000"

# Test login (basic auth)
auth = ("admin_insurance", "password123")

print("Testing /stats endpoint...")
response = requests.get(f"{BASE_URL}/stats", auth=auth)
print("Status code:", response.status_code)
print("Response data:", response.json())

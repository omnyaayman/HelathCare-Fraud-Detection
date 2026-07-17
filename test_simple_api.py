
import urllib.request
import base64
import json

username = "admin_insurance"
password = "password123"
credentials = f"{username}:{password}".encode()
encoded_credentials = base64.b64encode(credentials).decode()

url = "http://127.0.0.1:8000/api/stats"
req = urllib.request.Request(url)
req.add_header("Authorization", f"Basic {encoded_credentials}")

try:
    with urllib.request.urlopen(req, timeout=10) as response:
        data = json.loads(response.read().decode())
        print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error: {e}")

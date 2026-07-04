#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "Starting Healthcare Fraud Detection stack..."
docker compose up --build -d

echo ""
echo "Services are starting."
echo "- Frontend: http://127.0.0.1:5173"
echo "- API health: http://127.0.0.1:8000/health"
echo "- Airflow: http://127.0.0.1:8081"
echo "- Metabase: http://127.0.0.1:3000"

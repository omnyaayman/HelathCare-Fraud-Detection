import asyncio
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "app"))

from app.routes import process_claim
from app.schemas import ClaimCreate
from core.state import state


class FailingDB:
    def execute(self, *args, **kwargs):
        raise RuntimeError("db unavailable")

    def commit(self):
        raise AssertionError("commit should not be called")

    def rollback(self):
        pass


@pytest.mark.parametrize("db_obj", [FailingDB()])
def test_process_claim_falls_back_when_database_is_unavailable(db_obj):
    state.KAFKA_PRODUCER = None
    claim = ClaimCreate(policy_number="POL-123", claim_amount=150.0, service_type="Cardiology")

    response = asyncio.run(process_claim(claim, db_obj))

    assert response["status"] == "queued"
    assert response["prediction"] in {"Fraud", "Legitimate"}

"""Unit tests for app/schemas.py Pydantic models.

Covers default values, required-field enforcement, and the numeric/string
constraints declared with ``Field`` (gt, ge, le), none of which had any
automated coverage.
"""

import datetime

import pytest
from pydantic import ValidationError

from app.schemas import (
    ClaimCreate,
    ClaimUpdate,
    DashboardStats,
    LabeledRecordCreate,
    LoginResponse,
    PatientUpdate,
    PolicyUpdate,
    UserLogin,
)


class TestClaimCreate:
    def test_minimal_valid_payload_applies_defaults(self):
        c = ClaimCreate(policy_number="XAI1", claim_amount=100.0, service_type="Inpatient")
        assert c.diagnosis_code == "N/A"
        assert c.procedure_code == "N/A"
        assert c.admission_type == "Emergency"
        assert c.distance_miles == 0.0
        assert c.hospital_id is None
        assert c.check_only is False

    def test_claim_amount_must_be_positive(self):
        with pytest.raises(ValidationError):
            ClaimCreate(policy_number="X", claim_amount=0, service_type="Inpatient")

    def test_missing_required_field_raises(self):
        with pytest.raises(ValidationError):
            ClaimCreate(claim_amount=10.0, service_type="Inpatient")


class TestClaimUpdate:
    def test_label_optional(self):
        u = ClaimUpdate(status="Fraud Confirmed")
        assert u.label is None

    def test_status_required(self):
        with pytest.raises(ValidationError):
            ClaimUpdate(label="Fraud")


class TestPolicyUpdate:
    def test_all_fields_optional(self):
        p = PolicyUpdate()
        assert p.copay is None and p.annual_deductible is None and p.policy_end is None

    def test_copay_upper_bound(self):
        with pytest.raises(ValidationError):
            PolicyUpdate(copay=101)

    def test_copay_lower_bound(self):
        with pytest.raises(ValidationError):
            PolicyUpdate(copay=-1)

    def test_copay_within_range(self):
        assert PolicyUpdate(copay=50).copay == 50

    def test_negative_deductible_rejected(self):
        with pytest.raises(ValidationError):
            PolicyUpdate(annual_deductible=-5)

    def test_policy_end_accepts_date(self):
        d = datetime.date(2025, 1, 1)
        assert PolicyUpdate(policy_end=d).policy_end == d


class TestPatientUpdate:
    def test_age_bounds(self):
        with pytest.raises(ValidationError):
            PatientUpdate(age=121)
        with pytest.raises(ValidationError):
            PatientUpdate(age=-1)

    def test_valid_age(self):
        assert PatientUpdate(age=30).age == 30

    def test_all_optional(self):
        assert PatientUpdate().name is None


class TestLabeledRecordCreate:
    def test_required_fields(self):
        r = LabeledRecordCreate(claim_id="C1", amount=10.0, label="Fraud")
        assert r.claim_id == "C1"
        assert r.patient_name is None

    def test_missing_amount_raises(self):
        with pytest.raises(ValidationError):
            LabeledRecordCreate(claim_id="C1", label="Fraud")


class TestDashboardStats:
    def test_defaults_for_optional_fields(self):
        s = DashboardStats(
            total_claims=1,
            flagged_claims=0,
            confirmed_fraud=0,
            cleared_claims=0,
            total_patients=1,
            model_accuracy=0.9,
            model_precision=0.9,
            model_recall=0.9,
            model_f1=0.9,
        )
        assert s.last_retrain is None
        assert s.model_history == []

    def test_from_attributes_enabled(self):
        assert DashboardStats.model_config.get("from_attributes") is True


class TestAuthModels:
    def test_user_login_requires_both(self):
        with pytest.raises(ValidationError):
            UserLogin(username="a")

    def test_login_response_fields(self):
        r = LoginResponse(username="a", role="admin", message="ok")
        assert r.role == "admin"

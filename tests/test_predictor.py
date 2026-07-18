"""Unit tests for ML/predictor.py.

These focus on the deterministic feature-engineering and normalization logic
(the part of the module with no automated coverage), plus the documented
fallback behaviour of ``FraudPredictor.predict`` when the model is missing or
raises. Tests that build feature rows use a bare ``FraudPredictor`` instance
with explicitly controlled encoders so they never depend on the pickled
artifacts on disk.
"""

import datetime

import pandas as pd
import pytest
from sklearn.preprocessing import LabelEncoder

from ML import predictor as predictor_module
from ML.predictor import (
    DEFAULTS,
    FIELD_ALIASES,
    FraudPredictor,
    _first_present,
    _normalize,
    _to_date,
)
from core.constants import FRAUD_THRESHOLD


def make_predictor(encoders=None, feature_order=None, model=None):
    """Build a FraudPredictor without triggering artifact loading in __init__."""
    p = FraudPredictor.__new__(FraudPredictor)
    p.model = model
    p.encoders = encoders
    p.feature_order = feature_order
    return p


# --------------------------------------------------------------------------- #
# _first_present
# --------------------------------------------------------------------------- #
class TestFirstPresent:
    def test_returns_first_matching_alias(self):
        assert _first_present({"b": 2, "a": 1}, ["a", "b"]) == 1

    def test_alias_order_wins(self):
        # "b" comes first in the alias list, so it takes precedence over "a"
        assert _first_present({"a": 1, "b": 2}, ["b", "a"]) == 2

    def test_skips_none_values(self):
        assert _first_present({"a": None, "b": 5}, ["a", "b"]) == 5

    def test_returns_none_when_absent(self):
        assert _first_present({"x": 1}, ["a", "b"]) is None

    def test_zero_is_a_valid_value(self):
        assert _first_present({"a": 0}, ["a"]) == 0


# --------------------------------------------------------------------------- #
# _normalize
# --------------------------------------------------------------------------- #
class TestNormalize:
    def test_maps_snake_case_aliases_to_canonical(self):
        row = _normalize({"claim_amount": 100.0, "age": 30, "service_type": "Inpatient"})
        assert row["Claim_Amount"] == 100.0
        assert row["Patient_Age"] == 30
        assert row["Service_Type"] == "Inpatient"

    def test_fills_defaults_for_missing_fields(self):
        row = _normalize({})
        for canonical, default in DEFAULTS.items():
            assert row[canonical] == default

    def test_output_has_every_canonical_key(self):
        row = _normalize({})
        assert set(row.keys()) == set(FIELD_ALIASES.keys())

    def test_supplied_value_overrides_default(self):
        row = _normalize({"Patient_Age": 7})
        assert row["Patient_Age"] == 7

    def test_none_value_falls_back_to_default(self):
        row = _normalize({"Patient_Age": None})
        assert row["Patient_Age"] == DEFAULTS["Patient_Age"]

    def test_date_fields_default_to_none(self):
        row = _normalize({})
        assert row["Claim_Date"] is None
        assert row["Service_Date"] is None
        assert row["Policy_Expiration_Date"] is None


# --------------------------------------------------------------------------- #
# _to_date
# --------------------------------------------------------------------------- #
class TestToDate:
    def test_none_returns_fallback(self):
        fallback = pd.Timestamp("2020-01-01")
        assert _to_date(None, fallback) is fallback

    def test_parses_iso_string(self):
        assert _to_date("2021-06-15", None) == pd.Timestamp("2021-06-15")

    def test_invalid_string_returns_fallback(self):
        fallback = pd.Timestamp("2019-12-31")
        assert _to_date("not-a-date", fallback) is fallback


# --------------------------------------------------------------------------- #
# _build_feature_row
# --------------------------------------------------------------------------- #
class TestBuildFeatureRow:
    def test_derived_ratios(self):
        p = make_predictor(encoders={})
        feats = p._build_feature_row(
            {"Claim_Amount": 1000.0, "Number_of_Procedures": 4, "Deductible_Amount": 99.0}
        )
        assert feats["amount_per_procedure"] == pytest.approx(1000.0 / 5)
        assert feats["claim_to_deductible_ratio"] == pytest.approx(1000.0 / 100)

    def test_boolean_flags(self):
        p = make_predictor(encoders={})
        feats = p._build_feature_row(
            {
                "Claim_Amount": 1000.0,
                "Provider_Patient_Distance_Miles": 600,
                "Number_of_Previous_Claims_Patient": 6,
                "Number_of_Previous_Claims_Provider": 21,
                "Claim_Submitted_Late": True,
            }
        )
        assert feats["is_far_provider"] == 1
        assert feats["high_claim_patient"] == 1
        assert feats["high_claim_provider"] == 1
        assert feats["Claim_Submitted_Late"] == 1

    def test_boolean_flags_off_at_boundaries(self):
        p = make_predictor(encoders={})
        feats = p._build_feature_row(
            {
                "Claim_Amount": 1000.0,
                "Provider_Patient_Distance_Miles": 500,
                "Number_of_Previous_Claims_Patient": 5,
                "Number_of_Previous_Claims_Provider": 20,
                "Claim_Submitted_Late": 0,
            }
        )
        assert feats["is_far_provider"] == 0
        assert feats["high_claim_patient"] == 0
        assert feats["high_claim_provider"] == 0
        assert feats["Claim_Submitted_Late"] == 0

    def test_date_deltas(self):
        p = make_predictor(encoders={})
        feats = p._build_feature_row(
            {
                "Claim_Amount": 1000.0,
                "Claim_Date": "2023-01-10",
                "Service_Date": "2023-01-01",
                "Policy_Expiration_Date": "2023-02-09",
            }
        )
        assert feats["days_claim_to_service"] == 9
        assert feats["days_to_policy_expiry"] == 30

    def test_policy_expiry_defaults_to_one_year(self):
        p = make_predictor(encoders={})
        feats = p._build_feature_row({"Claim_Amount": 1000.0, "Claim_Date": "2023-01-01"})
        # default Policy_Expiration_Date is claim_date + 365 days
        assert feats["days_to_policy_expiry"] == 365

    def test_unseen_category_encodes_to_zero(self):
        p = make_predictor(encoders={})  # no encoder available -> fallback 0
        feats = p._build_feature_row({"Claim_Amount": 1000.0, "Service_Type": "SomethingNew"})
        assert feats["Service_Type_encoded"] == 0

    def test_known_category_uses_fitted_encoder(self):
        le = LabelEncoder().fit(["Inpatient", "Outpatient"])
        p = make_predictor(encoders={"Service_Type": le})
        feats = p._build_feature_row({"Claim_Amount": 1000.0, "Service_Type": "Outpatient"})
        assert feats["Service_Type_encoded"] == int(le.transform(["Outpatient"])[0])

    def test_unseen_value_with_fitted_encoder_falls_back_to_zero(self):
        le = LabelEncoder().fit(["Inpatient", "Outpatient"])
        p = make_predictor(encoders={"Service_Type": le})
        feats = p._build_feature_row({"Claim_Amount": 1000.0, "Service_Type": "Alien"})
        assert feats["Service_Type_encoded"] == 0

    def test_defaults_produce_numeric_row(self):
        p = make_predictor(encoders={})
        feats = p._build_feature_row({"Claim_Amount": 500})
        # every value should be numeric (float/int), safe for a DataFrame/model
        assert all(isinstance(v, (int, float)) for v in feats.values())


# --------------------------------------------------------------------------- #
# FraudPredictor.predict
# --------------------------------------------------------------------------- #
class TestPredict:
    def test_missing_model_returns_neutral_fallback(self):
        p = make_predictor(model=None)
        result = p.predict({"Claim_Amount": 100})
        assert result["fraud_score"] == 0.5
        assert result["prediction"] == "Normal"
        assert "error" in result

    def test_model_exception_is_caught(self):
        class Boom:
            def predict_proba(self, df):
                raise RuntimeError("kaboom")

        p = make_predictor(model=Boom(), encoders={}, feature_order=None)
        result = p.predict({"Claim_Amount": 100})
        assert result["fraud_score"] == 0.5
        assert result["prediction"] == "Normal"
        assert "kaboom" in result["error"]

    def test_score_above_threshold_flags_fraud(self):
        high = FRAUD_THRESHOLD + (1 - FRAUD_THRESHOLD) / 2

        class Fake:
            def predict_proba(self, df):
                return [[1 - high, high]]

        p = make_predictor(model=Fake(), encoders={}, feature_order=None)
        result = p.predict({"Claim_Amount": 100})
        assert result["prediction"] == "Fraud"
        assert result["fraud_score"] == pytest.approx(round(high, 4))

    def test_score_below_threshold_is_normal(self):
        low = FRAUD_THRESHOLD / 2

        class Fake:
            def predict_proba(self, df):
                return [[1 - low, low]]

        p = make_predictor(model=Fake(), encoders={}, feature_order=None)
        result = p.predict({"Claim_Amount": 100})
        assert result["prediction"] == "Normal"

    def test_feature_order_is_respected(self):
        captured = {}

        class Fake:
            def predict_proba(self, df):
                captured["columns"] = list(df.columns)
                return [[0.9, 0.1]]

        order = ["Claim_Amount", "Patient_Age", "amount_per_procedure"]
        p = make_predictor(model=Fake(), encoders={}, feature_order=order)
        p.predict({"Claim_Amount": 100, "Patient_Age": 30})
        assert captured["columns"] == order


# --------------------------------------------------------------------------- #
# FraudPredictor._load
# --------------------------------------------------------------------------- #
class TestLoad:
    def test_missing_file_returns_none(self, tmp_path):
        p = make_predictor()
        assert p._load(str(tmp_path / "does_not_exist.pkl")) is None

    def test_relative_missing_path_returns_none(self):
        p = make_predictor()
        assert p._load("nope/definitely_missing.pkl") is None

    def test_load_error_returns_none(self, tmp_path):
        bad = tmp_path / "corrupt.pkl"
        bad.write_bytes(b"not a valid pickle")
        p = make_predictor()
        assert p._load(str(bad)) is None

    def test_loads_valid_artifact(self, tmp_path):
        import joblib

        obj = {"hello": "world"}
        path = tmp_path / "good.pkl"
        joblib.dump(obj, path)
        p = make_predictor()
        assert p._load(str(path)) == obj


# --------------------------------------------------------------------------- #
# Module-level singleton
# --------------------------------------------------------------------------- #
def test_module_exposes_singleton():
    assert isinstance(predictor_module.predictor, FraudPredictor)

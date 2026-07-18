"""Unit tests for core/config.py and core/constants.py.

Guards the configuration surface that the rest of the app relies on: table
names, feature-list lengths/uniqueness, path construction, and fraud
thresholds.
"""

import os

from core import constants
from core.config import Settings, settings


class TestSettings:
    def test_singleton_is_settings_instance(self):
        assert isinstance(settings, Settings)

    def test_database_url_is_sqlite_local(self):
        assert settings.DATABASE_URL.startswith("sqlite")

    def test_table_names(self):
        assert settings.TABLE_CLAIMS == "Claims"
        assert settings.TABLE_PATIENT == "Patient"
        assert settings.TABLE_POLICY == "Policy"
        assert settings.TABLE_PROVIDER == "Provider"

    def test_kafka_defaults(self):
        assert settings.KAFKA_TOPIC == "healthcare-claims"
        assert settings.APP_BASE_URL.startswith("http")


class TestConstants:
    def test_xgb_feature_count(self):
        # Comment in the module documents these as the 24 training columns.
        assert len(constants.XGB_FEATURES) == 24

    def test_clf_feature_count(self):
        assert len(constants.CLF_FEATURES) == 28

    def test_feature_lists_have_no_duplicates(self):
        assert len(constants.XGB_FEATURES) == len(set(constants.XGB_FEATURES))
        assert len(constants.CLF_FEATURES) == len(set(constants.CLF_FEATURES))

    def test_model_paths_are_under_base_dir(self):
        for path in (
            constants.MODEL_PATH,
            constants.CLASSIFIER_PATH,
            constants.COMPLETE_SYSTEM_PATH,
            constants.ENCODERS_PATH,
            constants.FEATURES_LIST_PATH,
        ):
            assert path.startswith(constants.BASE_DIR)
            assert path.endswith((".pkl", ".joblib"))

    def test_model_path_points_to_ml_dir(self):
        assert os.path.join("ML", "xgb_fraud_model.pkl") in constants.MODEL_PATH

    def test_thresholds_ordered_and_in_range(self):
        assert 0 < constants.FRAUD_THRESHOLD < constants.HIGH_RISK_THRESHOLD < 1

    def test_schema_and_column_names(self):
        assert constants.DB_SCHEMA == "dbo"
        assert constants.COL_FRAUD_SCORE == "FraudScore"
        assert constants.COL_STATUS == "Status"

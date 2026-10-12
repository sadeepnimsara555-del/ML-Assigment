"""Model loading and prediction logic for the Student Grade Predictor."""

import warnings
from collections import UserList
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import _column_transformer
from sklearn.exceptions import InconsistentVersionWarning

# The Portuguese preprocessor was pickled with scikit-learn 1.6, which stored the
# remainder columns in a private list class that later versions removed.
if not hasattr(_column_transformer, "_RemainderColsList"):
    class _RemainderColsList(UserList):
        pass

    _column_transformer._RemainderColsList = _RemainderColsList

warnings.filterwarnings("ignore", category=InconsistentVersionWarning)

ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = ROOT / "models"

# Raw UCI columns with their allowed values (categorical) or valid range (numeric).
CATEGORICAL = {
    "school": ["GP", "MS"],
    "sex": ["F", "M"],
    "address": ["U", "R"],
    "famsize": ["LE3", "GT3"],
    "Pstatus": ["T", "A"],
    "Mjob": ["teacher", "health", "services", "at_home", "other"],
    "Fjob": ["teacher", "health", "services", "at_home", "other"],
    "reason": ["home", "reputation", "course", "other"],
    "guardian": ["mother", "father", "other"],
    "schoolsup": ["yes", "no"],
    "famsup": ["yes", "no"],
    "paid": ["yes", "no"],
    "activities": ["yes", "no"],
    "nursery": ["yes", "no"],
    "higher": ["yes", "no"],
    "internet": ["yes", "no"],
    "romantic": ["yes", "no"],
}

NUMERIC = {
    "age": (15, 22),
    "Medu": (0, 4),
    "Fedu": (0, 4),
    "traveltime": (1, 4),
    "studytime": (1, 4),
    "failures": (0, 4),
    "famrel": (1, 5),
    "freetime": (1, 5),
    "goout": (1, 5),
    "Dalc": (1, 5),
    "Walc": (1, 5),
    "health": (1, 5),
    "absences": (0, 93),
    "G1": (0, 20),
    "G2": (0, 20),
}

GROUPS = {
    "both": {
        "label": "Needs general support",
        "short": "Struggling in both",
        "advice": "Predicted to fail both Mathematics and Portuguese. Arrange a general "
                  "academic support plan: a mentor, study-skills sessions and a meeting with family.",
    },
    "math": {
        "label": "Math tutoring",
        "short": "Struggling in Math only",
        "advice": "On track in Portuguese but predicted to fail Mathematics. "
                  "Recommend targeted Math tutoring and extra practice.",
    },
    "portuguese": {
        "label": "Language support",
        "short": "Struggling in Portuguese only",
        "advice": "On track in Mathematics but predicted to fail Portuguese. "
                  "Recommend language-specific help such as reading and writing support.",
    },
    "none": {
        "label": "On track",
        "short": "Doing fine in both",
        "advice": "Predicted to pass both subjects. No intervention needed; keep monitoring progress.",
    },
}


class ValidationError(ValueError):
    pass


class Predictor:
    def __init__(self, models_dir=MODELS_DIR):
        self.math_pre = joblib.load(models_dir / "math_preprocessor.joblib")
        self.por_pre = joblib.load(models_dir / "portuguese_preprocessor.joblib")
        self.math_bundle = joblib.load(models_dir / "final_gradient_boosting_GB5.joblib")
        self.por_bundle = joblib.load(models_dir / "final_portuguese_linear_regression_LR2.joblib")
        self.raw_columns = list(self.math_pre.feature_names_in_)

    def _clean(self, df):
        df = df.copy()
        df.columns = [str(c).strip().strip('"') for c in df.columns]
        missing = [c for c in self.raw_columns if c not in df.columns]
        if len(missing) > 5:
            raise ValidationError(
                f"This doesn't look like the UCI student format: {len(missing)} of the "
                f"{len(self.raw_columns)} required columns are missing (e.g. {', '.join(missing[:4])})."
            )
        if missing:
            raise ValidationError(f"Missing column(s): {', '.join(missing)}")
        df = df[self.raw_columns]

        for col, allowed in CATEGORICAL.items():
            values = df[col].astype(str).str.strip().str.strip('"')
            bad = ~values.isin(allowed)
            if bad.any():
                row = int(np.argmax(bad.to_numpy())) + 1
                raise ValidationError(
                    f"Row {row}: '{col}' must be one of {', '.join(allowed)} (got '{values[bad].iloc[0]}')"
                )
            df[col] = values

        for col, (lo, hi) in NUMERIC.items():
            values = pd.to_numeric(df[col], errors="coerce")
            bad = values.isna() | (values < lo) | (values > hi)
            if bad.any():
                row = int(np.argmax(bad.to_numpy())) + 1
                raise ValidationError(f"Row {row}: '{col}' must be a number from {lo} to {hi}")
            df[col] = values
        return df

    @staticmethod
    def _transform(pre, df):
        out = pre.transform(df)
        if hasattr(out, "toarray"):
            out = out.toarray()
        return pd.DataFrame(out, columns=pre.get_feature_names_out(), index=df.index)

    def predict_df(self, raw_df):
        if raw_df.empty:
            raise ValidationError("No student rows found.")
        df = self._clean(raw_df)

        math_X = self._transform(self.math_pre, df)[self.math_bundle["features"]]
        por_X = self._transform(self.por_pre, df)[self.por_bundle["features"]]

        # Round before thresholding so the shown grade and the pass flag always agree.
        math_pred = np.clip(self.math_bundle["model"].predict(math_X), 0, 20).round(1)
        por_pred = np.clip(self.por_bundle["model"].predict(por_X), 0, 20).round(1)
        math_pass = math_pred >= self.math_bundle["pass_threshold"]
        por_pass = por_pred >= self.por_bundle["pass_threshold"]

        results = []
        for m, p, mp, pp in zip(math_pred, por_pred, math_pass, por_pass):
            if not mp and not pp:
                key = "both"
            elif not mp:
                key = "math"
            elif not pp:
                key = "portuguese"
            else:
                key = "none"
            results.append({
                "math": {"grade": float(m), "pass": bool(mp)},
                "portuguese": {"grade": float(p), "pass": bool(pp)},
                "group": {"key": key, **GROUPS[key]},
            })
        return results

    def model_info(self):
        def info(bundle, subject):
            return {
                "subject": subject,
                "model": bundle["model_name"],
                "experiment": bundle["experiment"],
                "features": len(bundle["features"]),
                "rmse": round(bundle["cv_validation_rmse"], 2),
                "mae": round(bundle["cv_validation_mae"], 2),
                "r2": round(bundle["cv_validation_r2"], 3),
                "threshold": bundle["pass_threshold"],
            }

        return {
            "math": info(self.math_bundle, "Mathematics"),
            "portuguese": info(self.por_bundle, "Portuguese"),
            "groups": GROUPS,
            "fields": {
                "categorical": CATEGORICAL,
                "numeric": {k: list(v) for k, v in NUMERIC.items()},
            },
        }

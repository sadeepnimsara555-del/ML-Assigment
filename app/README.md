# GradeSight: web interface

A Flask web app that runs the two final models:

- **Mathematics**: Gradient Boosting (GB-5), `models/final_gradient_boosting_GB5.joblib`
- **Portuguese**: Linear Regression (LR-2), `models/final_portuguese_linear_regression_LR2.joblib`

For each student it shows the predicted final grade (G3, 0–20) in both subjects, a pass/fail flag for each (G3 ≥ 10 = pass), and one of four intervention groups:

| Math | Portuguese | Group |
|------|------------|-------|
| Fail | Fail | Needs general support |
| Fail | Pass | Math tutoring |
| Pass | Fail | Language support |
| Pass | Pass | On track |

## Run

From the repository root (Windows):

```powershell
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python app\app.py
```

Then open http://localhost:5000.

`scikit-learn` is pinned to 1.7.1 because the saved models were pickled with that version. Newer versions refuse to load the preprocessors.

## Features

- **Single student**: a 3-step form (academic, background, lifestyle) with animated grade gauges, the intervention group, and a 2×2 matrix that shows where the student sits. After the first prediction, changing any input updates the results live.
- **Whole class**: upload a CSV in the UCI format (`;` or `,` separated) to get group counts, a distribution chart, and a sortable, filterable table. Results can be downloaded as CSV. `app/static/sample_students.csv` is a ready-made example.
- **How it works**: explains the outputs and shows each model's cross-validated RMSE, MAE and R².

## API

- `POST /api/predict`: JSON object with the 32 raw input columns. Returns grades, flags and the group.
- `POST /api/predict-batch`: multipart `file` upload (CSV).
- `GET /api/model-info`: model metadata and metrics.

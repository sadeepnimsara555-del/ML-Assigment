"""Flask web app for the Student Grade Predictor.

Run from the repository root:
    .venv\\Scripts\\python app\\app.py
"""

import io
from collections import Counter

import pandas as pd
from flask import Flask, jsonify, render_template, request, send_from_directory

from predictor import GROUPS, Predictor, ValidationError

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024
predictor = Predictor()


@app.errorhandler(ValidationError)
def handle_validation(err):
    return jsonify({"error": str(err)}), 400


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/model-info")
def model_info():
    return jsonify(predictor.model_info())


@app.post("/api/predict")
def predict():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValidationError("Send the student's details as a JSON object.")
    return jsonify(predictor.predict_df(pd.DataFrame([data]))[0])


@app.post("/api/predict-batch")
def predict_batch():
    file = request.files.get("file")
    if file is None or not file.filename:
        raise ValidationError("Please choose a CSV file to upload.")
    text = file.read().decode("utf-8-sig", errors="replace")
    first_line = text.splitlines()[0] if text.strip() else ""
    sep = ";" if first_line.count(";") > first_line.count(",") else ","
    try:
        df = pd.read_csv(io.StringIO(text), sep=sep)
    except Exception:
        raise ValidationError("Could not read that file. Make sure it is a valid CSV.")

    results = predictor.predict_df(df)
    has_actual = "G3" in df.columns
    rows = []
    for i, res in enumerate(results):
        row = {"id": i + 1, **res}
        if has_actual:
            actual = pd.to_numeric(df["G3"].iloc[i], errors="coerce")
            row["actual"] = None if pd.isna(actual) else float(actual)
        rows.append(row)

    counts = Counter(r["group"]["key"] for r in results)
    return jsonify({
        "rows": rows,
        "has_actual": has_actual,
        "summary": {key: counts.get(key, 0) for key in GROUPS},
        "total": len(results),
    })


@app.get("/sample.csv")
def sample_csv():
    return send_from_directory(app.static_folder, "sample_students.csv", as_attachment=True)


if __name__ == "__main__":
    app.run(debug=True, port=5000)

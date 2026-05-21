"""
Predict next-day close for ALL stocks the model was trained on (one batch run).

Usage (from project root or ml/ folder):
    python ml/predict.py
    python predict.py
"""
import json
import os
import sys

import pandas as pd

ML_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ML_DIR)

from features import load_model_bundle, predict_all_trained_stocks

PREDICTIONS_CSV = os.path.join(ML_DIR, "predictions.csv")
PREDICTIONS_JSON = os.path.join(ML_DIR, "predictions.json")


def run_all_predictions():
    bundle = load_model_bundle()
    if not bundle:
        print("Model not found. Run generate_data.py then train_model.py first.")
        return

    trained_count = len(bundle["trained_symbols"])
    print(f"Predicting next close for all {trained_count} trained stocks...\n")

    results = predict_all_trained_stocks(bundle)
    if not results:
        print("No predictions generated (no market data or empty model).")
        return

    df = pd.DataFrame(results)
    df.to_csv(PREDICTIONS_CSV, index=False)
    with open(PREDICTIONS_JSON, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    up = sum(1 for r in results if r["direction"] == "UP")
    down = len(results) - up
    print(f"Done: {len(results)} predictions ({up} UP, {down} DOWN)")
    print(f"Saved: {PREDICTIONS_CSV}")
    print(f"Saved: {PREDICTIONS_JSON}\n")

    display = df[["symbol", "currentClose", "predictedClose", "direction", "percentChange"]]
    pd.set_option("display.max_rows", None)
    pd.set_option("display.width", 120)
    print(display.to_string(index=False))


if __name__ == "__main__":
    run_all_predictions()

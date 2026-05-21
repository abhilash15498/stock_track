import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import os
import sys

ML_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ML_DIR)
from features import prepare_training_data, save_model_bundle, predict_all_trained_stocks

def train_model():
    input_file = os.path.join(ML_DIR, "stock_data.csv")

    if not os.path.exists(input_file):
        print(f"Dataset not found at {input_file}. Please run generate_data.py first.")
        return

    print("Loading dataset...")
    df = pd.read_csv(input_file)

    print("Preprocessing (per-symbol targets + symbol encoding)...")
    X, y, feature_columns, trained_symbols = prepare_training_data(df)

    train_size = int(len(X) * 0.8)
    X_train, X_test = X.iloc[:train_size], X.iloc[train_size:]
    y_train, y_test = y.iloc[:train_size], y.iloc[train_size:]

    print(f"Training on {len(X_train)} samples across {len(trained_symbols)} symbols...")
    model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    mse = mean_squared_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)

    print("\nModel training complete.")
    print(f"Mean Squared Error: {mse:.4f}")
    print(f"R2 Score: {r2:.4f}")
    print(f"Trained symbols: {len(trained_symbols)} (US + India)")

    bundle = {
        "model": model,
        "feature_columns": feature_columns,
        "trained_symbols": trained_symbols,
    }
    save_model_bundle(model, feature_columns, trained_symbols)
    print(f"Model bundle saved to {os.path.join(ML_DIR, 'stock_model.joblib')}")

    print("\nRunning predictions for all trained stocks...")
    results = predict_all_trained_stocks(bundle)
    print(f"Generated {len(results)} predictions. Run predict.py anytime to refresh.")

if __name__ == "__main__":
    train_model()

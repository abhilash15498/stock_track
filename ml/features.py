import os
import joblib
import pandas as pd

ML_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(ML_DIR, "stock_model.joblib")

BASE_FEATURES = ["Open", "High", "Low", "Close", "Volume"]


def resolve_training_symbol(symbol: str, trained_symbols: set[str]) -> str | None:
    """Map user input (e.g. RELIANCE or reliance.ns) to a symbol from training."""
    raw = symbol.strip().upper()
    if raw in trained_symbols:
        return raw
    if f"{raw}.NS" in trained_symbols:
        return f"{raw}.NS"
    if raw.endswith(".NS") and raw[:-3] in {s.replace(".NS", "") for s in trained_symbols}:
        return raw
    return None


def prepare_training_data(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series, list[str], list[str]]:
    df = df.copy()
    df["Symbol"] = df["Symbol"].astype(str).str.upper()
    df["Date"] = pd.to_datetime(df["Date"], utc=True)
    df = df.sort_values(["Symbol", "Date"])

    df["Target"] = df.groupby("Symbol")["Close"].shift(-1)
    df = df.dropna(subset=["Target"])

    df = pd.get_dummies(df, columns=["Symbol"], prefix="sym")
    symbol_columns = sorted(c for c in df.columns if c.startswith("sym_"))
    feature_columns = BASE_FEATURES + symbol_columns
    trained_symbols = [c.replace("sym_", "") for c in symbol_columns]

    X = df[feature_columns]
    y = df["Target"]
    return X, y, feature_columns, trained_symbols


def build_prediction_features(
    ohlcv_row: pd.Series,
    yfinance_symbol: str,
    feature_columns: list[str],
) -> pd.DataFrame:
    sym_key = f"sym_{yfinance_symbol.upper()}"
    row = {col: float(ohlcv_row[col]) for col in BASE_FEATURES}
    for col in feature_columns:
        if col.startswith("sym_"):
            row[col] = 1.0 if col == sym_key else 0.0
    return pd.DataFrame([row])[feature_columns]


def save_model_bundle(model, feature_columns: list[str], trained_symbols: list[str]) -> None:
    joblib.dump(
        {
            "model": model,
            "feature_columns": feature_columns,
            "trained_symbols": trained_symbols,
        },
        MODEL_PATH,
        compress=3,
    )


def load_model_bundle() -> dict | None:
    if not os.path.exists(MODEL_PATH):
        return None
    data = joblib.load(MODEL_PATH)
    if isinstance(data, dict) and "model" in data:
        return data
    # Legacy format: bare estimator trained on 5 US stocks only
    return {
        "model": data,
        "feature_columns": BASE_FEATURES,
        "trained_symbols": ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"],
    }


def predict_next_close(
    model,
    ohlcv_df: pd.DataFrame,
    yfinance_symbol: str,
    feature_columns: list[str],
    trained_symbols: set[str],
) -> float | None:
    resolved = resolve_training_symbol(yfinance_symbol, trained_symbols)
    if not resolved:
        return None
    latest = ohlcv_df[BASE_FEATURES].iloc[-1]
    features = build_prediction_features(latest, resolved, feature_columns)
    return float(model.predict(features)[0])


def format_prediction_result(symbol: str, current_close: float, predicted_close: float) -> dict:
    change = predicted_close - current_close
    pct = (change / current_close) * 100 if current_close else 0.0
    return {
        "symbol": symbol.replace(".NS", ""),
        "ticker": symbol,
        "currentClose": round(current_close, 2),
        "predictedClose": round(predicted_close, 2),
        "direction": "UP" if change > 0 else "DOWN",
        "percentChange": round(pct, 2),
    }


def predict_all_trained_stocks(bundle: dict | None = None) -> list[dict]:
    """
    Fetch latest prices and predict next close for every symbol in the trained model.
    Returns a list of result dicts (skips symbols with no market data).
    """
    import yfinance as yf

    bundle = bundle or load_model_bundle()
    if not bundle:
        return []

    model = bundle["model"]
    feature_columns = bundle["feature_columns"]
    trained = set(bundle["trained_symbols"])
    symbols = sorted(trained)

    feature_rows = []
    row_meta = []

    try:
        # Batch pull recent OHLCV for all trained symbols to reduce rate limits.
        batch = yf.download(
            tickers=" ".join(symbols),
            period="5d",
            group_by="ticker",
            auto_adjust=False,
            threads=False,
            progress=False,
        )
    except Exception:
        return []

    for symbol in symbols:
        try:
            if isinstance(batch.columns, pd.MultiIndex):
                close = batch.get(("Close", symbol))
                open_ = batch.get(("Open", symbol))
                high = batch.get(("High", symbol))
                low = batch.get(("Low", symbol))
                volume = batch.get(("Volume", symbol))
                if any(series is None for series in [open_, high, low, close, volume]):
                    continue
                df = pd.DataFrame(
                    {"Open": open_, "High": high, "Low": low, "Close": close, "Volume": volume}
                )
            else:
                # Single symbol edge case.
                df = batch[BASE_FEATURES].copy() if set(BASE_FEATURES).issubset(batch.columns) else pd.DataFrame()

            df = df.dropna()
            if df.empty:
                continue

            latest = df[BASE_FEATURES].iloc[-1]
            feature_rows.append(build_prediction_features(latest, symbol, feature_columns))
            row_meta.append((symbol, float(df["Close"].iloc[-1])))
        except Exception:
            continue

    if not feature_rows:
        return []

    X = pd.concat(feature_rows, ignore_index=True)
    predictions = model.predict(X)

    results = []
    for (symbol, current_close), pred in zip(row_meta, predictions):
        results.append(format_prediction_result(symbol, current_close, float(pred)))

    return results

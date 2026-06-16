from fastapi import FastAPI, Query, BackgroundTasks, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import pandas as pd
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from apscheduler.schedulers.background import BackgroundScheduler
import datetime
import uvicorn
import math
import time

# Load backend/.env regardless of which folder you run the command from
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

# Load ML model bundle if it exists
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ML_DIR = os.path.join(BASE_DIR, "ml")
if ML_DIR not in __import__("sys").path:
    __import__("sys").path.insert(0, ML_DIR)

from features import (  # noqa: E402
    load_model_bundle,
    predict_next_close,
    predict_all_trained_stocks,
    resolve_training_symbol,
)
from generate_data import generate_dataset  # noqa: E402
from train_model import train_model  # noqa: E402
from predict import run_all_predictions  # noqa: E402

ml_bundle = None
ml_model = None
ml_feature_columns = []
ml_trained_symbols: set[str] = set()

_loaded = load_model_bundle()
if _loaded:
    ml_bundle = _loaded
    ml_model = _loaded["model"]
    ml_feature_columns = _loaded["feature_columns"]
    ml_trained_symbols = set(_loaded["trained_symbols"])
    print(f"ML model loaded ({len(ml_trained_symbols)} trained symbols)")
else:
    print("ML model not found. Run ml/generate_data.py and ml/train_model.py first.")

app = FastAPI()

# CORS — set ALLOWED_ORIGINS to your frontend URL(s), comma-separated (e.g. https://stocktrack.netlify.app)
_allowed_origins = os.getenv("ALLOWED_ORIGINS", "*")
cors_origins = ["*"] if _allowed_origins.strip() == "*" else [
    origin.strip() for origin in _allowed_origins.split(",") if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY")


def verify_admin_key(x_admin_key: str | None = Header(default=None, alias="X-Admin-Key")):
    if not ADMIN_API_KEY:
        raise HTTPException(status_code=503, detail="Admin endpoints are disabled")
    if x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")

# Supabase Setup (optional for stock endpoints; required for daily email workflow)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client | None = None
supabase_admin: Client | None = None

if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    if SUPABASE_SERVICE_ROLE_KEY:
        supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
else:
    print("Supabase credentials not set. Stock API will work; daily email workflow is disabled.")


# SMTP Setup
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

# List of "Top Stocks" to display on dashboard
TOP_STOCKS_SYMBOLS = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "AAPL", "MSFT", "TSLA"]

_top_stocks_cache: dict[str, object] = {"ts": 0.0, "data": []}
_TOP_STOCKS_CACHE_SECONDS = int(os.getenv("TOP_STOCKS_CACHE_SECONDS", "90"))
_stock_info_cache: dict[str, dict[str, object]] = {}
_STOCK_INFO_CACHE_SECONDS = int(os.getenv("STOCK_INFO_CACHE_SECONDS", "180"))


def symbol_candidates(symbol: str) -> list[str]:
    raw = symbol.strip().upper()
    if ml_trained_symbols:
        resolved = resolve_training_symbol(raw, ml_trained_symbols)
        if resolved:
            return [resolved]
    if "." in raw:
        return [raw]
    # NSE tickers need .NS — try that first so Yahoo doesn't error on bare names like RELIANCE
    return [f"{raw}.NS", raw]


def get_stock_info(symbol: str):
    for candidate in symbol_candidates(symbol):
        info = _fetch_stock_info(candidate)
        if info:
            return info
    return None


def _fetch_stock_info(symbol: str):
    normalized_symbol = symbol.strip().upper()
    now = time.time()
    cached = _stock_info_cache.get(normalized_symbol)
    if cached:
        cached_ts = float(cached.get("ts", 0.0) or 0.0)
        if (now - cached_ts) < _STOCK_INFO_CACHE_SECONDS:
            return cached.get("data")

    try:
        stock = yf.Ticker(symbol)
        data = stock.history(period="5d")
        if data.empty:
            _stock_info_cache[normalized_symbol] = {"ts": now, "data": None}
            return None

        latest = data.iloc[-1]
        # Avoid stock.info here because it triggers additional Yahoo API calls
        # and is a frequent source of rate-limit failures on shared hosting.
        prev_close = data.iloc[-2]["Close"] if len(data) > 1 else latest["Close"]

        def safe_float(value):
            try:
                num = float(value)
                return num if math.isfinite(num) else None
            except (TypeError, ValueError):
                return None

        current_price = safe_float(latest["Close"])
        previous_close = safe_float(prev_close)
        if current_price is None:
            return None
        if previous_close is None:
            previous_close = current_price
        
        prediction_data = None
        if ml_model is not None:
            try:
                pred_price = predict_next_close(
                    ml_model, data, symbol, ml_feature_columns, ml_trained_symbols
                )
                pred_price = safe_float(pred_price)
                if pred_price is not None:
                    change = pred_price - current_price
                    pct_change = (change / current_price) * 100 if current_price != 0 else 0.0
                    prediction_data = {
                        "predictedClose": round(pred_price, 2),
                        "direction": "UP" if change > 0 else "DOWN",
                        "percentChange": round(pct_change, 2)
                    }
            except Exception as pred_err:
                print(f"Prediction failed for {symbol}: {pred_err}")

        payload = {
            "symbol": symbol.replace(".NS", ""),
            "ticker": symbol,
            "price": current_price,
            "previousClose": previous_close,
            "prediction": prediction_data,
        }
        _stock_info_cache[normalized_symbol] = {"ts": now, "data": payload}
        return payload
    except Exception as e:
        print(f"Error fetching {symbol}: {e}")
        _stock_info_cache[normalized_symbol] = {"ts": now, "data": None}
        return None


def _parse_download_close(df: pd.DataFrame, ticker: str):
    """
    yfinance download() returns either:
      - single-ticker columns: ['Open','High','Low','Close',...]
      - multi-ticker columns: MultiIndex [(field, ticker)]
    This helper extracts last and previous Close for one ticker.
    """
    try:
        if df is None or df.empty:
            return None, None

        if isinstance(df.columns, pd.MultiIndex):
            close = df.get(("Close", ticker))
            if close is None:
                return None, None
        else:
            close = df.get("Close")
            if close is None:
                return None, None

        close = close.dropna()
        if close.empty:
            return None, None

        last = close.iloc[-1]
        prev = close.iloc[-2] if len(close) > 1 else last
        return float(last), float(prev)
    except Exception:
        return None, None


def describe_trend(pct: float) -> str:
    direction = "upward" if pct > 0 else "downward" if pct < 0 else "flat"
    magnitude = abs(pct)
    if magnitude < 0.15:
        label = "Flat" if pct == 0 else "Marginal"
    elif magnitude < 0.5:
        label = "Slight"
    elif magnitude < 1.0:
        label = "Moderate"
    else:
        label = "Noticeable"
    if label == "Flat":
        return f"Flat ({pct:+.2f}%)"
    return f"{label} {direction} ({pct:+.2f}%)"


def forecast_insight(pct: float, today_pct: float) -> str:
    if abs(pct) < 0.15:
        return "Forecast is flat; price likely to hold near current levels with limited movement expected."
    if pct > 0:
        if today_pct >= 0:
            return "Model predicts continued upside; momentum aligns with today's move."
        return "Model predicts recovery despite today's dip; watch for early confirmation."
    if today_pct <= 0:
        return "Model predicts further softness; today's weakness may carry into the next session."
    return "Model predicts a pullback after today's gain; consider taking profits selectively."


def forecast_risk(pct: float) -> str:
    magnitude = abs(pct)
    if magnitude < 0.3:
        return "Minimal; low expected volatility, routine monitoring is sufficient."
    if magnitude < 0.8:
        return "Low; regular volatility, monitor for continued movement in the forecast direction."
    if magnitude < 1.5:
        return "Moderate; larger expected swing, review position sizing and stop levels."
    return "High; sharp forecast move, exercise caution and avoid impulsive trades."


def portfolio_sentiment(forecast_pcts: list[float]) -> str:
    if not forecast_pcts:
        return "Insufficient data to assess portfolio sentiment today."
    ups = sum(1 for p in forecast_pcts if p > 0.15)
    downs = sum(1 for p in forecast_pcts if p < -0.15)
    flat = len(forecast_pcts) - ups - downs
    avg_move = sum(abs(p) for p in forecast_pcts) / len(forecast_pcts)

    if ups > downs and downs == 0:
        tone = "Constructive outlook with broad upward forecasts."
    elif downs > ups and ups == 0:
        tone = "Defensive outlook with broad downward forecasts."
    elif ups > downs:
        tone = "Cautiously optimistic with mixed signals leaning upward."
    elif downs > ups:
        tone = "Cautiously stable with minor declines dominating forecasts."
    else:
        tone = "Balanced outlook with offsetting up and down forecasts."

    volatility = (
        "Low expected volatility across holdings."
        if avg_move < 0.4
        else "Moderate forecast volatility; stay alert for sector-specific moves."
        if avg_move < 1.0
        else "Elevated forecast volatility; prioritize risk management."
    )
    flat_note = f" {flat} holding(s) look flat." if flat else ""
    return f"{tone}{flat_note} {volatility}"


def build_summary_email_body(watchlist: list) -> str:
    lines = [
        "Here is your daily stock watchlist forecast summary:",
        "",
    ]
    forecast_pcts: list[float] = []
    seen_symbols: set[str] = set()

    for item in watchlist:
        raw_symbol = item["stock_symbol"]
        if raw_symbol in seen_symbols:
            continue
        seen_symbols.add(raw_symbol)

        info = get_stock_info(raw_symbol)
        if not info:
            lines.extend([f"📈 {raw_symbol.upper()}", "Status: Price data unavailable.", ""])
            continue

        today_change = info["price"] - info["previousClose"]
        today_pct = (today_change / info["previousClose"]) * 100 if info["previousClose"] else 0.0
        ticker = info.get("ticker", raw_symbol.upper())
        currency = "Rs." if ticker.endswith(".NS") else "$"

        lines.append(f"📈 {ticker}")
        lines.append(
            f"Price: {currency} {info['price']:.2f} (today: {today_change:+.2f}, {today_pct:+.2f}%)"
        )

        prediction = info.get("prediction")
        if prediction:
            forecast_pct = prediction["percentChange"]
            forecast_pcts.append(forecast_pct)
            arrow = "▲" if prediction["direction"] == "UP" else "▼"
            lines.append(
                f"Forecast: {currency} {prediction['predictedClose']:.2f} "
                f"({arrow} {forecast_pct:+.2f}%)"
            )
            lines.append(f"Trend: {describe_trend(forecast_pct)}")
            lines.append(f"Insight: {forecast_insight(forecast_pct, today_pct)}")
            lines.append(f"Risk: {forecast_risk(forecast_pct)}")
        else:
            forecast_pcts.append(today_pct)
            lines.append("Forecast: unavailable for this symbol.")
            lines.append(f"Trend: {describe_trend(today_pct)} (based on today's move)")
            lines.append(f"Insight: {forecast_insight(today_pct, today_pct)}")
            lines.append(f"Risk: {forecast_risk(today_pct)}")
        lines.append("")

    lines.extend([
        "📊 Overall Portfolio Sentiment:",
        portfolio_sentiment(forecast_pcts),
        "",
        "— StockTrack",
    ])
    return "\n".join(lines)

@app.get("/")
async def root():
    """API index — use these URLs in the browser or from the frontend."""
    return {
        "app": "StockTrack API",
        "docs": "/docs",
        "endpoints": {
            "top_stocks": "/top-stocks",
            "search": "/search-stock?q=RELIANCE",
            "all_predictions": "/predictions",
        },
        "frontend": "Run the Vite app in frontend/ (npm run dev)",
        "trained_symbols": len(ml_trained_symbols),
    }


@app.get("/predictions")
async def get_all_predictions():
    """Next-day forecasts for every symbol in the trained model (US + India)."""
    if not ml_bundle:
        return []
    return predict_all_trained_stocks(ml_bundle)


@app.get("/top-stocks")
async def get_top_stocks():
    # Avoid hammering Yahoo Finance from a shared Render IP.
    now = time.time()
    cached_ts = float(_top_stocks_cache.get("ts", 0.0) or 0.0)
    cached_data = _top_stocks_cache.get("data", [])
    if (now - cached_ts) < _TOP_STOCKS_CACHE_SECONDS and isinstance(cached_data, list):
        return cached_data

    tickers = TOP_STOCKS_SYMBOLS
    try:
        # One batch call instead of N separate ticker calls (helps prevent rate limiting).
        df = yf.download(
            tickers=" ".join(tickers),
            period="5d",
            group_by="ticker",
            auto_adjust=False,
            threads=False,
            progress=False,
        )
    except Exception as e:
        print(f"Batch download failed: {e}")
        if isinstance(cached_data, list) and cached_data:
            return cached_data
        return []

    results = []
    for ticker in tickers:
        last, prev = _parse_download_close(df, ticker)
        if last is None:
            continue
        results.append(
            {
                "symbol": ticker.replace(".NS", ""),
                "ticker": ticker,
                "price": last,
                "previousClose": prev if prev is not None else last,
                "prediction": None,
            }
        )

    _top_stocks_cache["ts"] = now
    _top_stocks_cache["data"] = results
    return results

@app.get("/search-stock")
async def search_stock(q: str = Query(...)):
    q = q.strip()
    if len(q) < 2:
        return []

    # Try using yfinance Search to look up quotes by name/partial symbol
    try:
        search = yf.Search(q, max_results=5)
        quotes = search.quotes
        
        results = []
        for quote in quotes:
            symbol = quote.get("symbol")
            if symbol:
                info = get_stock_info(symbol)
                if info:
                    results.append(info)
        
        # Fallback if search returns nothing (try exact ticker matching)
        if not results:
            symbol = q.upper()
            if not symbol.endswith(".NS") and len(symbol) <= 5:
                info = get_stock_info(symbol) or get_stock_info(symbol + ".NS")
            else:
                info = get_stock_info(symbol)
            if info:
                results.append(info)
                
        return results
    except Exception as e:
        print(f"Error searching for '{q}': {e}")
        # Fallback to simple lookup in case of error
        symbol = q.upper()
        info = get_stock_info(symbol) or get_stock_info(symbol + ".NS")
        return [info] if info else []

@app.get("/test-email")
async def test_email(to: str = Query(...), _: None = Depends(verify_admin_key)):
    """Trigger a test email to verify SMTP settings."""
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_EMAIL
        msg['To'] = to
        msg['Subject'] = "StockTrack SMTP Test"
        msg.attach(MIMEText("Your SMTP credentials are working correctly!", 'plain'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return {"status": "success", "message": f"Test email sent to {to}"}
    except Exception as e:
        print(f"SMTP Error: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/trigger-ml-pipeline")
async def trigger_ml_pipeline_endpoint(background_tasks: BackgroundTasks, _: None = Depends(verify_admin_key)):
    """Trigger the ML pipeline workflow immediately in the background."""
    background_tasks.add_task(run_ml_pipeline)
    return {"status": "success", "message": "ML pipeline triggered in the background."}

@app.post("/trigger-daily-summary")
async def trigger_daily_summary(background_tasks: BackgroundTasks, _: None = Depends(verify_admin_key)):
    """Trigger the daily summary email workflow immediately in the background."""
    background_tasks.add_task(daily_workflow)
    return {"status": "success", "message": "Daily summary email workflow triggered in the background."}

def send_email_summary(to_email: str, watchlist: list):
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print("SMTP credentials not set. Skipping email.")
        return

    msg = MIMEMultipart()
    msg['From'] = SMTP_EMAIL
    msg['To'] = to_email
    msg['Subject'] = f"Daily Stock Forecast Summary - {datetime.date.today()}"

    body = build_summary_email_body(watchlist)
    msg.attach(MIMEText(body, "plain", "utf-8"))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"Summary sent to {to_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")

def run_ml_pipeline():
    print("Running scheduled ML pipeline: generate_data")
    try:
        generate_dataset()
        print("Running scheduled ML pipeline: train_model")
        train_model()
        print("Running scheduled ML pipeline: predict")
        run_all_predictions()
        
        # Reload the model in memory for the fastAPI app
        global ml_bundle, ml_model, ml_feature_columns, ml_trained_symbols
        _loaded = load_model_bundle()
        if _loaded:
            ml_bundle = _loaded
            ml_model = _loaded["model"]
            ml_feature_columns = _loaded["feature_columns"]
            ml_trained_symbols = set(_loaded["trained_symbols"])
            print("Reloaded ML model into memory.")
    except Exception as e:
        print(f"Error in ML pipeline: {e}")

def daily_workflow():
    print("Running daily summary workflow...")
    if not supabase and not supabase_admin:
        print("Supabase not configured. Skipping daily summary.")
        return
    try:
        # Use admin client to query all watchlists if available to bypass RLS, otherwise fallback
        client = supabase_admin if supabase_admin else supabase
        response = client.table("watchlists").select("user_id, stock_symbol").execute()
        data = response.data
        
        # Group by user_id
        user_watchlists = {}
        for row in data:
            uid = row['user_id']
            if uid not in user_watchlists:
                user_watchlists[uid] = []
            user_watchlists[uid].append(row)
            
        print(f"Found {len(user_watchlists)} users with watchlists.")
        
        # Process and send email summary to each user
        for uid, watchlist in user_watchlists.items():
            email = None
            if supabase_admin:
                try:
                    user_response = supabase_admin.auth.admin.get_user_by_id(uid)
                    if user_response.user and user_response.user.email:
                        email = user_response.user.email
                except Exception as admin_err:
                    print(f"Error fetching user email for {uid}: {admin_err}")

            if not email and SMTP_EMAIL:
                email = SMTP_EMAIL
                print(f"No email found for {uid}. Falling back to SMTP email {email}.")
            
            if email:
                send_email_summary(email, watchlist)
                
    except Exception as e:
        print(f"Error in daily workflow: {e}")

# Schedule the daily summary at 9:00 AM (disable with ENABLE_SCHEDULER=false on serverless hosts)
scheduler = BackgroundScheduler()
scheduler.add_job(run_ml_pipeline, "cron", hour=8, minute=0)
scheduler.add_job(daily_workflow, "cron", hour=8, minute=30)
if os.getenv("ENABLE_SCHEDULER", "true").lower() in ("1", "true", "yes"):
    scheduler.start()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

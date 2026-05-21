from fastapi import FastAPI, Query, BackgroundTasks
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
import joblib

# Load backend/.env regardless of which folder you run the command from
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

# Load ML model bundle if it exists
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ML_DIR = os.path.join(BASE_DIR, "ml")
if ML_DIR not in __import__("sys").path:
    __import__("sys").path.insert(0, ML_DIR)

from features import load_model_bundle, predict_next_close, predict_all_trained_stocks  # noqa: E402

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

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_methods=["*"],
    allow_headers=["*"],
)

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

def get_stock_info(symbol: str):
    try:
        stock = yf.Ticker(symbol)
        # Fetching basic info
        data = stock.history(period="1d")
        if data.empty:
            return None
            
        latest = data.iloc[-1]
        prev_close = stock.info.get('previousClose') or (data.iloc[0]['Close'] if len(data) > 1 else latest['Close'])
        
        prediction_data = None
        if ml_model is not None:
            try:
                pred_price = predict_next_close(
                    ml_model, data, symbol, ml_feature_columns, ml_trained_symbols
                )
                if pred_price is not None:
                    current_price = float(latest['Close'])
                    change = pred_price - current_price
                    pct_change = (change / current_price) * 100 if current_price != 0 else 0.0
                    prediction_data = {
                        "predictedClose": round(pred_price, 2),
                        "direction": "UP" if change > 0 else "DOWN",
                        "percentChange": round(pct_change, 2)
                    }
            except Exception as pred_err:
                print(f"Prediction failed for {symbol}: {pred_err}")

        return {
            "symbol": symbol.replace(".NS", ""),
            "price": float(latest['Close']),
            "previousClose": float(prev_close),
            "prediction": prediction_data
        }
    except Exception as e:
        print(f"Error fetching {symbol}: {e}")
        return None

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
        "frontend": "Serve frontend/ and open auth.html (not this port)",
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
    results = []
    for symbol in TOP_STOCKS_SYMBOLS:
        info = get_stock_info(symbol)
        if info:
            results.append(info)
    return results

@app.get("/search-stock")
async def search_stock(q: str = Query(...)):
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
async def test_email(to: str = Query(...)):
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

@app.post("/trigger-daily-summary")
async def trigger_daily_summary(background_tasks: BackgroundTasks):
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
    msg['Subject'] = f"Daily Stock Summary - {datetime.date.today()}"

    body = "Here is your daily stock watchlist summary:\n\n"
    for item in watchlist:
        info = get_stock_info(item['stock_symbol'])
        if info:
            change = info['price'] - info['previousClose']
            percent = (change / info['previousClose']) * 100
            body += f"{info['symbol']}: Rs. {info['price']:.2f} ({change:+.2f}, {percent:+.2f}%)\n"
    
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"Summary sent to {to_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")

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
                    user_info = supabase_admin.auth.admin.get_user(uid)
                    if hasattr(user_info, 'user') and hasattr(user_info.user, 'email'):
                        email = user_info.user.email
                    elif isinstance(user_info, dict) and 'user' in user_info:
                        email = user_info['user'].get('email')
                    else:
                        email = getattr(user_info, 'email', None)
                except Exception as admin_err:
                    print(f"Error fetching user email for {uid}: {admin_err}")
            
            # Fallback to SMTP_EMAIL for testing if we cannot retrieve user's email
            if not email:
                email = SMTP_EMAIL
                print(f"No email found for {uid} (requires SUPABASE_SERVICE_ROLE_KEY). Falling back to default SMTP email {email} for testing.")
            
            if email:
                send_email_summary(email, watchlist)
                
    except Exception as e:
        print(f"Error in daily workflow: {e}")

# Schedule the daily summary at 9:00 AM
scheduler = BackgroundScheduler()
scheduler.add_job(daily_workflow, 'cron', hour=9, minute=0)
scheduler.start()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

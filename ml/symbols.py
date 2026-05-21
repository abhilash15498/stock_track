"""
Stocks used for ML training (India NSE via .NS suffix + major US tickers).

You cannot practically train on every listed stock in India and the US (thousands
of symbols). Add or remove tickers here, then re-run generate_data.py and train_model.py.
"""

# US equities (NYSE / NASDAQ)
US_SYMBOLS = [
    "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "META", "TSLA", "BRK-B",
    "JPM", "V", "JNJ", "WMT", "PG", "MA", "UNH", "HD", "DIS", "BAC", "XOM",
    "NFLX", "AMD", "INTC", "CRM", "ORCL", "ADBE", "CSCO", "PEP", "KO", "MRK",
    "LLY", "AVGO", "COST", "TMO", "ABBV", "ACN", "MCD", "NKE", "TXN", "QCOM",
    "AMAT", "HON", "IBM", "GE", "CAT", "BA", "GS", "PFE", "T", "VZ",
]

# India — NSE symbols (yfinance uses .NS suffix)
INDIA_SYMBOLS = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
    "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS",
    "LT.NS", "AXISBANK.NS", "ASIANPAINT.NS", "MARUTI.NS", "SUNPHARMA.NS",
    "TITAN.NS", "BAJFINANCE.NS", "WIPRO.NS", "ULTRACEMCO.NS", "NESTLEIND.NS",
    "POWERGRID.NS", "NTPC.NS", "ONGC.NS", "TMPV.NS", "M&M.NS",
    "HCLTECH.NS", "TECHM.NS", "INDUSINDBK.NS", "BAJAJFINSV.NS", "DIVISLAB.NS",
    "DRREDDY.NS", "CIPLA.NS", "APOLLOHOSP.NS", "EICHERMOT.NS", "HEROMOTOCO.NS",
    "GRASIM.NS", "BPCL.NS", "COALINDIA.NS", "HINDALCO.NS", "SBILIFE.NS",
    "HDFCLIFE.NS", "BRITANNIA.NS", "TRENT.NS", "ADANIENT.NS", "JSWSTEEL.NS",
    "TATASTEEL.NS", "ADANIPORTS.NS",
]

TRAINING_SYMBOLS = US_SYMBOLS + INDIA_SYMBOLS

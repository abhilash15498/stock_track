# StockTrack

StockTrack is a simple stock watchlist web app. It lets a user sign up, log in, browse/search stocks, add stocks to a personal watchlist, remove them later, and get a daily stock summary by email.

The frontend is a static site; stock data and email summaries are served by the FastAPI backend in `backend/`.

## What It Uses

- `frontend/auth.html` for login and signup
- `frontend/index.html` for the dashboard
- `frontend/style.css` for the UI
- `frontend/script.js` for auth, stock loading, search, and watchlist actions
- Supabase for authentication and storing each user's watchlist
- Python (FastAPI) as the backend layer for stock data and daily email summaries

## Backend

The backend is handled by a Python **FastAPI** server, replacing the original n8n setup.

The backend handles:
- Fetching top stocks via `yfinance`
- Searching stocks via `yfinance`
- Running a daily 9 AM summary cron job via `apscheduler`
- Sending the watchlist summary email via `smtplib`

The frontend calls these FastAPI endpoints:
- `GET /top-stocks`: Fetches details of top stock symbols.
- `GET /search-stock?q=<symbol>`: Searches for a specific stock symbol.

The expected stock response is a list of stocks with:
- `symbol`
- `price`
- `previousClose`


## Authentication

Authentication is done with Supabase Auth.

Users can:

- create an account with email and password
- log in with email and password
- log out from the dashboard

The app checks the current Supabase user when the page loads:

- logged-in users who open `auth.html` are sent to `index.html`
- logged-out users who open `index.html` are sent back to `auth.html`

## Watchlist Storage

Watchlist data is stored in Supabase in a `watchlists` table.

The app expects the table to store:

- the user's Supabase id
- the stock symbol added by that user

In the frontend this is handled with:

- `user_id`
- `stock_symbol`

Each user only sees and manages their own watchlist.

## Main Features

- Email/password signup and login
- Protected dashboard page
- Top stocks list loaded from FastAPI backend
- Stock search with debounce
- Add stocks to watchlist
- Remove stocks from watchlist
- Watchlist saved in Supabase
- Daily 9 AM email summary powered by FastAPI backend scheduler
- Responsive dark UI

## How The Flow Works

1. User signs up or logs in from `auth.html`.
2. Supabase handles the auth session.
3. After login, the user goes to `index.html`.
4. The dashboard loads the user's saved watchlist from Supabase.
5. The top stocks list is fetched from the FastAPI backend.
6. Search also goes through the FastAPI backend.
7. Adding or removing a stock updates the Supabase watchlist table.
8. The FastAPI scheduler runs daily at 9:00 AM to send email summaries.


## Running & Deploying

### 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/schema.sql` in **SQL Editor** to create the `watchlists` table and RLS policies.
3. Under **Authentication → URL Configuration**, set **Site URL** to your deployed frontend URL and add it to **Redirect URLs**.
4. Copy your project URL and anon/publishable key into `frontend/config.js`.

### 2. Backend (Render / Railway / Fly.io)

**One-click on Render:** Connect this repo and use the included `render.yaml` blueprint, then set the secret env vars in the Render dashboard.

**Manual deploy:**

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Required for | Notes |
|----------|--------------|-------|
| `SUPABASE_URL` | Email summaries | Same project as frontend |
| `SUPABASE_KEY` | Email summaries | Anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Email summaries | Needed to look up user emails |
| `SMTP_*` | Email summaries | Gmail app password recommended |
| `ALLOWED_ORIGINS` | Production | Your frontend URL, e.g. `https://stocktrack.netlify.app` |
| `ADMIN_API_KEY` | Admin endpoints | Protects `/test-email` and `/trigger-daily-summary` |
| `ENABLE_SCHEDULER` | Daily emails | Keep `true` on always-on hosts; use external cron + `/trigger-daily-summary` otherwise |

Stock endpoints work without Supabase or SMTP.

**Test admin endpoints** (after setting `ADMIN_API_KEY`):

```bash
curl -H "X-Admin-Key: your-key" "https://your-api.onrender.com/test-email?to=you@example.com"
curl -X POST -H "X-Admin-Key: your-key" "https://your-api.onrender.com/trigger-daily-summary"
```

### 3. Frontend (Netlify / Vercel / GitHub Pages)

1. Deploy the `frontend/` folder as a static site.
   - **Netlify:** Connect the repo; `netlify.toml` is already configured.
   - **GitHub Pages / others:** Set publish directory to `frontend`.
2. Edit `frontend/config.js`:
   - Set `BACKEND_URL` to your deployed API URL (e.g. `https://stocktrack-api.onrender.com`).
   - Confirm `SUPABASE_URL` and `SUPABASE_KEY` match your project.
3. Redeploy the frontend after updating `config.js`.

See `frontend/config.example.js` for the template.

### Local development

**Frontend:** Open `frontend/auth.html` via a local server:

```bash
npx serve frontend
```

Leave `BACKEND_URL` empty in `config.js` — the app uses `http://localhost:8000` automatically.

**Backend:**

```bash
pip install -r backend/requirements.txt
python backend/main.py
```

Runs at `http://localhost:8000`. Use `ALLOWED_ORIGINS=*` (default) for local CORS.


## Machine Learning Features

The project now includes a machine learning module for stock price prediction.

### How it works:
1. **Symbol list**: `ml/symbols.py` defines ~50 US tickers and ~45 Indian NSE tickers (`.NS`). Edit this file to add more symbols, then retrain.
2. **Data Generation**: `ml/generate_data.py` fetches 2 years of history for every symbol in that list via `yfinance`.
3. **Model Training**: `ml/train_model.py` trains one Random Forest with symbol encoding so India and US prices are handled separately.
4. **Prediction**: One batch run forecasts **all** trained symbols at once (no per-stock CLI args).

Training on *every* listed stock in India and the US is not practical (thousands of tickers). The default list covers major Nifty and US large-cap names; extend `ml/symbols.py` as needed.

### How to run:
1. **Generate Data**:
   ```bash
   python ml/generate_data.py
   ```
2. **Train Model** (also runs batch predictions when finished):
   ```bash
   python ml/train_model.py
   ```
3. **Predict all stocks** (writes `ml/predictions.csv` and `ml/predictions.json`):
   ```bash
   python ml/predict.py
   ```

**API:** `GET http://localhost:8000/predictions` returns forecasts for all trained symbols in one response.

Note: This is a demonstration of ML workflow and should not be used for actual financial decisions.



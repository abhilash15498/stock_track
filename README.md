# StockTrack

StockTrack is a simple stock watchlist web app. It lets a user sign up, log in, browse/search stocks, add stocks to a personal watchlist, remove them later, and get a daily stock summary by email.

![StockTrack Screenshot](./image.png)

The project is intentionally small on the frontend side. There is no custom server in this repo.

## What It Uses

- `auth.html` for login and signup
- `index.html` for the dashboard
- `style.css` for the UI
- `script.js` for auth, stock loading, search, and watchlist actions
- Supabase for authentication and storing each user's watchlist
- n8n as the backend/no-code automation layer for stock data and daily email summaries

## Backend

The backend part is handled with n8n, not with a Node/Express/Django server inside this repo.

n8n is used as a no-code backend for:

- fetching the top stocks
- searching stocks by query
- returning stock data to the frontend through webhook URLs
- running the daily 9 AM summary workflow
- sending the watchlist summary email

The frontend calls these n8n webhook endpoints:

- `https://shrikrishnarp.app.n8n.cloud/webhook/top-stocks`
- `https://shrikrishnarp.app.n8n.cloud/webhook/search-stock`

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
- Top stocks list loaded from n8n
- Stock search with debounce
- Add stocks to watchlist
- Remove stocks from watchlist
- Watchlist saved in Supabase
- Daily 9 AM email summary powered by n8n
- Responsive dark UI

## How The Flow Works

1. User signs up or logs in from `auth.html`.
2. Supabase handles the auth session.
3. After login, the user goes to `index.html`.
4. The dashboard loads the user's saved watchlist from Supabase.
5. The top stocks list is fetched from the n8n webhook.
6. Search also goes through an n8n webhook.
7. Adding or removing a stock updates the Supabase watchlist table.
8. n8n handles the daily summary email workflow outside this frontend project.

## Running The Project

This is a static frontend, so it can be opened directly in a browser.

Open `auth.html` first if you are not logged in.

For local testing, using a small static server is also fine, especially if the browser blocks anything when opened as a local file.

## Project Files

- `auth.html` - login and signup page
- `index.html` - main dashboard
- `script.js` - Supabase auth, n8n API calls, search, and watchlist logic
- `style.css` - page styling and responsive layout


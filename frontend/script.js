const SUPABASE_URL = "https://zbrvppyhusrjpdpudzrl.supabase.co";
const SUPABASE_KEY = "sb_publishable_1WpZzKGTEyLyHY8JguNXjg_dFgyazGB";

// Dynamically determine the backend URL
const BACKEND_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000"
    : "https://your-deployed-backend.onrender.com"; // TODO: Replace with your actual deployed backend URL

const TOP_STOCKS_API = `${BACKEND_URL}/top-stocks`;
const SEARCH_STOCKS_API = `${BACKEND_URL}/search-stock`;

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const state = {
    currentUser: null,
    watchlistStocks: new Set(),
    availableStocks: [],
};

document.addEventListener("DOMContentLoaded", initializePage);

async function initializePage() {
    const {
        data: { user },
    } = await supabaseClient.auth.getUser();

    state.currentUser = user;

    if (isAuthPage()) {
        bindAuthEvents();

        if (user) {
            window.location.href = "index.html";
        }

        return;
    }

    if (!isDashboardPage()) {
        return;
    }

    if (!user) {
        window.location.href = "auth.html";
        return;
    }

    document.getElementById("userEmail").textContent = user.email;
    bindDashboardEvents();
    await getStocks();
    await fetchTopStocks();
}

function bindAuthEvents() {
    document.getElementById("authForm").addEventListener("submit", (event) => {
        event.preventDefault();
        login();
    });

    document.getElementById("signUpButton").addEventListener("click", signUp);
}

function bindDashboardEvents() {
    document.getElementById("logoutButton").addEventListener("click", logout);
    document.getElementById("availableStocks").addEventListener("click", handleStockAction);
    document.getElementById("stockList").addEventListener("click", handleStockAction);
    setupSearch();
}

async function signUp() {
    const credentials = getCredentials();

    if (!credentials) {
        return;
    }

    setAuthLoading(true);

    try {
        const { error } = await supabaseClient.auth.signUp(credentials);

        if (error) {
            showMessage(error.message, "error");
            return;
        }

        await supabaseClient.auth.signOut();
        state.currentUser = null;
        showMessage("Signup successful. You can now login.", "success");
    } finally {
        setAuthLoading(false);
    }
}

async function login() {
    const credentials = getCredentials();

    if (!credentials) {
        return;
    }

    setAuthLoading(true);

    try {
        const { error } = await supabaseClient.auth.signInWithPassword(credentials);

        if (error) {
            showMessage(error.message, "error");
            return;
        }

        showMessage("Login successful...", "success");
        window.location.href = "index.html";
    } finally {
        setAuthLoading(false);
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = "auth.html";
}

async function fetchTopStocks() {
    await loadStocks(TOP_STOCKS_API, "Unable to load top stocks.");
}

async function searchStocks(query) {
    const url = `${SEARCH_STOCKS_API}?q=${encodeURIComponent(query)}`;
    await loadStocks(url, "Unable to search stocks.");
}

async function loadStocks(url, errorMessage) {
    const container = document.getElementById("availableStocks");
    container.replaceChildren(createEmptyState("Loading stocks..."));

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        state.availableStocks = normalizeStocks(data);
        renderAvailableStocks();
    } catch (error) {
        console.error(errorMessage, error);
        renderAvailableError(errorMessage);
    }
}

function setupSearch() {
    const searchInput = document.getElementById("stockSearch");
    let debounceTimer;

    searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);

        debounceTimer = setTimeout(() => {
            const query = searchInput.value.trim();

            if (query) {
                searchStocks(query);
            } else {
                fetchTopStocks();
            }
        }, 400);
    });
}

function handleStockAction(event) {
    const button = event.target.closest("[data-action][data-symbol]");

    if (!button) {
        return;
    }

    if (button.dataset.action === "add") {
        addStock(button.dataset.symbol);
    }

    if (button.dataset.action === "remove") {
        removeStock(button.dataset.symbol);
    }
}

function renderAvailableStocks() {
    const container = document.getElementById("availableStocks");
    const query = document.getElementById("stockSearch")?.value.trim().toUpperCase() || "";
    const filteredStocks = state.availableStocks.filter((stock) => stock.symbol.includes(query));

    if (filteredStocks.length === 0) {
        container.replaceChildren(createEmptyState("No matching stocks found."));
        return;
    }

    const fragment = document.createDocumentFragment();
    filteredStocks.forEach((stock) => {
        fragment.appendChild(createAvailableStockCard(stock));
    });
    container.replaceChildren(fragment);
}

function createAvailableStockCard(stock) {
    const isAdded = state.watchlistStocks.has(stock.symbol);
    const card = document.createElement("article");
    const stockInfo = document.createElement("div");
    const title = document.createElement("h3");
    const price = document.createElement("p");
    const change = document.createElement("p");
    const button = document.createElement("button");

    card.className = "stock-card";
    stockInfo.className = "stock-info";
    title.textContent = stock.symbol;
    price.className = "stock-price";
    price.textContent = formatPrice(stock.price);
    change.className = getChangeClass(stock);
    change.textContent = formatChange(stock);

    stockInfo.append(title, price, change);

    if (stock.prediction) {
        const predictionEl = document.createElement("p");
        predictionEl.className = `stock-prediction ${stock.prediction.direction.toLowerCase()}`;
        const dirSymbol = stock.prediction.direction === "UP" ? "▲" : "▼";
        predictionEl.textContent = `Forecast: Rs. ${stock.prediction.predictedClose.toFixed(2)} (${dirSymbol} ${stock.prediction.percentChange.toFixed(2)}%)`;
        stockInfo.appendChild(predictionEl);
    }

    button.className = `btn btn-add${isAdded ? " added" : ""}`;
    button.type = "button";
    button.dataset.action = "add";
    button.dataset.symbol = stock.symbol;
    button.disabled = isAdded;
    button.textContent = isAdded ? "Added" : "+ Add";

    card.append(stockInfo, button);

    return card;
}

function formatPrice(price) {
    return price === null ? "Price unavailable" : `Rs. ${price.toFixed(2)}`;
}

function formatChange(stock) {
    if (!hasValidChange(stock)) {
        return "Change unavailable";
    }

    const change = stock.price - stock.previousClose;
    const percent = (change / stock.previousClose) * 100;
    return `${change.toFixed(2)} (${percent.toFixed(2)}%)`;
}

function getChangeClass(stock) {
    if (!hasValidChange(stock)) {
        return "stock-change";
    }

    return stock.price >= stock.previousClose ? "stock-change positive" : "stock-change negative";
}

function hasValidChange(stock) {
    return stock.price !== null && stock.previousClose !== null && stock.previousClose !== 0;
}

async function addStock(stockSymbol) {
    const stock = normalizeSymbol(stockSymbol);
    const user = await requireUser();

    if (!user || !stock || state.watchlistStocks.has(stock)) {
        return;
    }

    const { error } = await supabaseClient
        .from("watchlists")
        .insert([{ user_id: user.id, stock_symbol: stock }]);

    if (error) {
        renderWatchlistError(error.message);
        return;
    }

    state.watchlistStocks.add(stock);
    renderAvailableStocks();
    renderWatchlist();
}

async function getStocks() {
    const user = await requireUser();

    if (!user) {
        return;
    }

    const { data, error } = await supabaseClient
        .from("watchlists")
        .select("stock_symbol")
        .eq("user_id", user.id);

    if (error) {
        renderWatchlistError(error.message);
        return;
    }

    state.watchlistStocks = new Set(
        (data || [])
            .map((item) =>
                normalizeSymbol(item.stock_symbol)
            )
            .filter(Boolean)
    );

    renderWatchlist();
}

async function removeStock(stockSymbol) {
    const stock = normalizeSymbol(stockSymbol);
    const user = await requireUser();

    if (!user || !stock) {
        return;
    }

    const { error } = await supabaseClient
        .from("watchlists")
        .delete()
        .eq("user_id", user.id)
        .eq("stock_symbol", stock);

    if (error) {
        renderWatchlistError(error.message);
        return;
    }

    state.watchlistStocks.delete(stock);
    renderAvailableStocks();
    renderWatchlist();
}

function renderWatchlist() {
    const stockList = document.getElementById("stockList");

    if (!stockList) {
        return;
    }

    if (state.watchlistStocks.size === 0) {
        stockList.replaceChildren(createEmptyState("Your watchlist is empty."));
        return;
    }

    const fragment = document.createDocumentFragment();
    [...state.watchlistStocks].sort().forEach((symbol) => {
        fragment.appendChild(createWatchlistCard(symbol));
    });
    stockList.replaceChildren(fragment);
}

function createWatchlistCard(symbol) {
    const card = document.createElement("article");
    const stockInfo = document.createElement("div");
    const title = document.createElement("h3");
    const button = document.createElement("button");

    card.className = "stock-card watchlist-card";
    stockInfo.className = "stock-info";
    title.textContent = symbol;
    stockInfo.appendChild(title);

    // Look up stock info from available stocks to display price and prediction
    const stock = state.availableStocks.find(s => s.symbol === symbol);
    if (stock) {
        const price = document.createElement("p");
        price.className = "stock-price";
        price.textContent = formatPrice(stock.price);

        const change = document.createElement("p");
        change.className = getChangeClass(stock);
        change.textContent = formatChange(stock);

        stockInfo.append(price, change);

        if (stock.prediction) {
            const predictionEl = document.createElement("p");
            predictionEl.className = `stock-prediction ${stock.prediction.direction.toLowerCase()}`;
            const dirSymbol = stock.prediction.direction === "UP" ? "▲" : "▼";
            predictionEl.textContent = `Forecast: Rs. ${stock.prediction.predictedClose.toFixed(2)} (${dirSymbol} ${stock.prediction.percentChange.toFixed(2)}%)`;
            stockInfo.appendChild(predictionEl);
        }
    }

    button.className = "btn btn-danger";
    button.type = "button";
    button.dataset.action = "remove";
    button.dataset.symbol = symbol;
    button.textContent = "Remove";

    card.append(stockInfo, button);

    return card;
}

function renderWatchlistError(message) {
    const stockList = document.getElementById("stockList");

    if (!stockList) {
        return;
    }

    stockList.replaceChildren(createMessage(message, "error"));
}

function renderAvailableError(message) {
    const container = document.getElementById("availableStocks");

    if (!container) {
        return;
    }

    container.replaceChildren(createMessage(message, "error"));
}

function createMessage(text, type) {
    const message = document.createElement("div");

    message.className = `message ${type} full-width`;
    message.textContent = text;

    return message;
}

function createEmptyState(text) {
    const emptyState = document.createElement("div");

    emptyState.className = "empty-state full-width";
    emptyState.textContent = text;

    return emptyState;
}

function getCredentials() {
    const email = document.getElementById("email")?.value.trim() || "";
    const password = document.getElementById("password")?.value || "";

    if (!email || !password) {
        showMessage("Please enter email and password.", "error");
        return null;
    }

    return { email, password };
}

async function requireUser() {
    if (state.currentUser) {
        return state.currentUser;
    }

    const {
        data: { user },
    } = await supabaseClient.auth.getUser();

    state.currentUser = user;

    if (!user && isDashboardPage()) {
        window.location.href = "auth.html";
    }

    return user;
}

function showMessage(text, type) {
    const message = document.getElementById("authMessage");

    if (!message) {
        return;
    }

    message.textContent = text;
    message.className = `message ${type}`;
}

function setAuthLoading(isLoading) {
    document.getElementById("signUpButton").disabled = isLoading;
    document.getElementById("loginButton").disabled = isLoading;
}

function normalizeStocks(data) {
    if (!Array.isArray(data)) {
        return [];
    }

    return data
        .map((stock) => ({
            symbol: normalizeSymbol(stock.symbol),
            price: toNumber(stock.price),
            previousClose: toNumber(stock.previousClose),
            prediction: stock.prediction ? {
                predictedClose: toNumber(stock.prediction.predictedClose),
                direction: String(stock.prediction.direction || ""),
                percentChange: toNumber(stock.prediction.percentChange)
            } : null
        }))
        .filter((stock) => stock.symbol);
}

function normalizeSymbol(symbol) {
    return String(symbol || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9._-]/g, "");
}

function toNumber(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const number = Number(String(value).replace(/,/g, ""));

    return Number.isFinite(number) ? number : null;
}

function isAuthPage() {
    return Boolean(document.getElementById("authForm"));
}

function isDashboardPage() {
    return Boolean(document.getElementById("availableStocks"));
}

import yfinance as yf
import pandas as pd
import os
import sys

ML_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ML_DIR)
from symbols import TRAINING_SYMBOLS

CHUNK_SIZE = 10


def _download_chunk(symbols: list[str]) -> pd.DataFrame:
    try:
        data = yf.download(
            tickers=" ".join(symbols),
            period="2y",
            group_by="ticker",
            auto_adjust=False,
            threads=False,
            progress=False,
        )
    except Exception:
        return pd.DataFrame()

    rows = []
    if data is None or data.empty:
        return pd.DataFrame()

    for symbol in symbols:
        try:
            if isinstance(data.columns, pd.MultiIndex):
                # yfinance may use (field, ticker) or (ticker, field)
                o = data.get(("Open", symbol))
                if o is None:
                    o = data.get((symbol, "Open"))
                h = data.get(("High", symbol))
                if h is None:
                    h = data.get((symbol, "High"))
                l = data.get(("Low", symbol))
                if l is None:
                    l = data.get((symbol, "Low"))
                c = data.get(("Close", symbol))
                if c is None:
                    c = data.get((symbol, "Close"))
                v = data.get(("Volume", symbol))
                if v is None:
                    v = data.get((symbol, "Volume"))
                if any(series is None for series in [o, h, l, c, v]):
                    continue
                df = pd.DataFrame({"Open": o, "High": h, "Low": l, "Close": c, "Volume": v})
            else:
                df = data[["Open", "High", "Low", "Close", "Volume"]].copy()

            df = df.dropna().reset_index()
            if df.empty:
                continue
            df["Symbol"] = symbol.upper()
            rows.append(df)
        except Exception:
            continue

    if not rows:
        return pd.DataFrame()
    return pd.concat(rows, ignore_index=True)


def generate_dataset():
    symbols = TRAINING_SYMBOLS
    print(f"Fetching historical data for {len(symbols)} stocks (US + India)...")
    print("This may take several minutes.\n")

    all_data = []
    failed = []
    for i in range(0, len(symbols), CHUNK_SIZE):
        chunk = symbols[i : i + CHUNK_SIZE]
        df_chunk = _download_chunk(chunk)
        if df_chunk.empty:
            failed.extend(chunk)
            print(f"  [err]  chunk {i // CHUNK_SIZE + 1}: no data for {', '.join(chunk)}")
            continue

        all_data.append(df_chunk)
        present = set(df_chunk["Symbol"].unique())
        for sym in chunk:
            if sym.upper() in present:
                count = int((df_chunk["Symbol"] == sym.upper()).sum())
                print(f"  [ok]   {sym}: {count} rows")
            else:
                print(f"  [skip] No data for {sym}")
                failed.append(sym)

    if not all_data:
        print("No data fetched. Exiting.")
        return

    dataset = pd.concat(all_data, ignore_index=True)
    output_file = os.path.join(ML_DIR, "stock_data.csv")
    dataset.to_csv(output_file, index=False)

    print(f"\nDataset saved to {output_file}")
    print(f"Total records: {len(dataset)}")
    print(f"Symbols with data: {dataset['Symbol'].nunique()}")
    if failed:
        print(f"Failed/skipped ({len(failed)}): {', '.join(failed)}")

if __name__ == "__main__":
    generate_dataset()

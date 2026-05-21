import yfinance as yf
import pandas as pd
import os
import sys

ML_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ML_DIR)
from symbols import TRAINING_SYMBOLS

def generate_dataset():
    symbols = TRAINING_SYMBOLS
    print(f"Fetching historical data for {len(symbols)} stocks (US + India)...")
    print("This may take several minutes.\n")

    all_data = []
    failed = []

    for symbol in symbols:
        try:
            stock = yf.Ticker(symbol)
            df = stock.history(period="2y")

            if df.empty:
                print(f"  [skip] No data for {symbol}")
                failed.append(symbol)
                continue

            df["Symbol"] = symbol.upper()
            df = df.reset_index()
            all_data.append(df)
            print(f"  [ok]   {symbol}: {len(df)} rows")
        except Exception as e:
            print(f"  [err]  {symbol}: {e}")
            failed.append(symbol)

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

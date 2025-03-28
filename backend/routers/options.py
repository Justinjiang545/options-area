from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime
import json

router = APIRouter()

class OptionContract(BaseModel):
    contractSymbol: str
    strike: float
    lastPrice: Optional[float] = None
    bid: Optional[float] = None
    ask: Optional[float] = None
    change: Optional[float] = None
    percentChange: Optional[float] = None
    volume: Optional[int] = None
    openInterest: Optional[int] = None
    impliedVolatility: Optional[float] = None
    inTheMoney: Optional[bool] = None
    expiration: str
    optionType: str
    ticker: str
    selectedPrice: Optional[float] = None
    theta: Optional[float] = None
    gamma: Optional[float] = None

class WatchlistItem(OptionContract):
    currentPrice: Optional[float] = None
    PNL_USD: Optional[float] = None
    PNL_PCT: Optional[float] = None

@router.get("/tickers/{ticker}/info")
async def get_ticker_info(ticker: str):
    try:
        ticker_obj = yf.Ticker(ticker.upper())
        info = ticker_obj.info
        return {
            "name": info.get("shortName", ""),
            "currentPrice": info.get("currentPrice", 0),
            "previousClose": info.get("previousClose", 0),
            "marketCap": info.get("marketCap", 0),
            "volume": info.get("volume", 0)
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Error fetching ticker info: {str(e)}")

@router.get("/tickers/{ticker}/expirations")
async def get_expirations(ticker: str):
    try:
        ticker_obj = yf.Ticker(ticker.upper())
        expirations = ticker_obj.options

        formatted_expirations = []
        for exp in expirations:
            exp_date = datetime.strptime(exp, "%Y-%m-%d").date()
            formatted = f"{exp_date.strftime('%b %d, %Y')} ({exp})"
            formatted_expirations.append({"label": formatted, "value": exp})

        return formatted_expirations
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Error fetching expirations: {str(e)}")

def sanitize_for_json(obj):
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(item) for item in obj]
    elif isinstance(obj, float):
        if pd.isna(obj) or np.isinf(obj):
            return None
        return obj
    elif isinstance(obj, pd.Timestamp):
        return obj.strftime('%Y-%m-%d')
    elif isinstance(obj, pd.Series):
        return sanitize_for_json(obj.to_dict())
    else:
        return obj

@router.get("/tickers/{ticker}/options")
async def get_options_chain(
    ticker: str,
    expiration_date: str,
    option_type: str,
    strike_price: Optional[float] = None,
    num_strikes_range: Optional[int] = 25
):
    try:
        ticker_obj = yf.Ticker(ticker.upper())

        info = ticker_obj.info
        if not info or 'symbol' not in info:
            return []

        available_expirations = ticker_obj.options
        if not available_expirations or expiration_date not in available_expirations:

            try:

                date_obj = datetime.strptime(expiration_date, "%Y-%m-%d").date()
                alternate_format = date_obj.strftime("%y%m%d")

                if alternate_format not in str(available_expirations):
                    print(f"No options available for {ticker} on {expiration_date}")
                    return []
            except:
                print(f"Invalid date format or no options for {ticker} on {expiration_date}")
                return []

        try:

            options = ticker_obj.option_chain(expiration_date)

            if option_type.lower() == "call":
                df = options.calls
            else:
                df = options.puts

            if df.empty:
                return []

            if strike_price and strike_price > 0 and num_strikes_range:
                df = df[
                    (df['strike'] >= (strike_price - num_strikes_range)) &
                    (df['strike'] <= (strike_price + num_strikes_range))
                ]

            for col in df.select_dtypes(include=['float', 'float64']).columns:
                df[col] = df[col].replace([np.inf, -np.inf], np.nan)

            for col in df.columns:
                if col in ['strike', 'lastPrice', 'bid', 'ask', 'change', 'percentChange', 'impliedVolatility']:

                    df[col] = df[col].fillna(0.0)
                elif col in ['volume', 'openInterest']:

                    df[col] = df[col].fillna(0)
                elif col == 'inTheMoney':

                    df[col] = df[col].fillna(False)
                else:

                    df[col] = df[col].fillna('')

            options_list = df.to_dict('records')

            for option in options_list:
                option['contractSymbol'] = reformat_symbol(option.get('contractSymbol', ''))

                option['optionType'] = option_type
                option['expiration'] = expiration_date
                option['ticker'] = ticker.upper()

            sanitized_options = sanitize_for_json(options_list)
            return sanitized_options

        except Exception as inner_e:
            print(f"Error processing options data: {str(inner_e)}")

            return []
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Error fetching options chain: {str(e)}")

def reformat_symbol(symbol: str) -> str:
    parts = symbol.split('.')
    if len(parts) != 2:
        return symbol

    components = parts[0]
    try:

        ticker = ''
        i = 0
        while i < len(components) and components[i].isalpha():
            ticker += components[i]
            i += 1

        date_part = components[i:i+6]
        if len(date_part) == 6:
            yy = date_part[0:2]
            mm = date_part[2:4]
            dd = date_part[4:6]

            option_type = 'C' if components[i+6] == 'C' else 'P'
            strike_str = components[i+7:]

            if '.' in strike_str:
                strike = strike_str
            else:
                strike = strike_str[:-3] + '.' + strike_str[-3:]

            return f"{ticker} {yy}-{mm}-{dd} {option_type} ${strike}"
    except:
        pass
    return symbol

@router.get("/contracts/{symbol}/price")
async def get_current_price(symbol: str):
    try:

        if '_' in symbol:

            parts = symbol.split('_')
            if len(parts) < 2:
                raise HTTPException(status_code=400, detail="Invalid option symbol format")

            ticker_symbol = parts[0]
            option_info = parts[1]

            if len(option_info) < 15:
                raise HTTPException(status_code=400, detail="Invalid option symbol format")

            date_str = option_info[:6]
            year = int('20' + date_str[:2])
            month = int(date_str[2:4])
            day = int(date_str[4:6])

            option_type = 'call' if option_info[6] == 'C' else 'put'
        else:

            i = 0
            while i < len(symbol) and symbol[i].isalpha():
                i += 1
            ticker_symbol = symbol[:i]

            if not ticker_symbol or i+8 >= len(symbol):
                raise HTTPException(status_code=400, detail="Invalid option symbol format")

            date_str = symbol[i:i+6]
            if not date_str.isdigit() or len(date_str) != 6:
                raise HTTPException(status_code=400, detail="Invalid date format in option symbol")

            year = int('20' + date_str[:2])
            month = int(date_str[2:4])
            day = int(date_str[4:6])

            option_type = 'call' if symbol[i+6] == 'C' else 'put'

        ticker_obj = yf.Ticker(ticker_symbol)

        stock_data = ticker_obj.history(period="1d")
        if stock_data.empty:
            raise HTTPException(status_code=500, detail="Could not fetch stock data for ticker")

        expiration_date = f"{year}-{month:02d}-{day:02d}"

        try:
            options = ticker_obj.option_chain(expiration_date)

            if option_type == 'call':
                options_df = options.calls
            else:
                options_df = options.puts

            contract_match = options_df[options_df['contractSymbol'] == symbol]

            if contract_match.empty and '_' in symbol:

                option_info = symbol.split('_')[1]
                strike_str = option_info[7:]
                strike_price = float(strike_str) / 1000
                contract_match = options_df[options_df['strike'] == strike_price]
            elif contract_match.empty:

                i = 0
                while i < len(symbol) and symbol[i].isalpha():
                    i += 1

                strike_str = symbol[i+7:]
                if strike_str.isdigit() and len(strike_str) >= 5:

                    strike_price = float(strike_str) / 1000
                    contract_match = options_df[options_df['strike'] == strike_price]

            if not contract_match.empty:

                contract_data = contract_match.iloc[0]
                return {

                    "currentPrice": float(contract_data['lastPrice']),
                    "bid": float(contract_data['bid']),
                    "ask": float(contract_data['ask']),
                    "change": float(contract_data['change']) if 'change' in contract_data else 0.0,
                    "percentChange": float(contract_data['percentChange']) if 'percentChange' in contract_data else 0.0,
                    "volume": int(contract_data['volume']) if 'volume' in contract_data and not pd.isna(contract_data['volume']) else 0
                }
            else:

                midpoint_price = (stock_data.iloc[-1]['Close'] * 0.02)
                return {
                    "currentPrice": float(midpoint_price),
                    "bid": float(midpoint_price * 0.95),
                    "ask": float(midpoint_price * 1.05),
                    "change": 0.0,
                    "percentChange": 0.0,
                    "volume": 0
                }
        except Exception as e:

            pass

        last_price = ticker_obj.history(period="1d").iloc[-1].Close
        return {"currentPrice": float(last_price), "bid": None, "ask": None, "change": 0, "percentChange": 0}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Error fetching current price: {str(e)}")

@router.get("/watchlist")
async def get_watchlist():

    return {"message": "Watchlist is managed client-side in localStorage"}

@router.post("/calculate-pnl")
async def calculate_pnl(item: WatchlistItem):
    try:
        current_price = item.currentPrice or 0
        selected_price = item.selectedPrice or 0

        if current_price > 0 and selected_price > 0:
            pnl_usd = (current_price - selected_price) * 100
            pnl_pct = (current_price - selected_price) / selected_price * 100 if selected_price > 0 else 0

            return {
                "PNL_USD": pnl_usd,
                "PNL_PCT": pnl_pct
            }
        return {"PNL_USD": 0, "PNL_PCT": 0}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error calculating P&L: {str(e)}")

from fastapi import APIRouter, HTTPException
from typing import List, Optional, Dict
from pydantic import BaseModel
import yfinance as yf
import numpy as np
import scipy.stats as si
from time import time
from functools import lru_cache

router = APIRouter()

TICKER_CACHE: Dict[str, tuple[float, float]] = {}

@router.get("/ticker/{ticker}/price")
async def get_ticker_price(ticker: str):
    ticker = ticker.upper()
    current_time = time()

    if ticker in TICKER_CACHE:
        cached_price, cached_time = TICKER_CACHE[ticker]

        if current_time - cached_time < 30:
            return {"price": cached_price}

    try:
        ticker_data = yf.Ticker(ticker)
        current_price = ticker_data.info.get('regularMarketPrice')
        if current_price is None:
            raise HTTPException(status_code=404, detail=f"Could not find price for ticker {ticker}")

        TICKER_CACHE[ticker] = (current_price, current_time)

        TICKER_CACHE.clear() if len(TICKER_CACHE) > 100 else None

        return {"price": current_price}
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg:

            if ticker in TICKER_CACHE:
                cached_price, _ = TICKER_CACHE[ticker]
                return {"price": cached_price}
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again in 30 seconds.")
        raise HTTPException(status_code=400, detail=f"Error fetching ticker price: {error_msg}")

class OptionPricingInput(BaseModel):
    stock_price: float
    strike_price: float
    time_to_expiry: float
    risk_free_rate: float
    volatility: float
    time_in_days: bool = False

class Greeks(BaseModel):
    delta: float
    gamma: float
    theta: float
    vega: float
    rho: float

class OptionPricingResult(BaseModel):
    call_price: float
    put_price: float
    call_greeks: Greeks
    put_greeks: Greeks

@router.post("/calculate", response_model=OptionPricingResult)
async def calculate_options(input: OptionPricingInput):
    try:
        S = input.stock_price
        K = input.strike_price
        T = input.time_to_expiry
        r = input.risk_free_rate
        sigma = input.volatility

        if input.time_in_days:
            T = T / 365.0

        d1 = (np.log(S/K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
        d2 = d1 - sigma * np.sqrt(T)

        call = S * si.norm.cdf(d1) - K * np.exp(-r * T) * si.norm.cdf(d2)
        put = K * np.exp(-r * T) * si.norm.cdf(-d2) - S * si.norm.cdf(-d1)

        call_delta = si.norm.cdf(d1)
        put_delta = call_delta - 1

        gamma = si.norm.pdf(d1) / (S * sigma * np.sqrt(T))

        call_theta = -((S * sigma * si.norm.pdf(d1)) / (2 * np.sqrt(T))) - (r * K * np.exp(-r * T) * si.norm.cdf(d2))
        put_theta = -((S * sigma * si.norm.pdf(d1)) / (2 * np.sqrt(T))) + (r * K * np.exp(-r * T) * si.norm.cdf(-d2))

        call_theta = call_theta / 365
        put_theta = put_theta / 365

        vega = S * np.sqrt(T) * si.norm.pdf(d1) * 0.01

        call_rho = K * T * np.exp(-r * T) * si.norm.cdf(d2) * 0.01
        put_rho = -K * T * np.exp(-r * T) * si.norm.cdf(-d2) * 0.01

        return OptionPricingResult(
            call_price=float(call),
            put_price=float(put),
            call_greeks=Greeks(
                delta=float(call_delta),
                gamma=float(gamma),
                theta=float(call_theta),
                vega=float(vega),
                rho=float(call_rho)
            ),
            put_greeks=Greeks(
                delta=float(put_delta),
                gamma=float(gamma),
                theta=float(put_theta),
                vega=float(vega),
                rho=float(put_rho)
            )
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error calculating options: {str(e)}")

@router.post("/sensitivity")
async def generate_sensitivity_data(input: OptionPricingInput, variable: str, range_min: float, range_max: float, steps: int = 20):
    try:
        base_S = input.stock_price
        base_K = input.strike_price
        base_T = input.time_to_expiry / 365.0 if input.time_in_days else input.time_to_expiry
        base_r = input.risk_free_rate
        base_sigma = input.volatility
        option_type = input.option_type.lower()

        values = np.linspace(range_min, range_max, steps)
        results = []

        for val in values:

            S, K, T, r, sigma = base_S, base_K, base_T, base_r, base_sigma

            if variable == 'stock_price':
                S = val
            elif variable == 'strike_price':
                K = val
            elif variable == 'time_to_expiry':
                T = val / 365.0 if input.time_in_days else val
            elif variable == 'risk_free_rate':
                r = val
            elif variable == 'volatility':
                sigma = val

            d1 = (np.log(S/K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
            d2 = d1 - sigma * np.sqrt(T)

            if option_type == 'call':
                price = float(S * si.norm.cdf(d1) - K * np.exp(-r * T) * si.norm.cdf(d2))
            else:
                price = float(K * np.exp(-r * T) * si.norm.cdf(-d2) - S * si.norm.cdf(-d1))

            results.append({
                'value': float(val),
                'price': price
            })

        return {
            'variable': variable,
            'option_type': option_type,
            'data': results
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error generating sensitivity data: {str(e)}")

@router.post("/heatmap")
async def generate_heatmap(input: OptionPricingInput):
    try:
        S = input.stock_price
        K = input.strike_price
        T = input.time_to_expiry
        r = input.risk_free_rate
        sigma = input.volatility

        if input.time_in_days:
            T = T / 365.0

        S_min = max(1, S * 0.5)
        S_max = S * 1.5 if S > 0 else 100
        S_range = np.linspace(S_min, S_max, 11).tolist()

        delta_sigma = sigma * 0.5
        sigma_range = np.linspace(sigma - delta_sigma, sigma + delta_sigma, 11).tolist()

        call_heatmap = []
        put_heatmap = []

        for sigma_val in sigma_range:
            call_row = []
            put_row = []
            for S_val in S_range:
                d1 = (np.log(S_val/K) + (r + 0.5 * sigma_val**2) * T) / (sigma_val * np.sqrt(T))
                d2 = d1 - sigma_val * np.sqrt(T)

                call = float(S_val * si.norm.cdf(d1) - K * np.exp(-r * T) * si.norm.cdf(d2))
                put = float(K * np.exp(-r * T) * si.norm.cdf(-d2) - S_val * si.norm.cdf(-d1))

                call_row.append(call)
                put_row.append(put)

            call_heatmap.append(call_row)
            put_heatmap.append(put_row)

        return {
            "call_heatmap": call_heatmap,
            "put_heatmap": put_heatmap,
            "S_range": S_range,
            "sigma_range": sigma_range
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error generating heatmap: {str(e)}")

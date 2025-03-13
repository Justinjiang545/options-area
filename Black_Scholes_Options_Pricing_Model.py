import streamlit as st
import numpy as np
import scipy.stats as si
import matplotlib.pyplot as plt
import seaborn as sns
import streamlit as st
from streamlit_navigation_bar import st_navbar
import streamlit_shadcn_ui as ui

st.set_page_config(
    layout="wide",
    page_title="Black-Scholes Options Pricing Model"
    )





def black_scholes_call_put(S, K, T, r, sigma):
    if toggleTime:
        T = T / 365.0
    d1 = (np.log(S/K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    call = S * si.norm.cdf(d1) - K * np.exp(-r * T) * si.norm.cdf(d2)
    put = K * np.exp(-r * T) * si.norm.cdf(-d2) - S * si.norm.cdf(-d1)
    return call, put

st.title("Black-Scholes Options Pricing Model")
st.sidebar.header("Input Parameters")

S = st.sidebar.number_input("Stock Price (S)", min_value=0.0, step=1.0)
K = st.sidebar.number_input("Strike Price (K)", min_value=0.001, value=1.0, step=1.0)
T = st.sidebar.number_input("Time to Maturity (Default: Years)", min_value=0.01, value=1.0, step=1.0)
toggleTime = st.sidebar.checkbox("Time in Days")
r = st.sidebar.number_input("Risk-Free Interest Rate (r)", min_value=0.01, value=0.05, step=0.01)
sigma = st.sidebar.number_input("Volatility (\u03C3)", min_value=0.01, value=0.2, step=0.01)

call_price, put_price = black_scholes_call_put(S, K, T, r, sigma)

st.markdown(
    """
    <style>
    .price-container {
        display: flex;
        gap: 250px;
        margin-top: 10px;
    }
    .price-box {
        background-color: #35384a;
        padding: 20px;
        border: 3px solid #ddd;
        border-radius: 15px;
        font-size: 24px;
        font-weight: bold;
        text-align: center;
        flex: 1;
        color: #fff;
    }
    </style>
    """,
    unsafe_allow_html=True
)

st.write("## Option Prices")
st.markdown(
    f"""
    <div class="price-container">
        <div class="price-box">Call Price: {call_price:.2f}</div>
        <div class="price-box">Put Price: {put_price:.2f}</div>
    </div>
    """,
    unsafe_allow_html=True
)

st.write("## Heatmaps of Call and Put Prices")


S_min = max(1, S * 0.5)  
S_max = S * 1.5 if S > 0 else 100
S_range = np.linspace(S_min, S_max, 11)

delta_sigma = sigma * 0.5  
sigma_range = np.linspace(sigma - delta_sigma, sigma + delta_sigma, 11)

call_heatmap = np.zeros((len(sigma_range), len(S_range)))
put_heatmap = np.zeros((len(sigma_range), len(S_range)))

for i, sigma_val in enumerate(sigma_range):
    for j, S_val in enumerate(S_range):
        call_val, put_val = black_scholes_call_put(S_val, K, T, r, sigma_val)
        call_heatmap[i, j] = call_val
        put_heatmap[i, j] = put_val

sns.set_context("talk")
col1, col2 = st.columns(2)

with col1:
    st.write("### Call Price Heatmap")
    sns.set_theme(style="white")
    fig_call, ax_call = plt.subplots(figsize=(8, 6))
    sns.heatmap(
        call_heatmap,
        cmap="viridis",
        ax=ax_call,
        annot=True,
        fmt=".2f",
        linewidths=0.5,
        linecolor="white",
        xticklabels=np.round(S_range, 1),
        yticklabels=np.round(sigma_range, 2)
    )
    ax_call.set_xlabel("Stock Price (S)")
    ax_call.set_ylabel("Volatility (\u03C3)")
    ax_call.set_title("Call Prices")
    plt.tight_layout()
    st.pyplot(fig_call)

with col2:
    st.write("### Put Price Heatmap")
    sns.set_theme(style="white")
    fig_put, ax_put = plt.subplots(figsize=(8, 6))
    sns.heatmap(
        put_heatmap,
        cmap="viridis",
        ax=ax_put,
        annot=True,
        fmt=".2f",
        linewidths=0.5,
        linecolor="white",
        xticklabels=np.round(S_range, 1),
        yticklabels=np.round(sigma_range, 2)
    )
    ax_put.set_xlabel("Stock Price (S)")
    ax_put.set_ylabel("Volatility (\u03C3)")
    ax_put.set_title("Put Prices")
    plt.tight_layout()
    st.pyplot(fig_put)



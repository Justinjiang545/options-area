import streamlit as st
import yfinance as yf
import pandas as pd
import datetime
import numpy as np
import json
import streamlit.components.v1 as components

st.set_page_config(layout="wide", page_title="Options Watchlist", page_icon=":page_with_curl:")


st.markdown(
    """
    <style>
    .reportview-container .main .block-container {
        max-width: 1400px;
        padding: 2rem;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

st.title("Options Watchlist with Real-Time Data")

def reformat_symbol(symbol: str) -> str:
    i = 0
    while i < len(symbol) and symbol[i].isalpha():
        i += 1
    if i == 0 or len(symbol) < i + 15:
        return symbol
    underlying = symbol[:i]
    expiration = symbol[i:i+6]  # YYMMDD
    option_letter = symbol[i+6]
    strike_field = symbol[i+7:i+15]
    yy = expiration[:2]
    mm = expiration[2:4]
    dd = expiration[4:6]
    exp_str = f"{int(mm)}/{int(dd)}/{yy}"
    opt_type = "CALL" if option_letter.upper() == "C" else "PUT"
    strike_price = int(strike_field) / 1000
    strike_str = f"${int(strike_price)}" if strike_price.is_integer() else f"${strike_price:.2f}"
    return f"{underlying} {strike_str} {opt_type} {exp_str}"


def get_price(row, price_type: str):
    if price_type == "Bid":
        return row.get("bid", row["lastPrice"])
    elif price_type == "Ask":
        return row.get("ask", row["lastPrice"])
    elif price_type == "Mid":
        bid_val = row.get("bid", None)
        ask_val = row.get("ask", None)
        return round((bid_val + ask_val) / 2, 2)
    else:
        return row["lastPrice"]


for key in ["options_df", "original_options_df"]:
    if key not in st.session_state:
        st.session_state[key] = None
for key in ["expiration_date", "option_type", "ticker_input"]:
    if key not in st.session_state:
        st.session_state[key] = ""
if "show_chain" not in st.session_state:
    st.session_state.show_chain = False
if "clear_confirmed" not in st.session_state:
    st.session_state.clear_confirmed = False



def update_ticker():
    st.session_state.original_options_df = None
    st.session_state.options_df = None
    st.session_state.show_chain = False


ticker_input = st.text_input("Enter Ticker Symbol", placeholder="AAPL", key="ticker_input", on_change=update_ticker)


components.html(
    """
    <script>
      const stored = localStorage.getItem('watchlist') || '[]';
      const url = new URL(window.location);
      url.searchParams.set('watchlist', stored);
      window.history.replaceState({}, '', url);
    </script>
    """,
    height=0,
)
if "watchlist" in st.query_params:
    try:
        watchlist = json.loads(st.query_params["watchlist"])
    except Exception:
        watchlist = []
else:
    watchlist = []


def add_to_watchlist(row_dict, selected_price):
    row_dict["selectedPrice"] = selected_price
    row_dict["Ticker"] = st.session_state.ticker_input
    row_dict["Option Type"] = st.session_state.option_type
    row_dict["Expiration"] = st.session_state.expiration_date
    if "theta" not in row_dict:
        row_dict["theta"] = None
    if "gamma" not in row_dict:
        row_dict["gamma"] = None
    watchlist.append(row_dict)
    new_watchlist_json = json.dumps(watchlist, default=str)
    st.query_params.watchlist = new_watchlist_json
    components.html(
        f"""
        <script>
        localStorage.setItem('watchlist', JSON.stringify({json.dumps(new_watchlist_json)}));
        window.location.reload();
        </script>
        """,
        height=0,
    )


def handle_add_contract(row, price, formatted):
    row_dict = row.to_dict()
    row_dict["contractSymbol"] = formatted
    add_to_watchlist(row_dict, price)


if ticker_input:
    ticker_obj = yf.Ticker(ticker_input.upper())
    expirations = ticker_obj.options
    if not expirations:
        st.error("No options data available for this ticker.")
    else:
        available_dates = [datetime.datetime.strptime(exp, "%Y-%m-%d").date() for exp in expirations]
        default_date = available_dates[0]
        selected_date = st.date_input("Select Expiration Date", 
                                      value=default_date,
                                      min_value=min(available_dates),
                                      max_value=max(available_dates))
        if selected_date not in available_dates:
            st.info(f"Invalid date selected. Defaulting to {default_date}.")
            selected_date = default_date
        st.session_state.expiration_date = selected_date.strftime("%Y-%m-%d")
        new_option_type = st.selectbox("Select Option Type", ["Call", "Put"])
        if st.session_state.option_type != new_option_type:
            st.session_state.option_type = new_option_type
            st.session_state.original_options_df = None
            st.session_state.options_df = None
        strike_input = st.number_input("Optional: Desired Strike Price", value=0.0, step=1.0)
        if strike_input > 0:
            num_strikes_range = st.slider("Number of strikes up/down", 1, 20, 3)
        else:
            num_strikes_range = None

        with st.expander("Fetch Options Chain", expanded=False):
            if st.session_state.original_options_df is None:
                with st.spinner("Fetching options data..."):
                    chain = ticker_obj.option_chain(st.session_state.expiration_date)
                    df = chain.calls if st.session_state.option_type == "Call" else chain.puts
                    df = df.sort_values("strike").reset_index(drop=True)
                    if df.empty:
                        st.warning("No options found for these settings.")
                    else:
                        st.session_state.original_options_df = df
            if st.session_state.original_options_df is not None:
                if st.button("Apply Strike Filter"):
                    df = st.session_state.original_options_df
                    if strike_input > 0 and num_strikes_range is not None:
                        strikes_arr = df["strike"].to_numpy()
                        idx = (abs(strikes_arr - strike_input)).argmin()
                        low = max(0, idx - num_strikes_range)
                        high = min(len(df), idx + num_strikes_range + 1)
                        st.session_state.options_df = df.iloc[low:high].reset_index(drop=True)
                    else:
                        st.session_state.options_df = df
                    st.rerun(scope="app")
            if st.session_state.options_df is not None:
                st.markdown(f"### Options Chain for {st.session_state.ticker_input} ({st.session_state.option_type})")
                df_chain = st.session_state.options_df
                if len(df_chain) > 10:
                    groups = [df_chain.iloc[i:i+10] for i in range(0, len(df_chain), 10)]
                    tabs = st.tabs([f"Page {i+1}" for i in range(len(groups))])
                    for tab, group_df in zip(tabs, groups):
                        with tab:
                            for i, row in group_df.iterrows():
                                formatted = reformat_symbol(row["contractSymbol"])
                                col_left, col_mid, col_right = st.columns([3,4,3])
                                col_left.markdown(f"**{formatted}**\nStrike: {row['strike']}")
                                with col_mid:
                                    st.write("**Prices:**")
                                    bid_val = row.get("bid", row["lastPrice"])
                                    ask_val = row.get("ask", row["lastPrice"])
                                    mid_val = (bid_val + ask_val) / 2 if (bid_val is not None and ask_val is not None) else row["lastPrice"]
                                    btns = st.columns(3)
                                    if btns[0].button(f"Bid {bid_val}", key=f"bid_{row['contractSymbol']}_{i}"):
                                        handle_add_contract(row, bid_val, formatted)
                                    if btns[2].button(f"Mid {mid_val}", key=f"mid_{row['contractSymbol']}_{i}"):
                                        handle_add_contract(row, mid_val, formatted)
                                    if btns[1].button(f"Ask {ask_val}", key=f"ask_{row['contractSymbol']}_{i}"):
                                        handle_add_contract(row, ask_val, formatted)
                                col_right.markdown(f"**Volume:** {row['volume']}  \n**Open Int.:** {row['openInterest']}")
                else:
                    for i, row in st.session_state.options_df.iterrows():
                        formatted = reformat_symbol(row["contractSymbol"])
                        col_left, col_mid, col_right = st.columns([3,4,3])
                        col_left.markdown(f"**{formatted}**\nStrike: {row['strike']}")
                        with col_mid:
                            st.write("**Prices:**")
                            bid_val = row.get("bid", row["lastPrice"])
                            ask_val = row.get("ask", row["lastPrice"])
                            mid_val = round((bid_val + ask_val) / 2,2) if (bid_val is not None and ask_val is not None) else row["lastPrice"]
                            btns = st.columns(3)
                            if btns[0].button(f"Bid {bid_val}", key=f"bid_{row['contractSymbol']}_{i}"):
                                handle_add_contract(row, bid_val, formatted)
                            if btns[2].button(f"Mid {mid_val}", key=f"mid_{row['contractSymbol']}_{i}"):
                                handle_add_contract(row, mid_val, formatted)
                            if btns[1].button(f"Ask {ask_val}", key=f"ask_{row['contractSymbol']}_{i}"):
                                handle_add_contract(row, ask_val, formatted)
                        col_right.markdown(f"**Volume:** {row['volume']}  \n**Open Int.:** {row['openInterest']}")
                        

st.markdown("### Current Watchlist")
if watchlist:
    df_watchlist = pd.DataFrame(watchlist)
    for col in ["inTheMoney", "contractSize", "currency", "lastTradeDate"]:
        if col in df_watchlist.columns:
            df_watchlist.drop(columns=[col], inplace=True)
    for col in ["impliedVolatility", "theta", "gamma"]:
        if col not in df_watchlist.columns:
            df_watchlist[col] = None
    display_order = [
        "contractSymbol", "Ticker", "Option Type", "Expiration", "strike",
        "selectedPrice", "volume", "openInterest", "impliedVolatility", "theta", "gamma"
    ]
    df_watchlist = df_watchlist[[c for c in display_order if c in df_watchlist.columns]]
    df_watchlist["Remove"] = ""
    header_cols = st.columns([2,1,1,1,1,1.5,1.2,1.2,1,1,1,1])
    header_cols[0].markdown("**Contract**")
    header_cols[1].markdown("**Ticker**")
    header_cols[2].markdown("**Type**")
    header_cols[3].markdown("**Expiration**")
    header_cols[4].markdown("**Strike**")
    header_cols[5].markdown("**Selected Price**")
    header_cols[6].markdown("**Volume**")
    header_cols[7].markdown("**Open Int.**")
    header_cols[8].markdown("**IV**")
    header_cols[9].markdown("**Theta**")
    header_cols[10].markdown("**Gamma**")
    header_cols[11].markdown("**Remove**")
    for idx, row in df_watchlist.iterrows():
        cols = st.columns([2,1,1,1,1,1.5,1.2,1.2,1,1,1,1])
        cols[0].write(row.get("contractSymbol", ""))
        cols[1].write(row.get("Ticker", ""))
        cols[2].write(row.get("Option Type", ""))
        cols[3].write(row.get("Expiration", ""))
        cols[4].write(row.get("strike", ""))
        cols[5].write(row.get("selectedPrice", ""))
        cols[6].write(row.get("volume", ""))
        cols[7].write(row.get("openInterest", ""))
        cols[8].write(row.get("impliedVolatility", "N/A"))
        cols[9].write(row.get("theta", "N/A"))
        cols[10].write(row.get("gamma", "N/A"))
        if cols[11].button("Remove", key=f"remove_{idx}"):
            watchlist.pop(idx)
            new_watchlist_json = json.dumps(watchlist, default=str)
            st.query_params.watchlist = new_watchlist_json
            components.html(
                f"""
                <script>
                localStorage.setItem('watchlist', JSON.stringify({json.dumps(new_watchlist_json)}));
                window.location.reload();
                </script>
                """,
                height=0,
            )
            st.rerun(scope="app")
else:
    st.info("Your watchlist is empty. Add some option contracts above!")


if st.button("Clear Watchlist"):
    @st.dialog("Clear Watchlist")
    def clear_dialog():
        st.write("Are you sure you want to clear your entire watchlist?")
        col1, col2 = st.columns(2)
        if col1.button("Yes, clear it"):
            for i in range(len(watchlist) - 1, -1, -1):
                watchlist.pop(i)
            new_watchlist_json = json.dumps(watchlist, default=str)
            st.query_params.watchlist = new_watchlist_json
            components.html(
                f"""
                <script>
                localStorage.setItem('watchlist', JSON.stringify({json.dumps(new_watchlist_json)}));
                window.location.reload();
                </script>
                """,
                height=0,
            )
            st.rerun(scope="app")
        if col2.button("Cancel"):
            st.rerun(scope="app")
    clear_dialog()

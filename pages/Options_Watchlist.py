import streamlit as st
import yfinance as yf
import pandas as pd
import datetime
import numpy as np
import json
import streamlit.components.v1 as components
import re

st.set_page_config(layout="wide", page_title="Options Watchlist", page_icon=":page_with_curl:")

st.markdown(
    """
    <style>
    .reportview-container .main .block-container {
        max-width: 1400px;
        padding: 2rem;
    }
    /* Make ticker input shorter horizontally */
    [data-testid="stTextInput"] {
        max-width: 250px;
    }
    /* Style for profit/loss indicators */
    .profit {
        color: #0ECB81;
        font-weight: bold;
    }
    .loss {
        color: #F6465D;
        font-weight: bold;
    }
    .total-pnl {
        font-size: 1.2em;
        padding: 10px;
        border-radius: 5px;
        margin-top: 15px;
        margin-bottom: 15px;
    }
    /* Table styling for compact view */
    .compact-table {
        font-size: 0.9rem;
        margin-top: -1rem;
    }
    .compact-header {
        font-weight: bold;
        display: inline-block;
        padding: 2px;
    }
    .compact-row {
        height: auto !important;
        padding-top: 0.2rem !important;
        padding-bottom: 0.2rem !important;
    }
    .stButton button {
        padding: 0.1rem 0.5rem;
        font-size: 0.8rem;
        line-height: 1;
    }
    /* Override Streamlit's default padding */
    .block-container {
        padding-top: 1rem !important;
        padding-bottom: 1rem !important;
    }
    .element-container {
        margin-bottom: 0.5rem !important;
    }
    [data-testid="column"] {
        padding: 0 !important;
        margin: 0 !important;
    }
    .stMarkdown p {
        margin-bottom: 0 !important;
        line-height: 1.2 !important;
    }
    .header-row {
        border-bottom: 1px solid rgba(250, 250, 250, 0.2);
        margin-bottom: 0.5rem;
        padding-bottom: 0.2rem;
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

# Initialize session state variables if not set
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
    // Pure localStorage implementation - no URL parameters
    const stored = localStorage.getItem('watchlist') || '[]';
    try {
        window.watchlistData = JSON.parse(stored);
    } catch (e) {
        console.error('Error parsing watchlist data:', e);
        window.watchlistData = [];
        localStorage.setItem('watchlist', '[]');
    }
    
    // Create a hidden element to pass data to Python
    document.addEventListener('DOMContentLoaded', function() {
        const dataElement = document.getElementById('watchlist-data');
        if (dataElement) {
            dataElement.textContent = JSON.stringify(window.watchlistData);
        }
    });
    </script>
    """,
    height=0,
)

watchlist_elem = st.empty()
watchlist_elem.markdown('<div id="watchlist-data" style="display:none;"></div>', unsafe_allow_html=True)
try:
    watchlist = json.loads(watchlist_elem.markdown.split('>')[1].split('<')[0])
except Exception:
    watchlist = []

def add_to_watchlist(row_dict, selected_price):
    # Convert pandas Timestamp objects to string format
    for key, value in row_dict.items():
        if isinstance(value, pd.Timestamp):
            row_dict[key] = value.strftime('%Y-%m-%d')
    
    row_dict["selectedPrice"] = selected_price
    row_dict["Ticker"] = st.session_state.ticker_input
    row_dict["Option Type"] = st.session_state.option_type
    row_dict["Expiration"] = st.session_state.expiration_date
    if "theta" not in row_dict:
        row_dict["theta"] = None
    if "gamma" not in row_dict:
        row_dict["gamma"] = None
    watchlist.append(row_dict)
    
    # Convert any remaining non-serializable objects to strings
    watchlist_json = json.dumps(watchlist, default=str)
    
    components.html(
        f"""
        <script>
        // Store directly in localStorage without double serialization
        localStorage.setItem('watchlist', '{watchlist_json}');
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
        # Convert expirations to readable format for display
        formatted_expirations = []
        for exp in expirations:
            exp_date = datetime.datetime.strptime(exp, "%Y-%m-%d").date()
            formatted = f"{exp_date.strftime('%b %d, %Y')} ({exp})"
            formatted_expirations.append((formatted, exp))
        
        # Create dropdown with formatted dates
        selected_formatted = st.selectbox(
            "Select Expiration Date",
            options=[item[0] for item in formatted_expirations],
            index=0
        )
        
        # Get the actual date value from the selected formatted date
        selected_exp = next(item[1] for item in formatted_expirations if item[0] == selected_formatted)
        
        # Reset options dataframes if expiration date changes
        if 'expiration_date' in st.session_state and st.session_state.expiration_date != selected_exp:
            st.session_state.original_options_df = None
            st.session_state.options_df = None
            
        st.session_state.expiration_date = selected_exp
        
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
                    st.rerun()
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
                                    if btns[0].button(f"Bid {bid_val:.2f}", key=f"bid_{row['contractSymbol']}_{i}"):
                                        handle_add_contract(row, bid_val, formatted)
                                    if btns[2].button(f"Mid {mid_val:.2f}", key=f"mid_{row['contractSymbol']}_{i}"):
                                        handle_add_contract(row, mid_val, formatted)
                                    if btns[1].button(f"Ask {ask_val:.2f}", key=f"ask_{row['contractSymbol']}_{i}"):
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
                            if btns[0].button(f"Bid {bid_val:.2f}", key=f"bid_{row['contractSymbol']}_{i}"):
                                handle_add_contract(row, bid_val, formatted)
                            if btns[2].button(f"Mid {mid_val:.2f}", key=f"mid_{row['contractSymbol']}_{i}"):
                                handle_add_contract(row, mid_val, formatted)
                            if btns[1].button(f"Ask {ask_val:.2f}", key=f"ask_{row['contractSymbol']}_{i}"):
                                handle_add_contract(row, ask_val, formatted)
                        col_right.markdown(f"**Volume:** {row['volume']}  \n**Open Int.:** {row['openInterest']}")

def get_current_price(symbol):
    """Get the current real-time price of the option contract"""
    try:
        ticker_data = yf.Ticker(symbol)
        if hasattr(ticker_data, 'info') and ticker_data.info:
            price = ticker_data.info.get('regularMarketPrice', None)
            if price is None:
                price = ticker_data.info.get('lastPrice', None)
            return price
        return None
    except Exception as e:
        st.warning(f"Error fetching price for {symbol}: {e}")
        return None

def calculate_pnl(current_price, selected_price, contracts=1):
    """Calculate profit/loss in USD and percentage"""
    if current_price is None or selected_price is None:
        return None, None
    pnl_usd = (current_price - selected_price) * 100 * contracts  # Standard 100 multiplier
    pnl_pct = ((current_price - selected_price) / selected_price * 100) if selected_price != 0 else 0
    return pnl_usd, pnl_pct

def format_pnl(pnl_usd, pnl_pct):
    """Format P&L with percent above the dollar value"""
    if pnl_usd is None or pnl_pct is None:
        return "N/A"
    pnl_class = "profit" if pnl_usd >= 0 else "loss"
    pnl_sign = "+" if pnl_usd >= 0 else ""
    formatted_pct = f"{pnl_sign}{abs(pnl_pct):.2f}%"
    formatted_usd = f"{pnl_sign}${abs(pnl_usd):.2f}"
    combined = f'<div class="pnl-combined"><div class="pnl-percent">{formatted_pct}</div><div class="{pnl_class}">{formatted_usd}</div></div>'
    return combined

# Initialize sorting session state if not present
if "sort_column" not in st.session_state:
    st.session_state.sort_column = None
if "sort_ascending" not in st.session_state:
    st.session_state.sort_ascending = True

def sort_watchlist(column, ascending=None):
    """Handle sorting of the watchlist based on the given column"""
    if st.session_state.sort_column == column and ascending is None:
        st.session_state.sort_ascending = not st.session_state.sort_ascending
    else:
        st.session_state.sort_column = column
        if ascending is not None:
            st.session_state.sort_ascending = ascending

st.markdown("### Current Watchlist")
if watchlist:
    current_prices = []
    pnl_data = []
    total_pnl_usd = 0

    # Fetch current prices and calculate P&L for each contract
    for entry in watchlist:
        symbol = entry.get("contractSymbol")
        current_price = get_current_price(symbol)
        selected_price = entry.get("selectedPrice")
        current_prices.append(current_price)
        if current_price is not None and selected_price is not None:
            pnl_usd, pnl_pct = calculate_pnl(current_price, selected_price)
            pnl_data.append((pnl_usd, pnl_pct))
            if pnl_usd is not None:
                total_pnl_usd += pnl_usd
        else:
            pnl_data.append((None, None))
    
    df_watchlist = pd.DataFrame(watchlist)
    # Drop unused columns if present
    for col in ["inTheMoney", "contractSize", "currency", "lastTradeDate"]:
        if col in df_watchlist.columns:
            df_watchlist.drop(columns=[col], inplace=True)
    
    df_watchlist["currentPrice"] = current_prices
    # Rearrange display order
    display_order = ["contractSymbol", "selectedPrice", "Expiration", "Option Type", "currentPrice", "openInterest"]
    df_watchlist = df_watchlist[[c for c in display_order if c in df_watchlist.columns]]
    df_watchlist["PNL_USD"] = [item[0] if item else None for item in pnl_data]
    df_watchlist["PNL_PCT"] = [item[1] if item else None for item in pnl_data]
    df_watchlist["Remove"] = ""
    
    # Apply sorting if set
    if st.session_state.sort_column:
        sort_col = st.session_state.sort_column
        if sort_col == "P&L":
            sort_col = "PNL_USD"
        if sort_col in df_watchlist.columns:
            df_watchlist = df_watchlist.sort_values(
                by=sort_col, 
                ascending=st.session_state.sort_ascending,
                na_position='last'
            ).reset_index(drop=True)
    
    # Display total P&L at the top
    pnl_class = "profit" if total_pnl_usd >= 0 else "loss"
    if total_pnl_usd >= 0:
        total_pnl_html = f'<div class="total-pnl {pnl_class}">Total P&L: +${abs(total_pnl_usd):.2f}</div>'
    else:
        total_pnl_html = f'<div class="total-pnl {pnl_class}">Total P&L: -${abs(total_pnl_usd):.2f}</div>'
    st.markdown(total_pnl_html, unsafe_allow_html=True)
    
    # Define table columns: Contract | Price | Expiration | Type | Current Price | P&L | OI | Remove
    col_widths = [2.5, 1.2, 1.5, 1, 1.5, 1.5, 1, 0.8]
    header_cols = st.columns(col_widths)
    
    # Column 0: Contract (non-sortable)
    with header_cols[0]:
        st.markdown("<div class='compact-header'>Contract</div>", unsafe_allow_html=True)
    
    # Column 1: Price (sortable by "selectedPrice")
    with header_cols[1]:
        sub_cols = st.columns([0.6, 0.2, 0.2])
        sort_indicator = ""
        if st.session_state.sort_column == "selectedPrice":
            sort_indicator = " (asc)" if st.session_state.sort_ascending else " (desc)"
        sub_cols[0].markdown(f"<div class='compact-header'>Price{sort_indicator}</div>", unsafe_allow_html=True)
        if sub_cols[1].button("▲", key="sort_selectedPrice_asc", help="Sort Price Ascending"):
            sort_watchlist("selectedPrice", True)
            st.rerun()
        if sub_cols[2].button("▼", key="sort_selectedPrice_desc", help="Sort Price Descending"):
            sort_watchlist("selectedPrice", False)
            st.rerun()
    
    # Column 2: Expiration (sortable by "Expiration")
    with header_cols[2]:
        sub_cols = st.columns([0.6, 0.2, 0.2])
        sort_indicator = ""
        if st.session_state.sort_column == "Expiration":
            sort_indicator = " (asc)" if st.session_state.sort_ascending else " (desc)"
        sub_cols[0].markdown(f"<div class='compact-header'>Expiration{sort_indicator}</div>", unsafe_allow_html=True)
        if sub_cols[1].button("▲", key="sort_Expiration_asc", help="Sort Expiration Ascending"):
            sort_watchlist("Expiration", True)
            st.rerun()
        if sub_cols[2].button("▼", key="sort_Expiration_desc", help="Sort Expiration Descending"):
            sort_watchlist("Expiration", False)
            st.rerun()
    
    # Column 3: Type (sortable by "Option Type")
    with header_cols[3]:
        sub_cols = st.columns([0.6, 0.2, 0.2])
        sort_indicator = ""
        if st.session_state.sort_column == "Option Type":
            sort_indicator = " (asc)" if st.session_state.sort_ascending else " (desc)"
        sub_cols[0].markdown(f"<div class='compact-header'>Type{sort_indicator}</div>", unsafe_allow_html=True)
        if sub_cols[1].button("▲", key="sort_Option_Type_asc", help="Sort Type Ascending"):
            sort_watchlist("Option Type", True)
            st.rerun()
        if sub_cols[2].button("▼", key="sort_Option_Type_desc", help="Sort Type Descending"):
            sort_watchlist("Option Type", False)
            st.rerun()
    
    # Column 4: Current Price (sortable by "currentPrice")
    with header_cols[4]:
        sub_cols = st.columns([0.6, 0.2, 0.2])
        sort_indicator = ""
        if st.session_state.sort_column == "currentPrice":
            sort_indicator = " (asc)" if st.session_state.sort_ascending else " (desc)"
        sub_cols[0].markdown(f"<div class='compact-header'>Current Price{sort_indicator}</div>", unsafe_allow_html=True)
        if sub_cols[1].button("▲", key="sort_currentPrice_asc", help="Sort Current Price Ascending"):
            sort_watchlist("currentPrice", True)
            st.rerun()
        if sub_cols[2].button("▼", key="sort_currentPrice_desc", help="Sort Current Price Descending"):
            sort_watchlist("currentPrice", False)
            st.rerun()
    
    # Column 5: P&L (sortable by "P&L", which sorts using "PNL_USD")
    with header_cols[5]:
        sub_cols = st.columns([0.6, 0.2, 0.2])
        sort_indicator = ""
        if st.session_state.sort_column == "P&L":
            sort_indicator = " (asc)" if st.session_state.sort_ascending else " (desc)"
        sub_cols[0].markdown(f"<div class='compact-header'>P&L{sort_indicator}</div>", unsafe_allow_html=True)
        if sub_cols[1].button("▲", key="sort_P&L_asc", help="Sort P&L Ascending"):
            sort_watchlist("P&L", True)
            st.rerun()
        if sub_cols[2].button("▼", key="sort_P&L_desc", help="Sort P&L Descending"):
            sort_watchlist("P&L", False)
            st.rerun()
    
    # Column 6: OI (renamed from openInterest; non-sortable)
    with header_cols[6]:
        st.markdown("<div class='compact-header'>OI</div>", unsafe_allow_html=True)
    
    # Column 7: Remove (non-sortable)
    with header_cols[7]:
        st.markdown("<div class='compact-header'></div>", unsafe_allow_html=True)
    
    st.markdown('<div class="compact-table">', unsafe_allow_html=True)
    
    # Display each row in the watchlist
    for idx, row in df_watchlist.iterrows():
        cols = st.columns(col_widths)
        # Contract
        cols[0].markdown(f"<div class='compact-row'>{row.get('contractSymbol', '')}</div>", unsafe_allow_html=True)
        # Price (selectedPrice)
        price_val = row.get("selectedPrice", 0)
        cols[1].markdown(f"<div class='compact-row'>${price_val:.2f}</div>", unsafe_allow_html=True)
        # Expiration
        cols[2].markdown(f"<div class='compact-row'>{row.get('Expiration', '')}</div>", unsafe_allow_html=True)
        # Option Type
        cols[3].markdown(f"<div class='compact-row'>{row.get('Option Type', '')}</div>", unsafe_allow_html=True)
        # Current Price
        current_price = row.get("currentPrice")
        if current_price is not None:
            cols[4].markdown(f"<div class='compact-row'>${current_price:.2f}</div>", unsafe_allow_html=True)
        else:
            cols[4].markdown("<div class='compact-row'>N/A</div>", unsafe_allow_html=True)
        # Combined P&L
        pnl_usd, pnl_pct = row.get("PNL_USD"), row.get("PNL_PCT")
        combined_pnl = format_pnl(pnl_usd, pnl_pct)
        cols[5].markdown(f"<div class='compact-row'>{combined_pnl}</div>", unsafe_allow_html=True)
        # OI
        cols[6].markdown(f"<div class='compact-row'>{row.get('openInterest', '')}</div>", unsafe_allow_html=True)
        # Remove button
        remove_button = f"""
        <div class="compact-row">
            <button 
                key="remove_{idx}" 
                onclick="removeItem({idx})"
                style="border:none;background:transparent;color:#FF5252;cursor:pointer;font-size:1rem;">
                ✕
            </button>
        </div>
        """
        cols[7].markdown(remove_button, unsafe_allow_html=True)
    
    st.markdown('</div>', unsafe_allow_html=True)
else:
    st.info("Your watchlist is empty. Add some option contracts above!")

# Add JavaScript function for removal
st.markdown(f"""
<script>
function removeItem(idx) {{
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    watchlist.splice(idx, 1);
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    window.location.reload();
}}
</script>
""", unsafe_allow_html=True)

if st.button("Clear Watchlist", type="primary"):
    @st.dialog("Clear Watchlist")
    def clear_dialog():
        st.write("Are you sure you want to clear your entire watchlist?")
        col1, col2 = st.columns(2)
        if col1.button("Yes, clear it"):
            watchlist.clear()
            watchlist_json = json.dumps(watchlist, default=str)
            components.html(
                f"""
                <script>
                localStorage.setItem('watchlist', JSON.stringify({json.dumps(watchlist_json)}));
                window.location.reload();
                </script>
                """,
                height=0,
            )
            st.rerun()
        if col2.button("Cancel"):
            st.rerun()
    clear_dialog()

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Options API endpoints
export const optionsApi = {
  // Get ticker information
  getTickerInfo: async (ticker) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/options/tickers/${ticker}/info`);
      return response.data;
    } catch (error) {
      console.error('Error fetching ticker info:', error);
      throw error;
    }
  },

  // Get expiration dates for a ticker
  getExpirations: async (ticker) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/options/tickers/${ticker}/expirations`);
      return response.data;
    } catch (error) {
      console.error('Error fetching expirations:', error);
      throw error;
    }
  },

  // Get options chain
  getOptionsChain: async (ticker, expirationDate, optionType, strikePrice, numStrikesRange) => {
    try {
      const params = {
        expiration_date: expirationDate,
        option_type: optionType
      };
      
      if (strikePrice > 0) {
        params.strike_price = strikePrice;
        params.num_strikes_range = numStrikesRange || 25;
      }
      
      const response = await axios.get(
        `${API_BASE_URL}/options/tickers/${ticker}/options`, 
        { params }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching options chain:', error);
      throw error;
    }
  },
  
  // Get current price of an option contract
  getCurrentPrice: async (contractSymbol) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/options/contracts/${contractSymbol}/price`);
      return response.data;
    } catch (error) {
      console.error('Error fetching current option price:', error);
      throw error;
    }
  },

  // Calculate P&L for a watchlist item
  calculatePnL: async (item) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/options/calculate-pnl`, item);
      return response.data;
    } catch (error) {
      console.error('Error calculating P&L:', error);
      throw error;
    }
  }
};

// Black-Scholes API endpoints
export const blackScholesApi = {
  // Get ticker price
  getTickerPrice: async (ticker) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/black-scholes/ticker/${ticker}/price`);
      return response.data;
    } catch (error) {
      console.error('Error fetching ticker price:', error);
      throw error;
    }
  },
  // Calculate both option prices and Greeks
  calculateOptions: async (params) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/black-scholes/calculate`, params);
      return response.data;
    } catch (error) {
      console.error('Error calculating options:', error);
      throw error;
    }
  },

  // Generate sensitivity analysis data
  generateSensitivityData: async (params, variable, rangeMin, rangeMax, steps = 20) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/black-scholes/sensitivity`, 
        { ...params, variable, range_min: rangeMin, range_max: rangeMax, steps }
      );
      return response.data;
    } catch (error) {
      console.error('Error generating sensitivity data:', error);
      throw error;
    }
  },

  // Generate heatmap data
  generateHeatmap: async (params) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/black-scholes/heatmap`, params);
      return response.data;
    } catch (error) {
      console.error('Error generating heatmap data:', error);
      throw error;
    }
  }
};

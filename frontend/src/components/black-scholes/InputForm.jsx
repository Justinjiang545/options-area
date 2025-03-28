import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { blackScholesApi } from '../../services/api';
import styled from 'styled-components';

const FormContainer = styled.div`
  background-color: ${props => props.theme.mode === 'dark' ? '#2d2d2d' : 'white'};
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, ${props => props.theme.mode === 'dark' ? '0.5' : '0.1'});
  padding: 1.5rem;
  color: ${props => props.theme.mode === 'dark' ? '#e0e0e0' : '#333'};
  border: 1px solid ${props => props.theme.mode === 'dark' ? '#404040' : 'transparent'};
`;

const FormTitle = styled.h2`
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
  color: ${props => props.theme.mode === 'dark' ? '#fff' : '#333'};
`;

const FormGroup = styled.div`
  margin-bottom: 1.25rem;
`;

const TickerGroup = styled(FormGroup)`
  display: flex;
  gap: 0.5rem;
  
  input {
    flex: 1;
  }
  
  button {
    padding: 0.75rem 1rem;
    background-color: ${props => props.theme.mode === 'dark' ? '#5b9dff' : '#4a90e2'};
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
    
    &:hover {
      background-color: ${props => props.theme.mode === 'dark' ? '#357ABD' : '#357ABD'};
    }
    
    &:disabled {
      background-color: ${props => props.theme.mode === 'dark' ? '#404040' : '#cccccc'};
      cursor: not-allowed;
    }
  }
`;

const ErrorMessage = styled.div`
  color: #ff6b6b;
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: ${props => props.theme.mode === 'dark' ? '#fff' : '#333'};
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.mode === 'dark' ? '#404040' : '#ccc'};
  border-radius: 4px;
  font-size: 1rem;
  background-color: ${props => props.theme.mode === 'dark' ? '#1a1a1a' : 'white'};
  color: ${props => props.theme.mode === 'dark' ? '#e0e0e0' : '#333'};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.mode === 'dark' ? '#5b9dff' : '#4a90e2'};
    box-shadow: 0 0 0 2px ${props => props.theme.mode === 'dark' ? 'rgba(91, 157, 255, 0.2)' : 'rgba(74, 144, 226, 0.2)'};
  }
  
  &:disabled {
    background-color: ${props => props.theme.mode === 'dark' ? '#2d2d2d' : '#f5f5f5'};
    color: ${props => props.theme.mode === 'dark' ? '#808080' : '#666'};
    cursor: not-allowed;
  }

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    opacity: 1;
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  margin-top: 0.5rem;
  color: ${props => props.theme.mode === 'dark' ? '#fff' : '#333'};
`;

const Checkbox = styled.input`
  margin-right: 0.5rem;
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  cursor: pointer;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
`;

const CalculateButton = styled.button`
  flex: 1;
  background-color: ${props => props.theme.mode === 'dark' ? '#5b9dff' : '#4a90e2'};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: ${props => props.theme.mode === 'dark' ? '#4a7dcc' : '#357ABD'};
  }
  
  &:disabled {
    background-color: ${props => props.theme.mode === 'dark' ? '#404040' : '#cccccc'};
    cursor: not-allowed;
  }
`;

const ResetButton = styled.button`
  flex: 1;
  background-color: ${props => props.theme.mode === 'dark' ? '#2a2a2a' : '#f5f5f5'};
  color: ${props => props.theme.mode === 'dark' ? '#fff' : '#333'};
  border: 1px solid ${props => props.theme.mode === 'dark' ? '#404040' : '#ddd'};
  border-radius: 4px;
  padding: 0.75rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: ${props => props.theme.mode === 'dark' ? '#333' : '#e8e8e8'};
  }
`;

const InputForm = ({ inputs, onInputChange, onReset, isLoading }) => {
  const { theme } = useTheme();
  const [ticker, setTicker] = useState('');
  const [tickerError, setTickerError] = useState('');
  const [isLoadingTicker, setIsLoadingTicker] = useState(false);
  const [localInputs, setLocalInputs] = useState(inputs);
  const [isDirty, setIsDirty] = useState(false);
  
  const activeFieldRef = useRef(null);

  const handleTickerSubmit = async (e) => {
    e.preventDefault();
    if (!ticker) return;

    setIsLoadingTicker(true);
    setTickerError('');

    try {
      const response = await blackScholesApi.getTickerPrice(ticker);
      onInputChange('stock_price', response.price);
    } catch (error) {
      if (error.response?.status === 429) {
        setTickerError('Too many requests. Please wait 30 seconds before trying again.');
      } else {
        setTickerError(error.response?.data?.detail || 'Error fetching ticker price');
      }
    } finally {
      setIsLoadingTicker(false);
    }
  };

  useEffect(() => {
    if (!isDirty) {
      setLocalInputs(inputs);
    }
  }, [inputs, isDirty]);
  
  const handleFocus = (e) => {
    activeFieldRef.current = e.target.name;
    setIsDirty(true);
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setIsDirty(true);
    activeFieldRef.current = name;
    
    if (type === 'number') {
      setLocalInputs(prev => ({
        ...prev,
        [name]: value
      }));
    } else if (type === 'checkbox') {
      setLocalInputs(prev => ({
        ...prev,
        [name]: checked
      }));
      onInputChange(name, checked);
    } else {
      setLocalInputs(prev => ({
        ...prev,
        [name]: value
      }));
      onInputChange(name, value);
    }
  };
  
  const handleBlur = (e) => {
    const { name, value, type } = e.target;
    
    if (activeFieldRef.current === name) {
      activeFieldRef.current = null;
      setIsDirty(false);
    }
    
    if (type === 'number') {
      if (value === '') {
        setLocalInputs(prev => ({
          ...prev,
          [name]: '0'
        }));
        onInputChange(name, 0);
      } else {
        onInputChange(name, parseFloat(value) || 0);
      }
    }
  };
  
  return (
    <FormContainer theme={theme}>
      <FormTitle>Input Parameters</FormTitle>
      
      <FormGroup>
        <Label htmlFor="ticker">Stock Ticker (Optional)</Label>
        <TickerGroup>
          <Input
            type="text"
            id="ticker"
            name="ticker"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="e.g. AAPL"
            disabled={isLoading || isLoadingTicker}
          />
          <button
            onClick={handleTickerSubmit}
            disabled={!ticker || isLoading || isLoadingTicker}
          >
            {isLoadingTicker ? 'Loading...' : 'Fetch'}
          </button>
        </TickerGroup>
        {tickerError && <ErrorMessage>{tickerError}</ErrorMessage>}
      </FormGroup>
      
      <FormGroup>
        <Label htmlFor="stock_price">Stock Price ($)</Label>
        <Input
          type="number"
          id="stock_price"
          name="stock_price"
          value={localInputs.stock_price}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          min="0.01"
          step="any"
          disabled={isLoading}
        />
      </FormGroup>
      
      <FormGroup>
        <Label htmlFor="strike_price">Strike Price ($)</Label>
        <Input
          type="number"
          id="strike_price"
          name="strike_price"
          value={localInputs.strike_price}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          min="0.01"
          step="any"
          disabled={isLoading}
        />
      </FormGroup>
      
      <FormGroup>
        <Label htmlFor="time_to_expiry">Time to Expiry</Label>
        <Input
          type="number"
          id="time_to_expiry"
          name="time_to_expiry"
          value={localInputs.time_to_expiry}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          min="0.01"
          step="any"
          disabled={isLoading}
        />
        <CheckboxContainer>
          <Checkbox
            type="checkbox"
            id="time_in_days"
            name="time_in_days"
            checked={localInputs.time_in_days}
            onChange={handleChange}
            disabled={isLoading}
          />
          <CheckboxLabel htmlFor="time_in_days">
            Express in days (rather than years)
          </CheckboxLabel>
        </CheckboxContainer>
      </FormGroup>
      
      <FormGroup>
        <Label htmlFor="risk_free_rate">Risk-Free Rate (decimal)</Label>
        <Input
          type="number"
          id="risk_free_rate"
          name="risk_free_rate"
          value={localInputs.risk_free_rate}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          min="0"
          max="10"
          step="any"
          disabled={isLoading}
        />
      </FormGroup>
      
      <FormGroup>
        <Label htmlFor="volatility">Volatility (decimal)</Label>
        <Input
          type="number"
          id="volatility"
          name="volatility"
          value={localInputs.volatility}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          min="0.01"
          max="10"
          step="any"
          disabled={isLoading}
        />
      </FormGroup>
      

      
      <ButtonContainer>
        <ResetButton
          type="button"
          onClick={onReset}
          disabled={isLoading}
        >
          Reset
        </ResetButton>
      </ButtonContainer>
    </FormContainer>
  );
};

export default InputForm;

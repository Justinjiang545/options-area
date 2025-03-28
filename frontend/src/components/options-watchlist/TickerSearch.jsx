import React, { useState } from 'react';
import styled from 'styled-components';

const SearchContainer = styled.div`
  margin-bottom: 2rem;
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const SearchInput = styled.input`
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  max-width: 250px;
  &:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  }
`;

const SearchButton = styled.button`
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: #357ABD;
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.4);
  }
`;

const TickerSearch = ({ onTickerChange }) => {
  const [inputValue, setInputValue] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onTickerChange(inputValue.trim().toUpperCase());
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <SearchContainer>
        <SearchInput
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter Ticker Symbol (e.g., AAPL)"
          aria-label="Ticker Symbol"
        />
        <SearchButton type="submit">Search</SearchButton>
      </SearchContainer>
    </form>
  );
};

export default TickerSearch;

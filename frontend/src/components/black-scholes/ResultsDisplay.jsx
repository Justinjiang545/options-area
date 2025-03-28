import React from 'react';
import styled from 'styled-components';

const ResultsContainer = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  color: #333;
  max-width: 780px;
  margin-left: auto;
  margin-right: auto;
`;

const ResultsTitle = styled.h2`
  font-size: 1.125rem;
  margin-bottom: 1.5rem;
  color: #333;
`;

const ResultSection = styled.div`
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  margin-bottom: 0.75rem;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.25rem;
`;

const ResultsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
  max-width: 100%;
  
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const ResultItem = styled.div`
  padding: 0.5rem;
  background-color: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #eee;
`;

const ResultLabel = styled.div`
  font-size: ${props => props.isPrice ? '1.1rem' : '0.85rem'};
  color: ${props => props.isCall ? '#4a90e2' : '#e67e22'};
  font-weight: ${props => props.isPrice ? '600' : '400'};
  margin-bottom: 0.25rem;
`;

const ResultValue = styled.div`
  font-size: ${props => props.isPrice ? '1.5rem' : '0.9rem'};
  font-weight: ${props => props.isPrice ? '600' : '500'};
  color: #333;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #666;
  font-style: italic;
`;

const ResultsDisplay = ({
  results,
  greeks,
  isLoading
}) => {
  if (isLoading) {
    return (
      <ResultsContainer>
        <ResultsTitle>Results</ResultsTitle>
        <LoadingMessage>Calculating...</LoadingMessage>
      </ResultsContainer>
    );
  }
  
  if (!results) {
    return (
      <ResultsContainer>
        <ResultsTitle>Results</ResultsTitle>
        <LoadingMessage>Enter parameters to calculate option price</LoadingMessage>
      </ResultsContainer>
    );
  }
  
  const formatValue = (value, type = '') => {
    if (value === null || value === undefined) return '-';  
    
    if (type === 'price' || type === 'dollar') {
      return `$${value.toFixed(2)}`;
    } else if (type === 'percent') {
      return `${(value * 100).toFixed(2)}%`;
    } else if (type === 'decimal') {
      return value.toFixed(4);
    }
    
    return value.toFixed(4);
  };
  

  
  return (
    <ResultsContainer>
      <ResultsTitle>Results</ResultsTitle>
      
      <ResultsGrid>
        <div>
          <ResultItem>
            <ResultLabel isPrice isCall>Call Option Price</ResultLabel>
            <ResultValue isPrice>{formatValue(results.call_price, 'price')}</ResultValue>
          </ResultItem>
          
          {greeks && (
            <div style={{ marginTop: '1rem' }}>
              <ResultsGrid style={{ gap: '0.5rem' }}>
                <ResultItem>
                  <ResultLabel isCall>Delta</ResultLabel>
                  <ResultValue>{formatValue(greeks.call.delta, 'decimal')}</ResultValue>
                </ResultItem>
                <ResultItem>
                  <ResultLabel isCall>Gamma</ResultLabel>
                  <ResultValue>{formatValue(greeks.call.gamma, 'decimal')}</ResultValue>
                </ResultItem>
                <ResultItem>
                  <ResultLabel isCall>Theta</ResultLabel>
                  <ResultValue>{formatValue(greeks.call.theta, 'dollar')}</ResultValue>
                </ResultItem>
                <ResultItem>
                  <ResultLabel isCall>Vega</ResultLabel>
                  <ResultValue>{formatValue(greeks.call.vega, 'dollar')}</ResultValue>
                </ResultItem>
                <ResultItem>
                  <ResultLabel isCall>Rho</ResultLabel>
                  <ResultValue>{formatValue(greeks.call.rho, 'dollar')}</ResultValue>
                </ResultItem>
              </ResultsGrid>
            </div>
          )}
        </div>
        
        <div>
          <ResultItem>
            <ResultLabel isPrice>Put Option Price</ResultLabel>
            <ResultValue isPrice>{formatValue(results.put_price, 'price')}</ResultValue>
          </ResultItem>
          
          {greeks && (
            <div style={{ marginTop: '1rem' }}>
              <ResultsGrid style={{ gap: '0.5rem' }}>
                <ResultItem>
                  <ResultLabel>Delta</ResultLabel>
                  <ResultValue>{formatValue(greeks.put.delta, 'decimal')}</ResultValue>
                </ResultItem>
                <ResultItem>
                  <ResultLabel>Gamma</ResultLabel>
                  <ResultValue>{formatValue(greeks.put.gamma, 'decimal')}</ResultValue>
                </ResultItem>
                <ResultItem>
                  <ResultLabel>Theta</ResultLabel>
                  <ResultValue>{formatValue(greeks.put.theta, 'dollar')}</ResultValue>
                </ResultItem>
                <ResultItem>
                  <ResultLabel>Vega</ResultLabel>
                  <ResultValue>{formatValue(greeks.put.vega, 'dollar')}</ResultValue>
                </ResultItem>
                <ResultItem>
                  <ResultLabel>Rho</ResultLabel>
                  <ResultValue>{formatValue(greeks.put.rho, 'dollar')}</ResultValue>
                </ResultItem>
              </ResultsGrid>
            </div>
          )}
        </div>
      </ResultsGrid>
    </ResultsContainer>
  );
};

export default ResultsDisplay;

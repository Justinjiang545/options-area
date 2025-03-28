import React, { useState, useEffect } from 'react';
import HeatmapDisplay from './HeatmapDisplay';
import styled from 'styled-components';
import { blackScholesApi } from '../../services/api';
import InputForm from './InputForm';
import ResultsDisplay from './ResultsDisplay';

const Container = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  min-height: calc(100vh - 60px);
  max-width: 2000px;
  margin: 0 auto;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: #fff;
  color: #333;
`;

const Sidebar = styled.div`
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  height: fit-content;
  border: 1px solid #eee;
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding-top: 1rem;
`;

const Title = styled.h1`
  margin-bottom: 1.5rem;
  color: #333;
  font-size: 1.5rem;
`;

const ResultsGrid = styled.div`
  width: 100%;
`;

const BlackScholesCalculator = () => {
  const defaultInputs = {
    stock_price: 100,
    strike_price: 100,
    time_to_expiry: 30,
    risk_free_rate: 0.05,
    volatility: 0.2,
    time_in_days: true,
    ticker: ''
  };
  
  const [inputs, setInputs] = useState(defaultInputs);
  const [results, setResults] = useState(null);
  const [greeks, setGreeks] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [heatmapData, setHeatmapData] = useState(null);
  
  useEffect(() => {
    calculateOptionPrice();
  }, [inputs]);
  
  const calculateOptionPrice = async () => {
    try {
      setIsLoading(true);
      
      const response = await blackScholesApi.calculateOptions(inputs);
      
      setResults({
        call_price: response.call_price,
        put_price: response.put_price
      });
      
      setGreeks({
        call: response.call_greeks,
        put: response.put_greeks
      });
    } catch (error) {
      console.error('Error in Black-Scholes calculation:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInputChange = (name, value) => {
    setInputs({
      ...inputs,
      [name]: value
    });
  };
  

  const handleReset = () => {
    setInputs(defaultInputs);
  };
  
  useEffect(() => {
    generateHeatmapData();
  }, [inputs]);

  const generateHeatmapData = async () => {
    try {
      const data = await blackScholesApi.generateHeatmap(inputs);
      setHeatmapData(data);
    } catch (error) {
      console.error('Error generating heatmap data:', error);
    }
  };

  return (
    <Container>
      <Sidebar>
        <Title>Input Parameters</Title>
        <InputForm
          inputs={inputs}
          onInputChange={handleInputChange}
          onReset={handleReset}
          isLoading={isLoading}
        />
      </Sidebar>
      
      <MainContent>
        <ResultsGrid>
          <ResultsDisplay
            results={results}
            greeks={greeks}
            isLoading={isLoading}
          />
        </ResultsGrid>
        
        <HeatmapDisplay
          heatmapData={heatmapData}
          isLoading={isLoading}
        />
      </MainContent>
    </Container>
  );
};

export default BlackScholesCalculator;

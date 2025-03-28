import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import styled from 'styled-components';
import OptionsWatchlist from './components/options-watchlist/OptionsWatchlist';
import BlackScholesCalculator from './components/black-scholes/BlackScholesCalculator';
import './App.css';

const Nav = styled.nav`
  background-color: #2a5298;
  color: white;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const NavLinks = styled.div`
  display: flex;
  gap: 2rem;
  align-items: center;
`;

const StyledLink = styled(Link)`
  color: white;
  text-decoration: none;
  font-weight: bold;
  font-size: 1.1rem;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.3s;

  &:hover {
    background-color: #3a62a7;
  }

  &.active {
    background-color: #4a72b7;
  }
`;

const MainContent = styled.main`
  padding: 2rem;
  min-height: calc(100vh - 60px);
  background-color: #f5f5f5;
  color: #333;
`;




function App() {
  return (
    <div className="App">
      <Nav>
        <h1>Options Area</h1>
        <NavLinks>
          <StyledLink to="/">Black-Scholes Calculator</StyledLink>
          <StyledLink to="/watchlist">Options Watchlist</StyledLink>
        </NavLinks>
      </Nav>
      <MainContent>
        <Routes>
          <Route path="/" element={<BlackScholesCalculator />} />
          <Route path="/watchlist" element={<OptionsWatchlist />} />
        </Routes>
      </MainContent>
    </div>
  );
}

export default App;

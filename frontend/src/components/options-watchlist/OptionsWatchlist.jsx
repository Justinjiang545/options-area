import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { optionsApi } from '../../services/api';
import TickerSearch from './TickerSearch';
import OptionsParameters from './OptionsParameters';
import OptionsChain from './OptionsChain';
import Watchlist from './Watchlist';
import { toast } from 'react-toastify';
import { FaTimes } from 'react-icons/fa';

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const Title = styled.h1`
  margin-bottom: 1.5rem;
  color: #333;
`;

const DialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const DialogContent = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`;

const DialogHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const DialogTitle = styled.h3`
  margin: 0;
  color: #333;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  color: #666;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #333;
  }
`;

const DialogActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  margin-top: 1rem;
  cursor: pointer;
`;

const CheckboxInput = styled.input`
  margin-right: 0.5rem;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
`;

const CancelButton = styled(Button)`
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  color: #333;

  &:hover {
    background-color: #e0e0e0;
  }
`;

const ConfirmButton = styled(Button)`
  background-color: #4a90e2;
  border: 1px solid #3a80d2;
  color: white;

  &:hover {
    background-color: #3a80d2;
  }
`;

const OptionsWatchlist = () => {
  const [ticker, setTicker] = useState('');
  const [expirations, setExpirations] = useState([]);
  const [selectedExpiration, setSelectedExpiration] = useState('');
  const [optionType, setOptionType] = useState('Call');
  const [strikePrice, setStrikePrice] = useState(0);
  const [numStrikesRange, setNumStrikesRange] = useState(3);
  const [optionsChain, setOptionsChain] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [disableDuplicateWarning, setDisableDuplicateWarning] = useState(false);
  const [pendingContract, setPendingContract] = useState(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [showStrikeFilter, setShowStrikeFilter] = useState(false);
  const [isUpdatingWatchlist, setIsUpdatingWatchlist] = useState(false);

  useEffect(() => {
    const storedWatchlist = localStorage.getItem('optionsWatchlist');
    if (storedWatchlist) {
      try {
        const parsedData = JSON.parse(storedWatchlist);

        const itemsData = Array.isArray(parsedData) ? parsedData : parsedData.items || [];

        setWatchlist(itemsData);

        if (parsedData.lastUpdated) {
          const lastUpdateTime = new Date(parsedData.lastUpdated);
          const currentTime = new Date();
          const hoursSinceUpdate = (currentTime - lastUpdateTime) / (1000 * 60 * 60);

          if (hoursSinceUpdate > 12 && itemsData.length > 0) {
            toast.info('Your watchlist data is over 12 hours old. Consider updating prices.');
          }
        }
      } catch (error) {
        console.error('Error parsing watchlist:', error);
        localStorage.setItem('optionsWatchlist', JSON.stringify({
          items: [],
          totalPnL: 0,
          lastUpdated: new Date().toISOString()
        }));
      }
    }

    const disableWarning = localStorage.getItem('disableDuplicateWarning');
    if (disableWarning === 'true') {
      setDisableDuplicateWarning(true);
    }
  }, []);

  useEffect(() => {

    if (watchlist.length > 0) {

    }
  }, [watchlist.length]);

  useEffect(() => {
    if (ticker) {
      fetchExpirations();
    } else {
      setOptionsChain([]);
    }
  }, [ticker]);

  useEffect(() => {
    if (ticker && selectedExpiration && optionType) {
      fetchOptionsChain();
    }
  }, [ticker, selectedExpiration, optionType, strikePrice, numStrikesRange]);

  const fetchExpirations = async () => {
    if (!ticker) return;

    try {
      setIsLoading(true);
      setOptionsChain([]);
      const data = await optionsApi.getExpirations(ticker);
      if (data && data.length > 0) {
        setExpirations(data);
        const currentExpirationIsValid = selectedExpiration &&
          data.some(exp => exp.value === selectedExpiration);

        if (!selectedExpiration || !currentExpirationIsValid) {
          setSelectedExpiration(data[0].value);
          return data[0].value;
        }
      } else {
        setExpirations([]);
        setSelectedExpiration('');
        setOptionsChain([]);
      }
    } catch (error) {
      console.error('Error fetching expirations:', error);
      setExpirations([]);
      setSelectedExpiration('');
      setOptionsChain([]);
    } finally {
      if (!selectedExpiration) {
        setIsLoading(false);
      }
    }
    return null;
  };

  const fetchOptionsChain = async (expiration = selectedExpiration) => {
    if (!ticker || !expiration || !optionType) return;

    try {
      setIsLoading(true);
      const data = await optionsApi.getOptionsChain(
        ticker,
        expiration,
        optionType,
        strikePrice,
        numStrikesRange
      );
      setOptionsChain(data);
    } catch (error) {
      console.error('Error fetching options chain:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTickerChange = (newTicker) => {
    if (newTicker === ticker) {
      return;
    }

    setTicker(newTicker);
    setOptionsChain([]);
    setExpirations([]);
    setSelectedExpiration('');
  };

  const handleExpirationChange = (expiration) => {
    if (expiration !== selectedExpiration) {
      setSelectedExpiration(expiration);
    }
  };

  const handleOptionTypeChange = (type) => {
    setOptionType(type);
  };

  const handleStrikeFilterChange = (strike, range) => {
    setStrikePrice(strike);
    setNumStrikesRange(range);
  };

  const isDuplicateContract = (contract) => {
    return watchlist.some(item => item.contractSymbol === contract.contractSymbol);
  };

  const handleDuplicateWarningResponse = (shouldAdd) => {
    if (shouldAdd && pendingContract) {
      addContractToWatchlist(pendingContract);
      toast.success('Contract added to watchlist');
    }

    if (dontShowAgain) {
      setDisableDuplicateWarning(true);
      localStorage.setItem('disableDuplicateWarning', 'true');
    }

    setShowDuplicateWarning(false);
    setPendingContract(null);
    setDontShowAgain(false);
  };

  const addToWatchlist = (contract) => {
    if (isDuplicateContract(contract) && !disableDuplicateWarning) {
      setPendingContract(contract);
      setShowDuplicateWarning(true);
      return;
    }

    addContractToWatchlist(contract);
  };

  const addContractToWatchlist = (contract) => {

    const midpointPrice = contract.bid > 0 && contract.ask > 0 ?
      Math.floor((contract.bid + contract.ask) * 100 / 2) / 100 :
      (contract.lastPrice || 0);

    const newItem = {
      ...contract,
      selectedPrice: midpointPrice,
      currentPrice: midpointPrice,
      lastPrice: contract.lastPrice || 0,
      bid: contract.bid || 0,
      ask: contract.ask || 0,
      addedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    if (newItem.currentPrice && newItem.selectedPrice > 0) {
      const pnlUsd = (newItem.currentPrice - newItem.selectedPrice) * 100;
      const pnlPct = ((newItem.currentPrice - newItem.selectedPrice) / newItem.selectedPrice * 100);
      newItem.PNL_USD = pnlUsd;
      newItem.PNL_PCT = pnlPct;
    } else {
      newItem.PNL_USD = 0;
      newItem.PNL_PCT = 0;
    }

    const newWatchlist = [...watchlist, newItem];

    const totalPnL = newWatchlist.reduce((total, item) => total + (item.PNL_USD || 0), 0);

    setWatchlist(newWatchlist);
    localStorage.setItem('optionsWatchlist', JSON.stringify({
      items: newWatchlist,
      totalPnL: totalPnL,
      lastUpdated: new Date().toISOString()
    }));
  };

  const removeFromWatchlist = (index) => {
    const updatedWatchlist = [...watchlist];
    updatedWatchlist.splice(index, 1);

    const totalPnL = updatedWatchlist.reduce((total, item) => total + (item.PNL_USD || 0), 0);

    setWatchlist(updatedWatchlist);
    localStorage.setItem('optionsWatchlist', JSON.stringify({
      items: updatedWatchlist,
      totalPnL: totalPnL,
      lastUpdated: new Date().toISOString()
    }));
  };

  const clearWatchlist = () => {
    setWatchlist([]);
    localStorage.setItem('optionsWatchlist', JSON.stringify({
      items: [],
      totalPnL: 0,
      lastUpdated: new Date().toISOString()
    }));
    toast.success('Watchlist cleared successfully');
    setShowClearConfirmation(false);
  };

  const handleClearWatchlist = () => {
    if (watchlist.length === 0) {
      toast.info('Watchlist is already empty');
      return;
    }
    setShowClearConfirmation(true);
  };

  const updateWatchlistPrices = async () => {
    if (!watchlist.length) return;

    setIsUpdatingWatchlist(true);

    try {
      const updatedWatchlist = await Promise.all(watchlist.map(async (item) => {
        try {
          const response = await optionsApi.getCurrentPrice(item.contractSymbol);

          const newBid = response.bid || item.bid || 0;
          const newAsk = response.ask || item.ask || 0;
          const newMidpoint = newBid > 0 && newAsk > 0 ?
            Math.floor((newBid + newAsk) * 100 / 2) / 100 :
            response.lastPrice || item.currentPrice || 0;

          const newChange = response.change || 0;
          const newPercentChange = response.percentChange || 0;

          const entryPrice = item.selectedPrice || 0;
          const pnlUsd = (newMidpoint - entryPrice) * 100;
          const pnlPct = entryPrice > 0 ? ((newMidpoint - entryPrice) / entryPrice * 100) : 0;

          return {
            ...item,
            currentPrice: newMidpoint,
            bid: newBid,
            ask: newAsk,
            lastPrice: response.lastPrice || item.lastPrice || 0,
            change: newChange,
            percentChange: newPercentChange,
            PNL_USD: pnlUsd,
            PNL_PCT: pnlPct,
            lastUpdated: new Date().toISOString()
          };
        } catch (error) {
          console.error('Error updating price for', item.contractSymbol, error);
          return item;
        }
      }));

      const totalPnL = updatedWatchlist.reduce((total, item) => total + (item.PNL_USD || 0), 0);

      setWatchlist(updatedWatchlist);
      localStorage.setItem('optionsWatchlist', JSON.stringify({
        items: updatedWatchlist,
        totalPnL: totalPnL,
        lastUpdated: new Date().toISOString()
      }));

      toast.success('Watchlist prices updated successfully');
    } catch (error) {
      console.error('Error updating watchlist prices:', error);
      toast.error('Failed to update some prices. Please try again.');
    } finally {
      setIsUpdatingWatchlist(false);
    }
  };

  return (
    <Container>
      <Title>Options Watchlist</Title>

      <TickerSearch onTickerChange={handleTickerChange} />

      {ticker && (
        <OptionsParameters
          expirations={expirations}
          selectedExpiration={selectedExpiration}
          optionType={optionType}
          strikePrice={strikePrice}
          numStrikesRange={numStrikesRange}
          onExpirationChange={handleExpirationChange}
          onOptionTypeChange={handleOptionTypeChange}
          onStrikeFilterChange={handleStrikeFilterChange}
          isLoading={isLoading}
          showStrikeFilter={showStrikeFilter}
          toggleStrikeFilter={() => setShowStrikeFilter(!showStrikeFilter)}
          disableDuplicateWarning={disableDuplicateWarning}
          onToggleDuplicateWarning={() => {
            const newValue = !disableDuplicateWarning;
            setDisableDuplicateWarning(newValue);
            localStorage.setItem('disableDuplicateWarning', newValue.toString());
          }}
        />
      )}

      {ticker && selectedExpiration && (
        <OptionsChain
          options={optionsChain}
          onAddToWatchlist={addToWatchlist}
          isLoading={isLoading}
        />
      )}

      {showDuplicateWarning && pendingContract && (
        <DialogOverlay>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Duplicate Contract</DialogTitle>
              <CloseButton onClick={() => handleDuplicateWarningResponse(false)}>
                <FaTimes />
              </CloseButton>
            </DialogHeader>

            <p>This contract is already in your watchlist:</p>
            <p><strong>{pendingContract.contractSymbol}</strong></p>
            <p>Are you sure you want to add it again?</p>

            <CheckboxContainer onClick={() => setDontShowAgain(!dontShowAgain)}>
              <CheckboxInput
                type="checkbox"
                checked={dontShowAgain}
                onChange={() => setDontShowAgain(!dontShowAgain)}
              />
              Don't show this warning again
            </CheckboxContainer>

            <DialogActions>
              <CancelButton onClick={() => handleDuplicateWarningResponse(false)}>
                Cancel
              </CancelButton>
              <ConfirmButton onClick={() => handleDuplicateWarningResponse(true)}>
                Add Anyway
              </ConfirmButton>
            </DialogActions>
          </DialogContent>
        </DialogOverlay>
      )}

      <Watchlist
        watchlist={watchlist}
        onRemoveItem={removeFromWatchlist}
        onClearWatchlist={handleClearWatchlist}
        onWatchlistUpdate={(updatedItems, totalPnL) => {

          setWatchlist(updatedItems);
          localStorage.setItem('optionsWatchlist', JSON.stringify({
            items: updatedItems,
            totalPnL: totalPnL,
            lastUpdated: new Date().toISOString()
          }));
        }}
        isLoading={isUpdatingWatchlist}
      />

      {showClearConfirmation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            width: '400px',
            maxWidth: '90%'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#333' }}>Clear Watchlist</h3>
            <p style={{ marginBottom: '1.5rem', color: '#555' }}>
              Are you sure you want to remove all {watchlist.length} contract{watchlist.length !== 1 ? 's' : ''} from your watchlist? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button
                onClick={() => setShowClearConfirmation(false)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #ddd',
                  backgroundColor: 'white',
                  color: '#333',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Cancel
              </button>
              <button
                onClick={clearWatchlist}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  backgroundColor: '#f6465d',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

export default OptionsWatchlist;

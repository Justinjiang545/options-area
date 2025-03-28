import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { optionsApi } from '../../services/api';
import { toast } from 'react-toastify';

const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

const SkeletonCell = styled.div`
  height: 24px;
  background: linear-gradient(to right, #f6f7f8 8%, #edeef1 18%, #f6f7f8 33%);
  background-size: 2000px 100%;
  animation: ${shimmer} 2s infinite linear;
  border-radius: 4px;
  width: ${props => props.width || '100%'};
  margin: ${props => props.margin || '0'};
`;

const WatchlistContainer = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const WatchlistHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  
  > div {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
`;

const TotalPnL = styled.div`
  font-weight: bold;
  color: ${props => props.profit ? '#0ecb81' : '#f6465d'};
  font-size: 0.9rem;
`;

const UpdateAllButton = styled.button`
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: #357ABD;
  }
  
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const WatchlistTitle = styled.h2`
  font-size: 1.25rem;
  color: #333;
  margin: 0;
`;

const ClearButton = styled.button`
  background-color: #f6465d;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: #e63c53;
  }
`;

const EmptyMessage = styled.p`
  color: #888;
  font-style: italic;
  text-align: center;
  padding: 2rem 0;
`;

const WatchlistTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 0.75rem;
  background-color: #f5f5f5;
  border-bottom: 2px solid #e0e0e0;
  position: sticky;
  top: 0;
  cursor: pointer;
  user-select: none;
  
  &:hover {
    background-color: #e0e0e0;
  }
  
  white-space: nowrap;
  
  position: relative;
`;

const TableRow = styled.tr`
  &:hover {
    background-color: #f9f9f9;
  }
`;

const TableCell = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid #e0e0e0;
  ${({ highlight }) => highlight && `font-weight: bold;`}
  ${({ small }) => small && `
    font-size: 0.75rem;
    color: #888;
  `}

  .profit {
    color: #0ecb81;
  }

  .loss {
    color: #f6465d;
  }
`;

const RemoveButton = styled.button`
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  background-color: #f6465d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: #e63c53;
  }
`;

const RefreshButton = styled.button`
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-right: 0.5rem;
  
  &:hover {
    background-color: #357ABD;
  }
  
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const formatNumber = (value, type) => {
  if (value === null || value === undefined) return '-';
  
  const formatWithColor = (text, value) => {
    const color = value > 0 ? '#0ecb81' : value < 0 ? '#f6465d' : 'inherit';
    return `<span style="color: ${color}">${text}</span>`;
  };

  switch (type) {
    case 'currency':
    case 'pnl': {
      const formatted = value === 0 ? '$0.00' : value > 0 ? `+$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`;
      return formatWithColor(formatted, value);
    }
    case 'percent': {
      const formatted = value === 0 ? '0.00%' : `${value > 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
      return formatWithColor(formatted, value);
    }
    case 'price':
      return `$${value.toFixed(2)}`;
    default:
      return value.toFixed(2);
  }
};

const formatContractName = (contract) => {
  if (!contract) return '';
  
  const { ticker, strike, optionType, expiration } = contract;
  
  let expirationFormatted = expiration;
  try {
    if (expiration && expiration.includes('-')) {
      const dateParts = expiration.split('-');
      const month = parseInt(dateParts[1], 10);
      const day = parseInt(dateParts[2], 10);
      expirationFormatted = `${month}/${day}`;
    }
  } catch (error) {
    console.error('Error formatting expiration date:', error);
  }
  
  return `${ticker} $${strike} ${optionType} ${expirationFormatted}`;
};

const Watchlist = ({ watchlist, onRemoveItem, onClearWatchlist, onWatchlistUpdate, isLoading }) => {
  const [localWatchlist, setLocalWatchlist] = useState(watchlist);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'neutral' });
  const [totalPnL, setTotalPnL] = useState({ usd: 0, percent: 0 });
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);
  
  useEffect(() => {
    if (watchlist.length > 0) {
      const sortedByPrice = [...watchlist].sort((a, b) => a.currentPrice - b.currentPrice);
      const midpointIndex = Math.floor(sortedByPrice.length / 2);
      const midpointContract = sortedByPrice[midpointIndex];
      
      const updatedWatchlist = watchlist.map(item => {
        if (item.contractSymbol === midpointContract.contractSymbol) {
          return {
            ...item,
            lastUpdated: formatDateTime(new Date())
          };
        }
        return item;
      });
      
      setLocalWatchlist(updatedWatchlist);
      calculateTotalPnL(updatedWatchlist);
    } else {
      setLocalWatchlist(watchlist);
      calculateTotalPnL(watchlist);
    }
  }, [watchlist]);
  
  const calculateTotalPnL = (items) => {
    if (!items || items.length === 0) {
      setTotalPnL({ usd: 0, percent: 0 });
      return;
    }
    
    const totalUsd = items.reduce((sum, item) => {
      return sum + (item.PNL_USD || 0);
    }, 0);
    
    const totalInvestment = items.reduce((sum, item) => {
      return sum + (item.selectedPrice || 0) * 100;
    }, 0);
    
    const avgPercent = totalInvestment > 0 ? (totalUsd / totalInvestment) * 100 : 0;
    
    setTotalPnL({ 
      usd: totalUsd, 
      percent: avgPercent 
    });
  };
  
  const sortedWatchlist = React.useMemo(() => {
    let sortableItems = [...localWatchlist];
    if (sortConfig.key && sortConfig.direction !== 'neutral') {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [localWatchlist, sortConfig]);
  
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'neutral') {
        direction = 'ascending';
      } else if (sortConfig.direction === 'ascending') {
        direction = 'descending';
      } else {
        direction = 'neutral';
      }
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key) => {
    if (sortConfig.key !== key || sortConfig.direction === 'neutral') {
      return <FaSort style={{ opacity: 0.3 }} />;
    }
    return sortConfig.direction === 'ascending' ? <FaSortUp /> : <FaSortDown />;
  };
  
  const recalculatePnL = (item) => {
    if (item.currentPrice && item.selectedPrice) {
      const pnlUsd = (item.currentPrice - item.selectedPrice) * 100;
      const pnlPct = (item.currentPrice - item.selectedPrice) / item.selectedPrice * 100;
      return {
        ...item,
        PNL_USD: pnlUsd,
        PNL_PCT: pnlPct
      };
    }
    return item;
  };
  
  const updateCurrentPrice = (index, priceData) => {
    const updatedWatchlist = [...localWatchlist];
    const now = new Date();
    const formattedDateTime = now.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    }) + ' - ' + now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(' ', '');
    
    // Calculate midpoint price (rounded down to 2 decimal places)
    const bid = priceData.bid || updatedWatchlist[index].bid || 0;
    const ask = priceData.ask || updatedWatchlist[index].ask || 0;
    const midpointPrice = bid > 0 && ask > 0 ? 
      Math.floor((bid + ask) * 100 / 2) / 100 : 
      priceData.lastPrice || updatedWatchlist[index].lastPrice || 0;
    
    updatedWatchlist[index] = {
      ...updatedWatchlist[index],
      currentPrice: midpointPrice, // Use midpoint as current price
      lastPrice: priceData.lastPrice || updatedWatchlist[index].lastPrice || 0,
      bid: bid,
      ask: ask,
      change: priceData.change || 0,
      percentChange: priceData.percentChange || 0,
      isLoading: false,
      lastUpdated: formattedDateTime
    };
    updatedWatchlist[index] = recalculatePnL(updatedWatchlist[index]);
    setLocalWatchlist(updatedWatchlist);
    
    // Calculate total P&L and save to localStorage
    const totalPnL = calculateTotalPnL(updatedWatchlist);
    
    // Save updated watchlist to localStorage including all updated values
    if (onWatchlistUpdate) {
      onWatchlistUpdate(updatedWatchlist, totalPnL);
    }
  };
  
  const handlePriceUpdate = async (index) => {
    try {
      const currentItem = localWatchlist[index];
      
      const updatedWatchlist = [...localWatchlist];
      updatedWatchlist[index] = {
        ...updatedWatchlist[index],
        isLoading: true
      };
      setLocalWatchlist(updatedWatchlist);
      
      const response = await optionsApi.getCurrentPrice(currentItem.contractSymbol);
      if (!response || !response.currentPrice) {
        throw new Error('Invalid response from API');
      }
      
      const newPrice = response.currentPrice;
      console.log(`Updated price for ${currentItem.contractSymbol}: ${newPrice}, bid: ${response.bid}, ask: ${response.ask}`);
      
      updateCurrentPrice(index, response);
    } catch (error) {
      console.error('Error updating price:', error);
      const updatedWatchlist = [...localWatchlist];
      updatedWatchlist[index] = {
        ...updatedWatchlist[index],
        isLoading: false
      };
      setLocalWatchlist(updatedWatchlist);
      
      toast.error('Failed to update price. Please try again later.');
    }
  };
  
  const handleUpdateAll = async () => {
    if (localWatchlist.length === 0) {
      toast.info('No items in watchlist to update');
      return;
    }
    
    setIsUpdatingAll(true);
    
    const loadingWatchlist = localWatchlist.map(item => ({
      ...item,
      isLoading: true
    }));
    setLocalWatchlist(loadingWatchlist);
    
    let successCount = 0;
    let failureCount = 0;
    
    try {
      let updatedWatchlistCopy = [...loadingWatchlist];
      
      const updateResults = await Promise.all(
        loadingWatchlist.map(async (item, index) => {
          try {
            const response = await optionsApi.getCurrentPrice(item.contractSymbol);
            if (!response || !response.currentPrice) {
              throw new Error('Invalid response from API');
            }
            
            const newPrice = response.currentPrice;
            console.log(`Updated price for ${item.contractSymbol}: ${newPrice}, bid: ${response.bid}, ask: ${response.ask}`);
            
            const now = new Date();
            const formattedDateTime = now.toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric'
            }) + ' - ' + now.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }).replace(' ', '');
            
            // Calculate midpoint price (rounded down to 2 decimal places)
            const bid = response.bid || item.bid || 0;
            const ask = response.ask || item.ask || 0;
            const midpointPrice = bid > 0 && ask > 0 ? 
              Math.floor((bid + ask) * 100 / 2) / 100 : 
              response.lastPrice || item.lastPrice || 0;
            
            const updatedItem = {
              ...item,
              currentPrice: midpointPrice, // Use midpoint as current price
              lastPrice: response.lastPrice || item.lastPrice || 0,
              bid: bid,
              ask: ask,
              change: response.change || 0,
              percentChange: response.percentChange || 0,
              isLoading: false,
              lastUpdated: formattedDateTime
            };
            
            successCount++;
            return recalculatePnL(updatedItem);
          } catch (error) {
            console.error(`Error updating ${item.contractSymbol}:`, error);
            failureCount++;
            return {
              ...item,
              isLoading: false
            };
          }
        })
      );
      
      setLocalWatchlist(updateResults);
      
      // Calculate total P&L and save to localStorage
      const totalPnL = calculateTotalPnL(updateResults);
      
      // Save the full updated state to localStorage
      if (onWatchlistUpdate) {
        onWatchlistUpdate(updateResults, totalPnL);
      }
    } catch (error) {
      console.error('Error in update all process:', error);
      setLocalWatchlist(localWatchlist.map(item => ({
        ...item,
        isLoading: false
      })));
    } finally {
      setIsUpdatingAll(false);
      
      if (successCount > 0) {
        toast.success(`Successfully updated ${successCount} item(s)`);
      }
      if (failureCount > 0) {
        toast.error(`Failed to update ${failureCount} item(s)`);
      }
    }
    
    setIsUpdatingAll(false);
    
    calculateTotalPnL(localWatchlist);
    
    if (failureCount === 0 && successCount > 0) {
      toast.success(`Successfully updated all ${successCount} items`);
    } else if (successCount > 0 && failureCount > 0) {
      toast.warning(`Updated ${successCount} items, ${failureCount} failed`);
    } else if (failureCount > 0 && successCount === 0) {
      toast.error(`Failed to update all ${failureCount} items`);
    }
  };
  
  const formatDateTime = (date) => {
    const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const timeOptions = { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    
    const formattedDate = date.toLocaleDateString('en-US', dateOptions).replace(/\//g, '-');
    const formattedTime = date.toLocaleTimeString('en-US', timeOptions);
    return `${formattedDate} - ${formattedTime}`;
  };
  
  if (localWatchlist.length === 0) {
    return (
      <WatchlistContainer>
        <WatchlistHeader>
          <WatchlistTitle>Watchlist</WatchlistTitle>
        </WatchlistHeader>
        <EmptyMessage>Your watchlist is empty. Add options to track them here.</EmptyMessage>
      </WatchlistContainer>
    );
  }
  
  return (
    <WatchlistContainer>
      <WatchlistHeader>
        <div>
          <WatchlistTitle>Watchlist</WatchlistTitle>
          <TotalPnL profit={totalPnL.usd >= 0}>
            Total P&L: <span dangerouslySetInnerHTML={{ __html: `${formatNumber(totalPnL.usd, 'currency')} (${formatNumber(totalPnL.percent, 'percent')})` }} />
          </TotalPnL>
        </div>
        <div>
          <UpdateAllButton 
            onClick={handleUpdateAll} 
            disabled={isUpdatingAll || localWatchlist.length === 0}
          >
            {isUpdatingAll ? 'Updating All...' : 'Update All'}
          </UpdateAllButton>
          <ClearButton onClick={onClearWatchlist}>Clear Watchlist</ClearButton>
        </div>
      </WatchlistHeader>
      
      <WatchlistTable>
        <thead>
          <tr>
            <TableHeader onClick={() => requestSort('contractSymbol')}>
              Contract {getSortIcon('contractSymbol')}
            </TableHeader>
            <TableHeader onClick={() => requestSort('strike')}>
              Strike {getSortIcon('strike')}
            </TableHeader>
            <TableHeader onClick={() => requestSort('selectedPrice')}>
              Entry Price {getSortIcon('selectedPrice')}
            </TableHeader>
            <TableHeader onClick={() => requestSort('currentPrice')}>
              Current Price {getSortIcon('currentPrice')}
            </TableHeader>
            <TableHeader onClick={() => requestSort('PNL_USD')}>
              P&L $ {getSortIcon('PNL_USD')}
            </TableHeader>
            <TableHeader onClick={() => requestSort('PNL_PCT')}>
              P&L % {getSortIcon('PNL_PCT')}
            </TableHeader>
            <TableHeader onClick={() => requestSort('expiration')}>
              Expiration {getSortIcon('expiration')}
            </TableHeader>
            <TableHeader onClick={() => requestSort('lastUpdated')}>
              Last Updated {getSortIcon('lastUpdated')}
            </TableHeader>
            <TableHeader>
              Actions
            </TableHeader>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`skeleton-${index}`}>
                <TableCell><SkeletonCell width="150px" /></TableCell>
                <TableCell><SkeletonCell width="80px" /></TableCell>
                <TableCell><SkeletonCell width="80px" /></TableCell>
                <TableCell><SkeletonCell width="80px" /></TableCell>
                <TableCell><SkeletonCell width="80px" /></TableCell>
                <TableCell><SkeletonCell width="80px" /></TableCell>
                <TableCell><SkeletonCell width="120px" /></TableCell>
              </TableRow>
            ))
          ) : (
            sortedWatchlist.map((item, index) => (
            <TableRow key={index}>
              <TableCell highlight>{formatContractName(item)}</TableCell>
              <TableCell>{formatNumber(item.strike, 'price')}</TableCell>
              <TableCell>{formatNumber(item.selectedPrice, 'price')}</TableCell>
              <TableCell>{formatNumber(item.currentPrice, 'price')}</TableCell>
              <TableCell>
                <span dangerouslySetInnerHTML={{ __html: formatNumber(item.PNL_USD, 'pnl') }} />
              </TableCell>
              <TableCell>
                <span dangerouslySetInnerHTML={{ __html: formatNumber(item.PNL_PCT, 'percent') }} />
              </TableCell>
              <TableCell>{item.expiration}</TableCell>
              <TableCell small>{typeof item.lastUpdated === 'string' && (item.lastUpdated.includes('T') || !item.lastUpdated.includes('-')) ? new Date(item.lastUpdated).toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
              }) + ' - ' + new Date(item.lastUpdated).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              }).replace(' ', '') : item.lastUpdated || 'Not updated'}</TableCell>
              <TableCell>
                <ButtonGroup>
                  <RefreshButton 
                    onClick={() => handlePriceUpdate(index)}
                    disabled={item.isLoading}
                  >
                    {item.isLoading ? 'Loading...' : 'Update'}
                  </RefreshButton>
                  <RemoveButton onClick={() => onRemoveItem(watchlist.findIndex(w => w.contractSymbol === item.contractSymbol))}>
                    Remove
                  </RemoveButton>
                </ButtonGroup>
              </TableCell>
            </TableRow>
          )))}
        </tbody>
      </WatchlistTable>
    </WatchlistContainer>
  );
};

export default Watchlist;

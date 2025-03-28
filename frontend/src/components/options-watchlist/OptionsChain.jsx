import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { FaSort, FaSortUp, FaSortDown, FaChevronDown, FaChevronUp } from 'react-icons/fa';

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
`;

const TabsContainer = styled.div`
  margin: 1rem 0;
`;

const TabList = styled.div`
  display: flex;
  gap: 1rem;
  border-bottom: 2px solid #e0e0e0;
  margin-bottom: 1rem;
`;

const Tab = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  background: none;
  color: ${props => props.active ? '#4a90e2' : '#666'};
  font-weight: ${props => props.active ? 'bold' : 'normal'};
  border-bottom: 2px solid ${props => props.active ? '#4a90e2' : 'transparent'};
  margin-bottom: -2px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    color: #4a90e2;
  }
`;

const ChainContainer = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  overflow-x: auto;
`;

const ChainHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  cursor: pointer;
`;

const ChainTitle = styled.h2`
  font-size: 1.25rem;
  color: #333;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const OptionsTable = styled.table`
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
  ${({ inTheMoney }) => inTheMoney && `
    background-color: rgba(74, 144, 226, 0.05);
    &:hover {
      background-color: rgba(74, 144, 226, 0.1);
    }
  `}
`;

const TableCell = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid #e0e0e0;
  ${({ highlight }) => highlight && `font-weight: bold;`}
  ${({ profit }) => profit && `color: #0ecb81;`}
  ${({ loss }) => loss && `color: #f6465d;`}
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
`;

const PageButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: ${props => props.active ? '#4a90e2' : 'white'};
  color: ${props => props.active ? 'white' : '#4a90e2'};
  border: 1px solid #4a90e2;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background-color: ${props => props.active ? '#4a90e2' : '#e8f1fa'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  font-size: 0.9rem;
  color: #666;
`;

const AddButton = styled.button`
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #357ABD;
  }
`;

const NumberFormatted = ({ value, type }) => {
  if (value === null || value === undefined) return '-';

  if (type === 'percent') {
    return `${(value * 100).toFixed(2)}%`;
  } else if (type === 'price') {
    return `$${value.toFixed(2)}`;
  } else if (type === 'number') {
    return value.toLocaleString();
  }

  return value;
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

const OptionsChain = ({ options, onAddToWatchlist, isLoading }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'strike', direction: 'neutral' });
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState(0);
  const contractsPerPage = 10;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

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
    return sortConfig.direction === 'ascending' ? <FaSortDown /> : <FaSortUp />;
  };

  const tabRanges = React.useMemo(() => {
    if (!options || !options.length) return [];
    const numTabs = Math.ceil(options.length / (contractsPerPage * 3));
    return Array.from({ length: numTabs }, (_, i) => ({
      start: i * contractsPerPage * 3,
      end: Math.min((i + 1) * contractsPerPage * 3, options.length),
      label: `Page ${i + 1}`
    }));
  }, [options, contractsPerPage]);

  const sortedOptions = React.useMemo(() => {
    if (!options || options.length === 0) return [];

    let sortableItems = options.map(option => ({
      ...option,
      midPrice: option.bid > 0 && option.ask > 0 ?
        Math.floor((option.bid + option.ask) * 100 / 2) / 100 :
        option.lastPrice
    }));
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
  }, [options, sortConfig.key, sortConfig.direction]);

  useEffect(() => {
    setIsExpanded(true);
    setCurrentPage(1);
    setActiveTab(0);
  }, [options]);

  if (!isLoading && (!options || options.length === 0)) {
    return (
      <ChainContainer style={{ textAlign: 'center', padding: '2rem' }}>
        <h3>No options data available for this ticker.</h3>
        <p>Try another ticker or check if the ticker is valid.</p>
      </ChainContainer>
    );
  }

  if (isLoading) {
    return (
      <ChainContainer>
        <ChainHeader>
          <ChainTitle>Loading Options Data</ChainTitle>
        </ChainHeader>
        <div style={{ padding: '1rem' }}>
          {}
          <OptionsTable>
            <thead>
              <tr>
                {['Contract', 'Strike', 'Last', 'Bid', 'Mid', 'Ask', '% Change', 'Volume', 'Action'].map(header => (
                  <TableHeader key={header}>{header}</TableHeader>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array(10).fill().map((_, idx) => (
                <TableRow key={idx}>
                  {Array(9).fill().map((_, cellIdx) => (
                    <TableCell key={cellIdx}>
                      <SkeletonCell width={cellIdx === 0 ? '150px' : '60px'} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </tbody>
          </OptionsTable>
        </div>
      </ChainContainer>
    );
  }

  return (
    <ChainContainer>
      <ChainHeader onClick={() => setIsExpanded(!isExpanded)}>
        <ChainTitle>
          Options Chain {isExpanded ? <FaChevronDown /> : <FaChevronUp />}
        </ChainTitle>
      </ChainHeader>

      {isExpanded && (
        <TabsContainer>
          <TabList>
            {tabRanges.map((range, index) => (
              <Tab
                key={index}
                active={activeTab === index}
                onClick={() => {
                  setActiveTab(index);
                  setCurrentPage(1);
                }}
              >
                Contracts {range.label}
              </Tab>
            ))}
          </TabList>
        </TabsContainer>
      )}

      {isExpanded && <OptionsTable>
        <thead>
          <tr>
            <TableHeader onClick={() => requestSort('contractSymbol')}>
              Contract {getSortIcon('contractSymbol')}
            </TableHeader>
            <TableHeader onClick={() => requestSort('strike')}>
              Strike {getSortIcon('strike')}
            </TableHeader>
            <TableHeader onClick={() => requestSort('lastPrice')}>
              Last {getSortIcon('lastPrice')}
            </TableHeader>
            <TableHeader onClick={() => requestSort('bid')}>
              Bid {getSortIcon('bid')}
            </TableHeader>
            <TableHeader onClick={() => requestSort('midPrice')}>
              Mid {getSortIcon('midPrice')}
            </TableHeader>
            <TableHeader onClick={() => requestSort('ask')}>
              Ask {getSortIcon('ask')}
            </TableHeader>
            <TableHeader onClick={() => requestSort('percentChange')}>
              % Change {getSortIcon('percentChange')}
            </TableHeader>
            <TableHeader onClick={() => requestSort('volume')}>
              Volume {getSortIcon('volume')}
            </TableHeader>
            <TableHeader onClick={() => requestSort('openInterest')}>
              Open Interest {getSortIcon('openInterest')}
            </TableHeader>
            <TableHeader onClick={() => requestSort('impliedVolatility')}>
              IV {getSortIcon('impliedVolatility')}
            </TableHeader>
            <TableHeader>
              Actions
            </TableHeader>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 10 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell><SkeletonCell width="150px" /></TableCell>
                <TableCell><SkeletonCell width="80px" /></TableCell>
                <TableCell><SkeletonCell width="80px" /></TableCell>
                <TableCell><SkeletonCell width="80px" /></TableCell>
                <TableCell><SkeletonCell width="80px" /></TableCell>
                <TableCell><SkeletonCell width="80px" /></TableCell>
                <TableCell><SkeletonCell width="80px" /></TableCell>
                <TableCell><SkeletonCell width="80px" /></TableCell>
                <TableCell><SkeletonCell width="80px" /></TableCell>
                <TableCell><SkeletonCell width="80px" /></TableCell>
                <TableCell><SkeletonCell width="120px" /></TableCell>
              </TableRow>
            ))
          ) : (
            sortedOptions
              .slice(tabRanges[activeTab]?.start || 0, tabRanges[activeTab]?.end || 0)
              .slice((currentPage - 1) * contractsPerPage, currentPage * contractsPerPage)
              .map((option, index) => (
            <TableRow key={index} inTheMoney={option.inTheMoney}>
              <TableCell highlight>{formatContractName(option)}</TableCell>
              <TableCell>{NumberFormatted({ value: option.strike, type: 'price' })}</TableCell>
              <TableCell>{NumberFormatted({ value: option.lastPrice, type: 'price' })}</TableCell>
              <TableCell>{NumberFormatted({ value: option.bid, type: 'price' })}</TableCell>
              <TableCell>{NumberFormatted({ value: option.midPrice, type: 'price' })}</TableCell>
              <TableCell>{NumberFormatted({ value: option.ask, type: 'price' })}</TableCell>
              <TableCell>
                <span style={{ color: option.percentChange > 0 ? '#0ecb81' : option.percentChange < 0 ? '#f6465d' : 'inherit' }}>
                  {NumberFormatted({ value: option.percentChange, type: 'percent' })}
                </span>
              </TableCell>
              <TableCell>{NumberFormatted({ value: option.volume, type: 'number' })}</TableCell>
              <TableCell>{NumberFormatted({ value: option.openInterest, type: 'number' })}</TableCell>
              <TableCell>{NumberFormatted({ value: option.impliedVolatility, type: 'percent' })}</TableCell>
              <TableCell>
                <AddButton
                  onClick={() => onAddToWatchlist(option)}
                >
                  Add to Watchlist
                </AddButton>
              </TableCell>
            </TableRow>
          )))}
        </tbody>
      </OptionsTable>}

      {isExpanded && options.length > contractsPerPage && (
        <PaginationContainer>
          <PageButton
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </PageButton>

          <PageInfo>
            Page {currentPage} of {Math.ceil(options.length / contractsPerPage)}
            ({(currentPage - 1) * contractsPerPage + 1}-
            {Math.min(currentPage * contractsPerPage, options.length)} of {options.length})
          </PageInfo>

          <PageButton
            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(options.length / contractsPerPage), prev + 1))}
            disabled={currentPage === Math.ceil(options.length / contractsPerPage)}
          >
            Next
          </PageButton>
        </PaginationContainer>
      )}
    </ChainContainer>
  );
};

export default OptionsChain;

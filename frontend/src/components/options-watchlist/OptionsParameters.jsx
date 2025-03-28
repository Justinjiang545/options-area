import React, { useState } from 'react';
import styled from 'styled-components';

const ParametersCard = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const CardTitle = styled.h2`
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
  color: #333;
`;

const ParametersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
`;

const ParameterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 500;
  margin-bottom: 0.25rem;
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  }
`;

const NumberInput = styled.input`
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  }
`;

const FilterButton = styled.button`
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-top: auto;

  &:hover {
    background-color: #357ABD;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.4);
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const StrikeFilterContainer = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
`;

const RangeInput = styled.input`
  width: 100%;
  margin-top: 0.5rem;
`;

const OptionsParameters = ({
  expirations,
  selectedExpiration,
  optionType,
  strikePrice,
  numStrikesRange,
  onExpirationChange,
  onOptionTypeChange,
  onStrikeFilterChange,
  isLoading,
  showStrikeFilter,
  toggleStrikeFilter,
  disableDuplicateWarning,
  onToggleDuplicateWarning
}) => {
  const [localStrikePrice, setLocalStrikePrice] = useState(strikePrice);
  const [localRange, setLocalRange] = useState(numStrikesRange);

  const handleApplyFilter = () => {
    onStrikeFilterChange(localStrikePrice, localRange);
  };

  return (
    <ParametersCard>
      <CardTitle>Options Parameters</CardTitle>

      <ParametersGrid>
        <ParameterGroup>
          <Label htmlFor="expiration">Expiration Date</Label>
          <Select
            id="expiration"
            value={selectedExpiration}
            onChange={(e) => onExpirationChange(e.target.value)}
            disabled={isLoading || expirations.length === 0}
          >
            {expirations.map((exp) => (
              <option key={exp.value} value={exp.value}>{exp.label}</option>
            ))}
          </Select>
        </ParameterGroup>

        <ParameterGroup>
          <Label htmlFor="optionType">Option Type</Label>
          <Select
            id="optionType"
            value={optionType}
            onChange={(e) => onOptionTypeChange(e.target.value)}
            disabled={isLoading}
          >
            <option value="Call">Call</option>
            <option value="Put">Put</option>
          </Select>
        </ParameterGroup>

        <ParameterGroup>
          <FilterButton
            type="button"
            onClick={toggleStrikeFilter}
            disabled={isLoading}
          >
            {showStrikeFilter ? 'Hide Strike Filter' : 'Show Strike Filter'}
          </FilterButton>
        </ParameterGroup>
      </ParametersGrid>

      {showStrikeFilter && (
        <StrikeFilterContainer>
          <ParametersGrid>
            <ParameterGroup>
              <Label htmlFor="strikePrice">Desired Strike Price</Label>
              <NumberInput
                id="strikePrice"
                type="number"
                min="0"
                step="1"
                value={localStrikePrice}
                onChange={(e) => setLocalStrikePrice(parseFloat(e.target.value) || 0)}
                disabled={isLoading}
              />
            </ParameterGroup>

            <ParameterGroup>
              <Label htmlFor="strikesRange">
                Number of strikes up/down: {localRange}
              </Label>
              <RangeInput
                id="strikesRange"
                type="range"
                min="1"
                max="20"
                value={localRange}
                onChange={(e) => setLocalRange(parseInt(e.target.value) || 3)}
                disabled={isLoading}
              />
            </ParameterGroup>

            <ParameterGroup>
              <FilterButton
                type="button"
                onClick={handleApplyFilter}
                disabled={isLoading || localStrikePrice <= 0}
              >
                Apply Strike Filter
              </FilterButton>
            </ParameterGroup>
          </ParametersGrid>

          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              id="disableDuplicateWarning"
              checked={disableDuplicateWarning}
              onChange={onToggleDuplicateWarning}
              style={{ marginRight: '0.5rem' }}
            />
            <label htmlFor="disableDuplicateWarning">
              Disable duplicate contract warnings
            </label>
          </div>
        </StrikeFilterContainer>
      )}
    </ParametersCard>
  );
};

export default OptionsParameters;

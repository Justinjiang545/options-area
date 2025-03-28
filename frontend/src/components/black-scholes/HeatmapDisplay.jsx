import React from 'react';
import styled from 'styled-components';

const HeatmapContainer = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 0.5rem;
  margin-top: 0.5rem;
  width: 100%;
  max-width: 1000px;
  margin-left: auto;
  margin-right: auto;
  overflow-x: hidden;
`;

const HeatmapTitle = styled.h2`
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
  color: #333;
`;

const HeatmapsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  width: 100%;
  
  @media (max-width: 750px) {
    grid-template-columns: 1fr;
  }
`;

const HeatmapWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
`;

const HeatmapGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(${props => props.cols}, minmax(22px, 1fr));
  gap: 1px;
  background-color: #ddd;
  padding: 1px;
  width: 100%;
  max-width: 380px;
  margin: 0 auto;
`;

const Cell = styled.div`
  aspect-ratio: 1;
  background-color: ${props => props.color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  color: ${props => props.textColor};
  transition: all 0.2s;
  cursor: pointer;
  padding: 1px;
  
  &:hover {
    transform: scale(1.1);
    z-index: 1;
  }
`;

const AxisLabel = styled.div`
  font-size: 0.65rem;
  color: #666;
  margin: ${props => props.margin};
  text-align: right;
  min-width: 2rem;
  line-height: 1.2rem;
  height: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

const Legend = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.5rem;
  gap: 0.25rem;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.15rem;
  font-size: 0.65rem;
`;

const LegendColor = styled.div`
  width: 20px;
  height: 10px;
  background-color: ${props => props.color};
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #666;
  font-style: italic;
`;

const getColorForValue = (value, min, max) => {
  const ratio = (value - min) / (max - min);
  const hue = ((1 - ratio) * 240).toFixed(0); 
  return `hsl(${hue}, 70%, 50%)`;
};

const getTextColor = (backgroundColor) => {
  if (!backgroundColor || typeof backgroundColor !== 'string') {
    return '#000'; 
  }
  
  const match = backgroundColor.match(/hsl\((\d+)/);
  if (!match || !match[1]) {
    return '#000'; 
  }
  
  const hue = parseInt(match[1]);
  return hue > 120 ? '#000' : '#fff';
};

const HeatmapDisplay = ({ heatmapData, isLoading }) => {
  if (isLoading) {
    return (
      <HeatmapContainer>
        <HeatmapTitle>Price Heatmaps</HeatmapTitle>
        <LoadingMessage>Generating heatmaps...</LoadingMessage>
      </HeatmapContainer>
    );
  }
  
  if (!heatmapData) {
    return null;
  }
  
  const renderHeatmap = (data, title) => {
    const flatData = data.flat();
    const min = Math.min(...flatData);
    const max = Math.max(...flatData);
    
    return (
      <HeatmapWrapper>
        <h3>{title}</h3>
        <AxisLabel margin="0 0 0.5rem 0">
          Volatility (σ)
        </AxisLabel>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {heatmapData.sigma_range.map((sigma, i) => (
              <AxisLabel 
                key={i} 
                margin="0 0.5rem"
                style={{ 
                  height: `${100 / heatmapData.sigma_range.length}%`,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {sigma.toFixed(2)}
              </AxisLabel>
            ))}
          </div>
          <HeatmapGrid cols={heatmapData.S_range.length}>
            {data.map((row, i) => 
              row.map((value, j) => {
                const color = getColorForValue(value, min, max);
                const textColor = getTextColor(color);
                return (
                  <Cell 
                    key={`${i}-${j}`} 
                    color={color}
                    textColor={textColor}
                    title={`Stock Price: $${heatmapData.S_range[j].toFixed(2)}\nVolatility: ${heatmapData.sigma_range[i].toFixed(2)}\nPrice: $${value.toFixed(2)}`}
                  >
                    {value.toFixed(1)}
                  </Cell>
                );
              })
            ).reverse()}
          </HeatmapGrid>
        </div>
        <AxisLabel margin="0.5rem 0 0 0">
          Stock Price ($)
        </AxisLabel>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(${heatmapData.S_range.length}, 1fr)`,
          width: '100%', 
          maxWidth: '380px', 
          margin: '0 auto'
        }}>
          {heatmapData.S_range.map((price, i) => (
            <AxisLabel 
              key={i}
              style={{
                textAlign: 'center',
                justifyContent: 'center',
                margin: '0'
              }}
            >
              {price.toFixed(0)}
            </AxisLabel>
          ))}
        </div>
        <Legend>
          <LegendItem>
            <LegendColor color="hsl(240, 70%, 50%)" />
            <span>${min.toFixed(2)}</span>
          </LegendItem>
          <LegendItem>
            <LegendColor color="hsl(120, 70%, 50%)" />
            <span>${((max + min) / 2).toFixed(2)}</span>
          </LegendItem>
          <LegendItem>
            <LegendColor color="hsl(0, 70%, 50%)" />
            <span>${max.toFixed(2)}</span>
          </LegendItem>
        </Legend>
      </HeatmapWrapper>
    );
  };
  
  return (
    <HeatmapContainer>
      <HeatmapTitle>Price Heatmaps</HeatmapTitle>
      <HeatmapsGrid>
        {renderHeatmap(heatmapData.call_heatmap, 'Call Option Prices')}
        {renderHeatmap(heatmapData.put_heatmap, 'Put Option Prices')}
      </HeatmapsGrid>
    </HeatmapContainer>
  );
};

export default HeatmapDisplay;

import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import Chart from 'chart.js/auto';

const ChartContainer = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-top: 1.5rem;
`;

const ChartTitle = styled.h2`
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: #333;
`;

const ChartWrapper = styled.div`
  height: 400px;
  position: relative;
`;

const NoDataMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #666;
  font-style: italic;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #666;
  font-style: italic;
`;

const SensitivityChart = ({ data, variable, optionType, isLoading }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const getVariableDisplayName = (variableName) => {
    const displayNames = {
      'stock_price': 'Stock Price',
      'strike_price': 'Strike Price',
      'time_to_expiry': 'Time to Expiry',
      'risk_free_rate': 'Risk-Free Rate',
      'volatility': 'Volatility'
    };
    
    return displayNames[variableName] || variableName;
  };

  useEffect(() => {
    if (isLoading || !data || !data.data || data.data.length === 0) {
      return;
    }

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');

    const xValues = data.data.map(item => item.value);
    const yValues = data.data.map(item => item.price);

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: xValues,
        datasets: [
          {
            label: `${optionType.toUpperCase()} Option Price`,
            data: yValues,
            borderColor: '#4a90e2',
            backgroundColor: 'rgba(74, 144, 226, 0.1)',
            fill: true,
            tension: 0.4,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `Price: $${context.parsed.y.toFixed(2)}`;
              },
              title: function(tooltipItems) {
                const item = tooltipItems[0];
                return `${getVariableDisplayName(variable)}: ${item.label}`;
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: getVariableDisplayName(variable),
              font: {
                size: 14,
                weight: 'bold'
              }
            },
            grid: {
              display: false
            }
          },
          y: {
            title: {
              display: true,
              text: 'Option Price ($)',
              font: {
                size: 14,
                weight: 'bold'
              }
            },
            beginAtZero: true
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, variable, optionType, isLoading]);

  if (isLoading) {
    return (
      <ChartContainer>
        <ChartTitle>Sensitivity Analysis</ChartTitle>
        <LoadingMessage>Generating chart data...</LoadingMessage>
      </ChartContainer>
    );
  }

  if (!data || !data.data || data.data.length === 0) {
    return (
      <ChartContainer>
        <ChartTitle>Sensitivity Analysis</ChartTitle>
        <NoDataMessage>No sensitivity data available</NoDataMessage>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer>
      <ChartTitle>
        {`Sensitivity to ${getVariableDisplayName(variable)}`}
      </ChartTitle>
      <ChartWrapper>
        <canvas ref={chartRef} />
      </ChartWrapper>
    </ChartContainer>
  );
};

export default SensitivityChart;

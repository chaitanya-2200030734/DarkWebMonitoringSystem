import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SeverityChartProps {
  data: {
    high: number;
    medium: number;
    low: number;
  };
}

const SeverityChart: React.FC<SeverityChartProps> = ({ data }) => {
  const chartData = [
    { name: 'High Risk', value: data.high, color: '#ff4757' },
    { name: 'Medium Risk', value: data.medium, color: '#ffa726' },
    { name: 'Low Risk', value: data.low, color: '#00ff9d' }
  ].filter(item => item.value > 0);

  return (
    <div className="cyberpunk-card p-6">
      <h3 className="text-lg font-semibold cyberpunk-neon mb-4 flex items-center">
        <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
        Threat Severity Distribution
      </h3>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
              isAnimationActive={true}
              animationDuration={1200}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#2c5364', 
                border: '1px solid #00fff7', 
                borderRadius: '12px',
                color: '#00fff7',
                fontWeight: 600
              }}
            />
            <Legend 
              wrapperStyle={{ color: '#00fff7', fontWeight: 600 }}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-400">
          No threat data available
        </div>
      )}
    </div>
  );
};

export default SeverityChart;
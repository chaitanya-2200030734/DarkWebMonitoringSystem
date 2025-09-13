import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TimelineChartProps {
  data: Array<{
    date: string;
    threats: number;
  }>;
}

const TimelineChart: React.FC<TimelineChartProps> = ({ data }) => {
  return (
    <div className="cyberpunk-card p-6">
      <h3 className="text-lg font-semibold cyberpunk-neon-alt mb-4 flex items-center">
        <div className="w-3 h-3 bg-purple-400 rounded-full mr-2"></div>
        Threat Timeline (Last 7 Days)
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ff00cc" />
          <XAxis 
            dataKey="date" 
            stroke="#00fff7"
            fontSize={14}
          />
          <YAxis stroke="#ff00cc" fontSize={14} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#2c5364', 
              border: '1px solid #ff00cc', 
              borderRadius: '12px',
              color: '#ff00cc',
              fontWeight: 600
            }}
            labelFormatter={(value) => `Date: ${value}`}
          />
          <Line 
            type="monotone" 
            dataKey="threats" 
            stroke="#ff00cc" 
            strokeWidth={4}
            dot={{ fill: '#00fff7', strokeWidth: 2, r: 5 }}
            activeDot={{ r: 8, stroke: '#ff00cc', strokeWidth: 3 }}
            isAnimationActive={true}
            animationDuration={1200}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TimelineChart;
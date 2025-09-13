import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CategoryChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

const CategoryChart: React.FC<CategoryChartProps> = ({ data }) => {
  const topCategories = data.slice(0, 6);

  return (
    <div className="cyberpunk-card p-6">
      <h3 className="text-lg font-semibold cyberpunk-neon mb-4 flex items-center">
        <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
        Threat Categories
      </h3>
      {topCategories.length > 0 ? (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={topCategories} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="name" 
              stroke="#00fff7"
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={14}
            />
            <YAxis stroke="#ff00cc" fontSize={14} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#2c5364', 
                border: '1px solid #00fff7', 
                borderRadius: '12px',
                color: '#00fff7',
                fontWeight: 600
              }}
            />
            <Bar 
              dataKey="value" 
              fill="url(#categoryGradient)"
              radius={[8, 8, 0, 0]}
              isAnimationActive={true}
              animationDuration={1200}
              background={false}
            />
            <defs>
              <linearGradient id="categoryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00fff7" stopOpacity={0.9}/>
                <stop offset="95%" stopColor="#ff00cc" stopOpacity={0.7}/>
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-400">
          No category data available
        </div>
      )}
    </div>
  );
};

export default CategoryChart;
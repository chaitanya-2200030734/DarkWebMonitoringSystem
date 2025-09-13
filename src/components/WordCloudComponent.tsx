import React from 'react';

interface WordCloudComponentProps {
  words: Array<{
    text: string;
    value: number;
  }>;
}

const WordCloudComponent: React.FC<WordCloudComponentProps> = ({ words }) => {
  const maxValue = Math.max(...words.map(w => w.value));
  
  const getFontSize = (value: number) => {
    const ratio = value / maxValue;
    return Math.max(12, Math.min(32, 12 + ratio * 20));
  };

  const getColor = (value: number) => {
    const ratio = value / maxValue;
    if (ratio > 0.7) return '#ff4757'; // High frequency - red
    if (ratio > 0.4) return '#ffa726'; // Medium frequency - orange
    return '#00ff9d'; // Low frequency - green
  };

  return (
    <div className="cyber-card p-6 rounded-lg lg:col-span-2">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
        Threat Keywords Cloud
      </h3>
      
      <div className="h-64 flex flex-wrap items-center justify-center gap-2 overflow-hidden">
        {words.length > 0 ? (
          words.map((word, index) => (
            <span
              key={index}
              className="font-semibold hover:scale-110 transition-transform cursor-pointer"
              style={{
                fontSize: `${getFontSize(word.value)}px`,
                color: getColor(word.value),
                textShadow: `0 0 10px ${getColor(word.value)}50`
              }}
              title={`Frequency: ${word.value}`}
            >
              {word.text}
            </span>
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            No keywords available
          </div>
        )}
      </div>
    </div>
  );
};

export default WordCloudComponent;
import React, { useEffect, useRef } from 'react';

const MatrixRain: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const characters = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const columns = Math.floor(window.innerWidth / 20);
    
    const createColumn = (index: number) => {
      const column = document.createElement('div');
      column.className = 'matrix-column';
      column.style.left = `${index * 20}px`;
      column.style.animationDuration = `${Math.random() * 3 + 2}s`;
      column.style.animationDelay = `${Math.random() * 2}s`;
      
      let text = '';
      const length = Math.floor(Math.random() * 20) + 10;
      for (let i = 0; i < length; i++) {
        text += characters[Math.floor(Math.random() * characters.length)] + '\n';
      }
      column.textContent = text;
      
      return column;
    };

    // Create initial columns
    for (let i = 0; i < columns; i++) {
      container.appendChild(createColumn(i));
    }

    // Recreate columns periodically
    const interval = setInterval(() => {
      const existingColumns = container.querySelectorAll('.matrix-column');
      existingColumns.forEach((col, index) => {
        if (Math.random() < 0.1) { // 10% chance to recreate
          container.removeChild(col);
          container.appendChild(createColumn(index));
        }
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      container.innerHTML = '';
    };
  }, []);

  return <div ref={containerRef} className="matrix-rain" />;
};

export default MatrixRain;
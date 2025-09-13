import React from 'react';
import { Shield, Activity, Search, Brain, Terminal, Zap } from 'lucide-react';

const LoadingSpinner: React.FC = () => {
  const stages = [
    { icon: Terminal, text: '> INITIALIZING THREAT SCANNER...', delay: 0 },
    { icon: Search, text: '> PARSING DATA STRUCTURES...', delay: 800 },
    { icon: Brain, text: '> NEURAL NETWORK PROCESSING...', delay: 1600 },
    { icon: Zap, text: '> ANALYZING THREAT VECTORS...', delay: 2400 },
    { icon: Shield, text: '> COMPILING SECURITY REPORT...', delay: 3200 }
  ];

  return (
    <div className="min-h-screen hacker-bg hacker-grid flex items-center justify-center relative">
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      <div className="terminal-border p-12 rounded-xl text-center max-w-lg mx-auto slide-up relative z-10">
        <div className="hacker-spinner mx-auto mb-8"></div>
        
        <h2 className="text-2xl font-bold terminal-text mb-8 font-mono glitch" data-text="[ANALYZING DATA PACKAGE]">
          [ANALYZING DATA PACKAGE]
        </h2>
        
        <div className="space-y-4 mb-8">
          {stages.map((stage, index) => (
            <div
              key={index}
              className="flex items-center justify-start space-x-3 text-green-400 font-mono text-sm"
              style={{
                animation: `fadeIn 0.5s ease-in-out ${stage.delay}ms both`
              }}
            >
              <stage.icon className="w-4 h-4 text-green-500 animate-pulse" />
              <span>{stage.text}</span>
            </div>
          ))}
        </div>

        <div className="p-4 bg-black bg-opacity-50 rounded-lg border border-green-500 border-opacity-30">
          <p className="text-xs text-green-500 font-mono">
            [CLASSIFIED] ADVANCED OSINT PROTOCOLS ACTIVE
          </p>
          <div className="mt-2 flex justify-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
import React from 'react';
import { Loader2, Globe, Search, Database, CheckCircle } from 'lucide-react';

type Phase = 'crawling' | 'analyzing' | 'intelligence' | 'complete';

interface UrlScanPhaseIndicatorProps {
  currentPhase: Phase;
  phaseTimings?: {
    crawl?: number;
    analysis?: number;
    intelligence?: number;
  };
}

const UrlScanPhaseIndicator: React.FC<UrlScanPhaseIndicatorProps> = ({ 
  currentPhase, 
  phaseTimings 
}) => {
  const phases = [
    {
      id: 'crawling' as Phase,
      label: 'Crawling',
      icon: Globe,
      description: 'Fetching page content',
      duration: phaseTimings?.crawl
    },
    {
      id: 'analyzing' as Phase,
      label: 'Analysis',
      icon: Search,
      description: 'Analyzing threats',
      duration: phaseTimings?.analysis
    },
    {
      id: 'intelligence' as Phase,
      label: 'Intelligence Correlation',
      icon: Database,
      description: 'Correlating threat intelligence',
      duration: phaseTimings?.intelligence
    }
  ];

  const getPhaseStatus = (phaseId: Phase) => {
    const phaseIndex = phases.findIndex(p => p.id === phaseId);
    const currentIndex = phases.findIndex(p => p.id === currentPhase);
    
    if (phaseIndex < currentIndex) return 'complete';
    if (phaseIndex === currentIndex) return 'active';
    return 'pending';
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="w-full p-6 bg-black bg-opacity-80 rounded-xl border border-green-500">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-green-400 font-mono">Analysis Progress</h3>
        {currentPhase === 'complete' && (
          <div className="flex items-center text-green-400">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="font-mono text-sm">Complete</span>
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        {phases.map((phase, index) => {
          const status = getPhaseStatus(phase.id);
          const Icon = phase.icon;
          
          return (
            <div
              key={phase.id}
              className={`flex items-center p-4 rounded-lg border transition-all ${
                status === 'complete'
                  ? 'border-green-500 bg-green-500 bg-opacity-10'
                  : status === 'active'
                  ? 'border-yellow-500 bg-yellow-500 bg-opacity-10'
                  : 'border-gray-600 bg-gray-800 bg-opacity-50'
              }`}
            >
              <div className="flex-shrink-0 mr-4">
                {status === 'active' ? (
                  <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
                ) : status === 'complete' ? (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                ) : (
                  <Icon className="w-6 h-6 text-gray-500" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h4
                      className={`font-mono font-bold ${
                        status === 'complete'
                          ? 'text-green-400'
                          : status === 'active'
                          ? 'text-yellow-400'
                          : 'text-gray-500'
                      }`}
                    >
                      {phase.label}
                    </h4>
                    <p className="text-sm text-green-300 font-mono mt-1">
                      {phase.description}
                    </p>
                  </div>
                  
                  {status === 'complete' && phase.duration && (
                    <span className="text-xs text-green-400 font-mono ml-4">
                      {formatDuration(phase.duration)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UrlScanPhaseIndicator;


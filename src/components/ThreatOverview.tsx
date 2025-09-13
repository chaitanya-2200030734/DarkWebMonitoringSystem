import React from 'react';
import { AnalysisResult } from '../types/analysis';
import { Shield, AlertTriangle, Activity, Clock, Zap } from 'lucide-react';

interface ThreatOverviewProps {
  result: AnalysisResult;
}

const ThreatOverview: React.FC<ThreatOverviewProps> = ({ result }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High': return 'threat-critical border-red-500';
      case 'Medium': return 'threat-medium border-yellow-500';
      case 'Low': return 'threat-low border-green-500';
      default: return 'text-green-400 bg-green-500/10 border-green-500/30';
    }
  };

  return (
    <div className="grid md:grid-cols-4 gap-6 mb-8 fade-in">
      <div className="hacker-card p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <Zap className="w-8 h-8 text-green-400 animate-pulse" />
          <span className="text-2xl font-bold terminal-text font-mono">{result.totalThreats}</span>
        </div>
        <h3 className="text-sm font-medium text-green-400 font-mono">[TOTAL THREATS]</h3>
        <p className="text-xs text-green-500 mt-1 font-mono">INDICATORS DETECTED</p>
      </div>

      <div className={`hacker-card p-6 rounded-lg border-2 ${getSeverityColor(result.overallSeverity)}`}>
        <div className="flex items-center justify-between mb-4">
          <Shield className="w-8 h-8 animate-pulse" />
          <span className="text-2xl font-bold font-mono">{result.overallSeverity}</span>
        </div>
        <h3 className="text-sm font-medium text-green-400 font-mono">[RISK LEVEL]</h3>
        <p className="text-xs text-green-500 mt-1 font-mono">THREAT CLASSIFICATION</p>
      </div>

      <div className="hacker-card p-6 rounded-lg border-2 border-red-500">
        <div className="flex items-center justify-between mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500 animate-pulse" />
          <span className="text-2xl font-bold text-red-500 font-mono">{result.severityBreakdown.high}</span>
        </div>
        <h3 className="text-sm font-medium text-red-400 font-mono">[CRITICAL ALERTS]</h3>
        <p className="text-xs text-red-500 mt-1 font-mono">IMMEDIATE ACTION REQUIRED</p>
      </div>

      <div className="hacker-card p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <Clock className="w-8 h-8 text-green-400 animate-pulse" />
          <span className="text-sm font-bold terminal-text font-mono">
            {new Date(result.analyzedAt).toLocaleString()}
          </span>
        </div>
        <h3 className="text-sm font-medium text-green-400 font-mono">[TIMESTAMP]</h3>
        <p className="text-xs text-green-500 mt-1 font-mono">SCAN COMPLETED</p>
      </div>
    </div>
  );
};

export default ThreatOverview;
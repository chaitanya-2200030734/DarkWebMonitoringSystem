import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, XCircle, Clock, Zap, Search, Database } from 'lucide-react';
import MatrixRain from './MatrixRain';

interface UrlScanResult {
  url: string;
  safetyVerdict: 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS';
  riskScore: number;
  riskLevel: string;
  threatCategories: {
    phishing: boolean;
    malware: boolean;
    scam: boolean;
    suspicious_links: boolean;
    high_risk_script: boolean;
    metadata_alert: boolean;
  };
  keyFindings: string[];
  recommendations: string[];
  phaseTimings: {
    crawl: number;
    analysis: number;
    intelligence: number;
    total: number;
  };
  analyzedAt: string;
  intent?: string;
  isOnion?: boolean;
  darkWebThreats?: {
    credentialHarvesting: boolean;
    financialFraud: boolean;
    illegalMarkets: boolean;
    malwareDistribution: boolean;
    scamIndicators: boolean;
  };
  contentHash?: string;
}

interface UrlScanResultsProps {
  result: UrlScanResult;
  onReset: () => void;
  onShowSettings?: () => void;
}

type Phase = 'crawling' | 'analyzing' | 'intelligence' | 'complete';

const UrlScanResults: React.FC<UrlScanResultsProps> = ({ result, onReset, onShowSettings }) => {
  const [currentPhase, setCurrentPhase] = useState<Phase>('complete');
  const [phaseProgress, setPhaseProgress] = useState(0);

  useEffect(() => {
    // Simulate phase progression for visual feedback
    if (currentPhase !== 'complete') {
      const interval = setInterval(() => {
        setPhaseProgress(prev => {
          if (prev >= 100) {
            if (currentPhase === 'crawling') {
              setCurrentPhase('analyzing');
              return 0;
            } else if (currentPhase === 'analyzing') {
              setCurrentPhase('intelligence');
              return 0;
            } else if (currentPhase === 'intelligence') {
              setCurrentPhase('complete');
              return 100;
            }
            return 100;
          }
          return prev + 10;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [currentPhase]);

  const getVerdictColor = () => {
    switch (result.safetyVerdict) {
      case 'SAFE':
        return 'text-green-400 border-green-400 bg-green-400 bg-opacity-10';
      case 'SUSPICIOUS':
        return 'text-yellow-400 border-yellow-400 bg-yellow-400 bg-opacity-10';
      case 'MALICIOUS':
        return 'text-red-400 border-red-400 bg-red-400 bg-opacity-10';
      default:
        return 'text-gray-400 border-gray-400';
    }
  };

  const getVerdictIcon = () => {
    switch (result.safetyVerdict) {
      case 'SAFE':
        return <CheckCircle className="w-12 h-12 text-green-400" />;
      case 'SUSPICIOUS':
        return <AlertTriangle className="w-12 h-12 text-yellow-400" />;
      case 'MALICIOUS':
        return <XCircle className="w-12 h-12 text-red-400" />;
      default:
        return <Shield className="w-12 h-12 text-gray-400" />;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getRiskColor = (score: number) => {
    if (score >= 20) return 'text-red-400';
    if (score >= 12) return 'text-yellow-400';
    if (score >= 5) return 'text-orange-400';
    return 'text-green-400';
  };

  const getRiskPercentage = (score: number) => {
    // Risk score max is typically around 30-40 based on weights
    return Math.min((score / 30) * 100, 100);
  };

  return (
    <div className="min-h-screen hacker-bg hacker-grid py-8 relative">
      <MatrixRain />
      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 slide-up">
          <div className="flex items-center">
            <button
              onClick={onReset}
              className="mr-4 p-2 text-green-400 hover:text-green-300 transition-colors terminal-border rounded"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold terminal-text font-mono">[URL THREAT ANALYSIS]</h1>
              <p className="text-green-400 font-mono text-sm mt-1 break-all">{result.url}</p>
            </div>
          </div>
          {onShowSettings && (
            <button className="hacker-button px-4 py-2 rounded" onClick={onShowSettings}>
              Settings
            </button>
          )}
        </div>

        {/* Safety Verdict Badge */}
        <div className={`mb-8 p-8 rounded-xl border-2 ${getVerdictColor()} text-center slide-up`}>
          <div className="flex flex-col items-center justify-center">
            {getVerdictIcon()}
            <h2 className="text-4xl font-black font-mono mt-4 mb-2">{result.safetyVerdict}</h2>
            {result.isOnion && (
              <div className="mb-2 px-4 py-2 bg-purple-900 bg-opacity-50 border border-purple-500 rounded">
                <span className="text-purple-300 font-mono text-sm">🌐 DARK WEB (.ONION) SITE</span>
              </div>
            )}
            <p className="text-lg font-mono opacity-80">
              {result.safetyVerdict === 'SAFE' && 'Site appears safe for use'}
              {result.safetyVerdict === 'SUSPICIOUS' && 'Exercise caution when visiting'}
              {result.safetyVerdict === 'MALICIOUS' && 'Do not visit this site'}
            </p>
          </div>
        </div>

        {/* Risk Score Visualization */}
        <div className="mb-8 p-6 bg-black bg-opacity-80 rounded-xl border border-green-500 slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-green-400 font-mono">Risk Score</h3>
            <span className={`text-3xl font-black font-mono ${getRiskColor(result.riskScore)}`}>
              {result.riskScore}
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-6 mb-2">
            <div
              className={`h-6 rounded-full transition-all duration-500 ${
                result.riskScore >= 20
                  ? 'bg-red-500'
                  : result.riskScore >= 12
                  ? 'bg-yellow-500'
                  : result.riskScore >= 5
                  ? 'bg-orange-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${getRiskPercentage(result.riskScore)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-green-400 font-mono">
            <span>Safe (0)</span>
            <span>Low (5)</span>
            <span>Medium (12)</span>
            <span>High (20+)</span>
          </div>
        </div>

        {/* Threat Breakdown */}
        <div className="mb-8 p-6 bg-black bg-opacity-80 rounded-xl border border-green-500 slide-up">
          <h3 className="text-xl font-bold text-green-400 font-mono mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Threat Breakdown
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            {Object.entries(result.threatCategories).map(([category, detected]) => (
              <div
                key={category}
                className={`p-4 rounded border ${
                  detected
                    ? 'border-red-500 bg-red-500 bg-opacity-10'
                    : 'border-green-500 bg-green-500 bg-opacity-10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm capitalize text-green-300">
                    {category.replace(/_/g, ' ')}
                  </span>
                  {detected ? (
                    <XCircle className="w-5 h-5 text-red-400" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Dark Web Specific Threats */}
          {result.isOnion && result.darkWebThreats && (
            <div className="mt-6 pt-6 border-t border-purple-500">
              <h4 className="text-lg font-bold text-purple-400 font-mono mb-4">
                Dark Web Specific Threats
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(result.darkWebThreats).map(([threat, detected]) => (
                  <div
                    key={threat}
                    className={`p-3 rounded border ${
                      detected
                        ? 'border-purple-500 bg-purple-500 bg-opacity-20'
                        : 'border-gray-600 bg-gray-800 bg-opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs capitalize text-purple-300">
                        {threat.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      {detected ? (
                        <AlertTriangle className="w-4 h-4 text-purple-400" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Key Findings */}
        <div className="mb-8 p-6 bg-black bg-opacity-80 rounded-xl border border-green-500 slide-up">
          <h3 className="text-xl font-bold text-green-400 font-mono mb-4 flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Key Findings
          </h3>
          <ul className="space-y-3">
            {result.keyFindings.map((finding, index) => (
              <li key={index} className="flex items-start">
                <span className="text-green-400 font-mono mr-2">•</span>
                <span className="text-green-300 font-mono text-sm">{finding}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actionable Recommendations */}
        <div className="mb-8 p-6 bg-black bg-opacity-80 rounded-xl border border-green-500 slide-up">
          <h3 className="text-xl font-bold text-green-400 font-mono mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Actionable Recommendations
          </h3>
          <ul className="space-y-3">
            {result.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start">
                <span className="text-yellow-400 font-mono mr-2">→</span>
                <span className="text-green-300 font-mono text-sm">{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Analysis Time Transparency */}
        <div className="mb-8 p-6 bg-black bg-opacity-80 rounded-xl border border-green-500 slide-up">
          <h3 className="text-xl font-bold text-green-400 font-mono mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Analysis Performance
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded border border-green-500 bg-green-500 bg-opacity-5">
              <div className="text-xs text-green-400 font-mono mb-1">Crawl Phase</div>
              <div className="text-lg font-bold text-green-300 font-mono">
                {formatDuration(result.phaseTimings.crawl)}
              </div>
            </div>
            <div className="p-4 rounded border border-green-500 bg-green-500 bg-opacity-5">
              <div className="text-xs text-green-400 font-mono mb-1">Analysis Phase</div>
              <div className="text-lg font-bold text-green-300 font-mono">
                {formatDuration(result.phaseTimings.analysis)}
              </div>
            </div>
            <div className="p-4 rounded border border-green-500 bg-green-500 bg-opacity-5">
              <div className="text-xs text-green-400 font-mono mb-1">Intelligence Phase</div>
              <div className="text-lg font-bold text-green-300 font-mono">
                {formatDuration(result.phaseTimings.intelligence)}
              </div>
            </div>
            <div className="p-4 rounded border border-green-500 bg-green-500 bg-opacity-5">
              <div className="text-xs text-green-400 font-mono mb-1">Total Duration</div>
              <div className="text-lg font-bold text-green-300 font-mono">
                {formatDuration(result.phaseTimings.total)}
              </div>
            </div>
          </div>
          <div className="mt-4 text-xs text-green-500 font-mono">
            Analysis completed at: {new Date(result.analyzedAt).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UrlScanResults;


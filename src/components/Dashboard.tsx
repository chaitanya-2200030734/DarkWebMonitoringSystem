import React from 'react';
import { AnalysisResult } from '../types/analysis';
import LoadingSpinner from './LoadingSpinner';
import ThreatOverview from './ThreatOverview';
import CategoryChart from './CategoryChart';
import SeverityChart from './SeverityChart';
import TimelineChart from './TimelineChart';
import WordCloudComponent from './WordCloudComponent';
import InsightsSummary from './InsightsSummary';
import ExportControls from './ExportControls';
import { ArrowLeft, Terminal } from 'lucide-react';
import MatrixRain from './MatrixRain';

interface DashboardProps {
  result: AnalysisResult | null;
  isAnalyzing: boolean;
  onReset: () => void;
  onShowSettings?: () => void;
  layout?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ result, isAnalyzing, onReset, onShowSettings, layout }) => {
  // Use backend's intent and threats fields for display
  const isSafeOrLowRisk = result && (
    result.intent === 'educational' ||
    result.intent === 'safe' ||
    (Array.isArray(result.threats) && result.threats.length === 0) ||
    result.totalThreats === 0
  );
  // New state for advanced search/filter
  const [search, setSearch] = React.useState('');
  const [filterType, setFilterType] = React.useState('all');
  const [filterSeverity, setFilterSeverity] = React.useState('all');
  const [filterDate, setFilterDate] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const [incidentNotes, setIncidentNotes] = React.useState('');
  const [taggedIndicators, setTaggedIndicators] = React.useState<string[]>([]);

  // Gather all indicators from all relevant fields
  const allIndicators = React.useMemo(() => {
    if (!result) return [];
    const text = [result.filename, ...result.insights, ...result.wordCloud.map(w => w.text)].join(' ');
    const ips = text.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g) || [];
    const urls = text.match(/https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+/g) || [];
    const hashes = text.match(/\b[a-fA-F0-9]{32,64}\b/g) || [];
    return [...new Set([...ips, ...urls, ...hashes])];
  }, [result]);

  // Fuzzy search helper
  function fuzzyMatch(str: string, query: string) {
    if (!query) return true;
    const pattern = query.split('').map(c => `.*${c}`).join('');
    return new RegExp(pattern, 'i').test(str);
  }

  // Filtered indicators by type
  const filteredIndicators = React.useMemo(() => {
    let indicators = allIndicators;
    if (filterType !== 'all') {
      indicators = indicators.filter(ind => {
        if (filterType === 'ip') return /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/.test(ind);
        if (filterType === 'url') return /^https?:\/\//.test(ind);
        if (filterType === 'hash') return /\b[a-fA-F0-9]{32,64}\b/.test(ind);
        return true;
      });
    }
    return indicators.filter(ind => fuzzyMatch(ind, search));
  }, [allIndicators, filterType, search]);

  // Filtered insights/threats by severity and date
  const filteredInsights = React.useMemo(() => {
    if (!result) return [];
    let insights = result.insights;
    if (filterSeverity !== 'all') {
      insights = insights.filter(i => i.toLowerCase().includes(filterSeverity));
    }
    if (filterDate) {
      insights = insights.filter(i => i.includes(filterDate));
    }
    return insights.filter(i => fuzzyMatch(i, search));
  }, [result, search, filterSeverity, filterDate]);

  // Gather all indicators

  // Filtered insights/threats
  if (isAnalyzing) {
    return <LoadingSpinner />;
  }

  if (!result) {
    return null;
  }

  // If safe/educational, show a clear status and suppress threat indicators
  if (isSafeOrLowRisk) {
    return (
      <div className="min-h-screen hacker-bg hacker-grid py-8 relative">
        <MatrixRain />
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between mb-8 slide-up relative z-10">
            <div className="flex items-center">
              <button
                onClick={onReset}
                className="mr-4 p-2 text-green-400 hover:text-green-300 transition-colors terminal-border rounded"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <div className="flex items-center mb-2">
                  <Terminal className="w-8 h-8 text-green-500 mr-3 animate-pulse" />
                  <h1 className="text-3xl font-bold terminal-text font-mono">[THREAT ANALYSIS DASHBOARD]</h1>
                </div>
                <p className="text-green-400 font-mono">TARGET: {result.filename}</p>
                <div className="flex items-center mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                  <span className="text-green-500 text-sm font-mono">ANALYSIS COMPLETE</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <ExportControls result={result} />
              {onShowSettings && (
                <button className="hacker-button px-4 py-2 rounded" onClick={onShowSettings}>
                  User Settings
                </button>
              )}
            </div>
          </div>
          <div className="bg-black bg-opacity-80 rounded-xl p-8 border border-green-500 shadow-lg text-center mt-8">
            <h2 className="text-3xl font-bold text-green-400 mb-4 font-mono">SAFE / LOW RISK SITE</h2>
            <p className="text-green-300 font-mono text-lg mb-4">No threats detected. This site is recognized as reputable, safe, or educational.</p>
            <p className="text-green-400 font-mono">Intent: <span className="font-bold">{result.intent ? result.intent.charAt(0).toUpperCase() + result.intent.slice(1) : 'Unknown'}</span></p>
            {Array.isArray(result.threats) && result.threats.length === 0 && (
              <p className="text-green-400 font-mono mt-4">No threats detected.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen hacker-bg hacker-grid py-8 relative">
      <MatrixRain />
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 slide-up relative z-10">
          <div className="flex items-center">
            <button
              onClick={onReset}
              className="mr-4 p-2 text-green-400 hover:text-green-300 transition-colors terminal-border rounded"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <div className="flex items-center mb-2">
                <Terminal className="w-8 h-8 text-green-500 mr-3 animate-pulse" />
                <h1 className="text-3xl font-bold terminal-text font-mono">[THREAT ANALYSIS DASHBOARD]</h1>
              </div>
              <p className="text-green-400 font-mono">TARGET: {result.filename}</p>
              <div className="flex items-center mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-green-500 text-sm font-mono">ANALYSIS COMPLETE</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <ExportControls result={result} />
            {onShowSettings && (
              <button className="hacker-button px-4 py-2 rounded" onClick={onShowSettings}>
                User Settings
              </button>
            )}
          </div>
        </div>

        {/* Real-life helpful features */}
        <div className="relative z-10 mb-6">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Fuzzy search threats/indicators..."
              className="px-3 py-2 rounded bg-black border border-green-500 text-green-400 font-mono"
              style={{minWidth:200}}
            />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 rounded bg-black border border-green-500 text-green-400 font-mono"
            >
              <option value="all">All Types</option>
              <option value="ip">IP Address</option>
              <option value="url">URL</option>
              <option value="hash">Hash</option>
            </select>
            <select
              value={filterSeverity}
              onChange={e => setFilterSeverity(e.target.value)}
              className="px-3 py-2 rounded bg-black border border-green-500 text-green-400 font-mono"
            >
              <option value="all">All Severity</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="critical">Critical</option>
              <option value="malicious">Malicious</option>
            </select>
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="px-3 py-2 rounded bg-black border border-green-500 text-green-400 font-mono"
            />
            <button
              className="hacker-button px-4 py-2 rounded"
              onClick={() => {
                navigator.clipboard.writeText(filteredIndicators.join('\n'));
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >Copy Filtered Indicators</button>
            <button
              className="hacker-button px-4 py-2 rounded"
              onClick={() => {
                const blob = new Blob([filteredIndicators.join('\n')], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `filtered_indicators_${result.filename}.txt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >Download Filtered Indicators</button>
            <button
              className="hacker-button px-4 py-2 rounded"
              onClick={() => setTaggedIndicators(filteredIndicators)}
            >Tag All Filtered</button>
            {copied && <span className="text-green-400 font-mono">Copied!</span>}
          </div>
          {/* Tagged indicators and incident notes */}
          {taggedIndicators.length > 0 && (
            <div className="mb-4 p-4 bg-black bg-opacity-70 rounded border border-green-500">
              <h4 className="text-green-400 font-mono mb-2">Tagged Indicators</h4>
              <ul className="text-green-300 font-mono text-sm mb-2">
                {taggedIndicators.map((ind, idx) => (
                  <li key={idx}>{ind}</li>
                ))}
              </ul>
              <textarea
                value={incidentNotes}
                onChange={e => setIncidentNotes(e.target.value)}
                placeholder="Add incident notes or context..."
                className="w-full p-2 rounded bg-black border border-green-500 text-green-400 font-mono mb-2"
                rows={3}
              />
              <button
                className="hacker-button px-4 py-2 rounded"
                onClick={() => {
                  const blob = new Blob([
                    `Tagged Indicators:\n${taggedIndicators.join('\n')}\n\nIncident Notes:\n${incidentNotes}`
                  ], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `incident_notes_${result.filename}.txt`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >Export Incident Notes</button>
            </div>
          )}
        </div>
        {/* Overview Cards */}
        <div className="relative z-10">
          <ThreatOverview result={result} />
        </div>
        {/* Split into two vertical halves */}
        <div className="relative z-10 flex flex-col lg:flex-row gap-8 mb-8">
          {/* Left: Visualizations */}
          <div className="flex-1 flex flex-col gap-8">
            <SeverityChart data={result.severityBreakdown} />
            <CategoryChart data={result.categoryBreakdown} />
            <TimelineChart data={result.timeline} />
          </div>
          {/* Right: Insights, Recommendations, Threat Keywords Cloud */}
          <div className="flex-1 flex flex-col gap-6">
            <InsightsSummary insights={filteredInsights} />
            <WordCloudComponent words={result.wordCloud} />
            <div className="p-4 bg-black bg-opacity-70 rounded-lg border border-green-500">
              <h4 className="text-lg font-bold text-green-400 mb-2 font-mono">Actionable Recommendations</h4>
              <ul className="text-green-300 font-mono space-y-2">
                <li>• Share indicators with your SOC or security team for immediate investigation.</li>
                <li>• Use the export and copy features to integrate with SIEM or threat intelligence platforms.</li>
                <li>• Review critical and malicious insights for urgent response.</li>
                <li>• Schedule regular scans and save reports for compliance.</li>
                <li>• Use search/filter to quickly triage and prioritize threats.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
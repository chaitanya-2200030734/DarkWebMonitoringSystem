import React, { useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import HomePage from './components/HomePage';
import Dashboard from './components/Dashboard';
import { AnalysisResult } from './types/analysis';
import { analyzeThreatIntelligence } from './services/threatIntelligence';

function App() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userPrefs, setUserPrefs] = useState(() => {
    const saved = localStorage.getItem('userPrefs');
    return saved ? JSON.parse(saved) : { theme: 'green', layout: 'default', savedScans: [] };
  });
  // New states for file summary and analysis flow
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [showAnalysis, setShowAnalysis] = useState(false);

  const savePrefs = (prefs: any) => {
    setUserPrefs(prefs);
    localStorage.setItem('userPrefs', JSON.stringify(prefs));
  };

  const saveScan = (result: AnalysisResult) => {
    const updated = { ...userPrefs, savedScans: [...userPrefs.savedScans, result] };
    savePrefs(updated);
  };

  const handleFileUpload = async (file: File) => {
    // On upload, read file and show summary, don't analyze yet
    setUploadedFile(file);
    try {
      const content = await file.text();
      setFileContent(content);
      setShowAnalysis(false);
      setAnalysisResult(null);
    } catch (error) {
      console.error('File read failed:', error);
    }
  };

  const analyzeData = async (content: string, filename: string): Promise<AnalysisResult> => {
    // Enhanced threat analysis with real-world patterns
    const lines = content.split('\n').filter(line => line.trim());
    
    // Extract potential indicators for threat intelligence lookup
    const indicators = extractIndicators(content);
    
    // Get real threat intelligence data
    const threatIntelResults = await analyzeThreatIntelligence(indicators);
    
    const threatKeywords = {
      high: ['malware', 'ransomware', 'exploit', 'vulnerability', 'breach', 'hack', 'stolen', 'credential', 'password', 'backdoor', 'botnet', 'trojan', 'rootkit', 'keylogger', 'zero-day'],
      medium: ['phishing', 'spam', 'suspicious', 'fraud', 'scam', 'fake', 'leak', 'dump', 'darkweb', 'tor', 'bitcoin', 'cryptocurrency', 'illegal', 'drugs', 'weapons'],
      low: ['monitoring', 'alert', 'warning', 'notice', 'scan', 'check', 'analysis', 'report', 'investigation', 'security', 'firewall', 'antivirus']
    };

    const categories = {
      'Financial Fraud': ['credit', 'bank', 'payment', 'card', 'financial', 'money', 'transaction', 'bitcoin', 'wallet', 'cryptocurrency'],
      'Credential Theft': ['password', 'login', 'credential', 'account', 'username', 'email', 'authentication', 'session', 'token'],
      'Malware Distribution': ['virus', 'trojan', 'malware', 'ransomware', 'spyware', 'adware', 'botnet', 'rootkit', 'keylogger'],
      'Data Breaches': ['breach', 'leak', 'dump', 'exposed', 'stolen', 'compromised', 'database', 'personal', 'confidential'],
      'Dark Markets': ['market', 'vendor', 'drugs', 'weapons', 'illegal', 'contraband', 'silk', 'road', 'marketplace'],
      'Cyber Attacks': ['ddos', 'attack', 'exploit', 'vulnerability', 'zero-day', 'penetration', 'injection', 'xss']
    };

    let highCount = 0, mediumCount = 0, lowCount = 0;
    const categoryScores: Record<string, number> = {};
    const wordFreq: Record<string, number> = {};

    // Initialize category scores
    Object.keys(categories).forEach(cat => categoryScores[cat] = 0);

    // Analyze content
    const words = content.toLowerCase().split(/\s+/);
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
      
      if (threatKeywords.high.some(keyword => word.includes(keyword))) {
        highCount++;
      } else if (threatKeywords.medium.some(keyword => word.includes(keyword))) {
        mediumCount++;
      } else if (threatKeywords.low.some(keyword => word.includes(keyword))) {
        lowCount++;
      }

      // Category scoring
      Object.entries(categories).forEach(([category, keywords]) => {
        if (keywords.some(keyword => word.includes(keyword))) {
          categoryScores[category]++;
        }
      });
    });

    // Incorporate threat intelligence results
    threatIntelResults.forEach(result => {
      if (result.isMalicious) {
        if (result.riskScore >= 8) {
          highCount += 2;
        } else if (result.riskScore >= 5) {
          mediumCount += 2;
        } else {
          lowCount += 1;
        }
        
        // Add to categories
        result.categories.forEach(category => {
          const categoryKey = category.charAt(0).toUpperCase() + category.slice(1);
          categoryScores[categoryKey] = (categoryScores[categoryKey] || 0) + result.confidence / 10;
        });
      }
    });

    // Generate timeline data (simulated)
    const dates = Array.from({length: 7}, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        threats: Math.floor(Math.random() * 50) + 10
      };
    }).reverse();

    // Top words for word cloud
    const topWords = Object.entries(wordFreq)
      .filter(([word]) => word.length > 3)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([text, value]) => ({ text, value }));

    const totalThreats = highCount + mediumCount + lowCount;
    const severityScore = totalThreats > 0 ? (highCount * 3 + mediumCount * 2 + lowCount) / (totalThreats * 3) : 0;

    let overallSeverity: 'High' | 'Medium' | 'Low';
    if (severityScore >= 0.7) overallSeverity = 'High';
    else if (severityScore >= 0.4) overallSeverity = 'Medium';
    else overallSeverity = 'Low';

    return {
      filename,
      totalThreats,
      severityBreakdown: {
        high: highCount,
        medium: mediumCount,
        low: lowCount
      },
      overallSeverity,
      categoryBreakdown: Object.entries(categoryScores)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      timeline: dates,
      wordCloud: topWords,
      insights: generateInsights(categoryScores, overallSeverity, totalThreats, threatIntelResults),
      analyzedAt: new Date().toISOString()
    };
  };

  const extractIndicators = (content: string): string[] => {
    const indicators: string[] = [];
    
    // Extract IP addresses
    const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
    const ips = content.match(ipRegex) || [];
    indicators.push(...ips);
    
    // Extract URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = content.match(urlRegex) || [];
    indicators.push(...urls);
    
    // Extract potential hashes (32 or 64 character hex strings)
    const hashRegex = /\b[a-fA-F0-9]{32,64}\b/g;
    const hashes = content.match(hashRegex) || [];
    indicators.push(...hashes);
    
    return [...new Set(indicators)]; // Remove duplicates
  };

  const generateInsights = (categories: Record<string, number>, severity: string, total: number, threatIntel: any[]): string[] => {
    const insights = [];
    
    const maliciousIntel = threatIntel.filter(t => t.isMalicious);
    
    insights.push(`[SCAN COMPLETE] ${total} threat vectors identified | ${maliciousIntel.length} confirmed malicious indicators`);
    
    const topCategory = Object.entries(categories).reduce((a, b) => a[1] > b[1] ? a : b);
    if (topCategory[1] > 0) {
      insights.push(`[PRIMARY THREAT] ${topCategory[0]} - ${topCategory[1]} indicators detected`);
    }
    
    if (severity === 'High') {
      insights.push('[CRITICAL ALERT] High-risk threats detected - Deploy immediate countermeasures');
    } else if (severity === 'Medium') {
      insights.push('[WARNING] Moderate threat activity detected - Escalate monitoring protocols');
    } else {
      insights.push('[STATUS] Minimal threat activity - Maintain standard security protocols');
    }
    
    if (maliciousIntel.length > 0) {
      insights.push(`[THREAT INTEL] ${maliciousIntel.length} indicators confirmed malicious via external threat feeds`);
    }
    
    insights.push('[RECOMMENDATION] Implement real-time threat intelligence integration');
    insights.push('[PROTOCOL] Deploy automated incident response and threat hunting procedures');
    
    return insights;
  };

  const resetAnalysis = () => {
    setAnalysisResult(null);
    setIsAnalyzing(false);
    setUploadedFile(null);
    setFileContent('');
    setShowAnalysis(false);
  };

  return (
    <div className="min-h-screen bg-black">
      <Analytics />
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="cyberpunk-card p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold terminal-text mb-4">User Preferences</h2>
            <div className="mb-4">
              <label className="block mb-2 font-mono text-green-400">Theme</label>
              <select
                value={userPrefs.theme}
                onChange={e => savePrefs({ ...userPrefs, theme: e.target.value })}
                className="w-full p-2 bg-black border border-green-500 rounded text-green-400 font-mono"
              >
                <option value="green">Green/Black</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block mb-2 font-mono text-green-400">Dashboard Layout</label>
              <select
                value={userPrefs.layout}
                onChange={e => savePrefs({ ...userPrefs, layout: e.target.value })}
                className="w-full p-2 bg-black border border-green-500 rounded text-green-400 font-mono"
              >
                <option value="default">Default</option>
                <option value="compact">Compact</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block mb-2 font-mono text-green-400">Saved Scans</label>
              <ul className="text-green-400 font-mono text-sm max-h-32 overflow-y-auto">
                {userPrefs.savedScans.length === 0 && <li>No scans saved yet.</li>}
                {userPrefs.savedScans.map((scan: AnalysisResult, idx: number) => (
                  <li key={idx} className="mb-2">{scan.filename} ({scan.analyzedAt})</li>
                ))}
              </ul>
            </div>
            <button
              className="hacker-button px-6 py-2 rounded mt-2"
              onClick={() => setShowSettings(false)}
            >Close</button>
          </div>
        </div>
      )}
      {/* Main UI: File summary and analysis flow */}
      {!uploadedFile ? (
        <HomePage onFileUpload={handleFileUpload} onShowSettings={() => setShowSettings(true)} />
      ) : !showAnalysis ? (
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-2xl mx-auto bg-black bg-opacity-80 rounded-xl p-8 border border-green-500 shadow-lg">
            <h2 className="text-2xl font-bold text-green-400 mb-4 font-mono">[FILE SUMMARY]</h2>
            <p className="text-green-300 font-mono mb-2">Filename: <span className="font-bold">{uploadedFile.name}</span></p>
            <p className="text-green-300 font-mono mb-2">Size: <span className="font-bold">{(uploadedFile.size/1024).toFixed(2)} KB</span></p>
            <p className="text-green-300 font-mono mb-2">Type: <span className="font-bold">{uploadedFile.type || 'Unknown'}</span></p>
            <div className="mt-4 mb-4">
              <h4 className="text-green-400 font-mono mb-2">Preview:</h4>
              <pre className="bg-black bg-opacity-60 p-4 rounded text-green-200 font-mono text-xs max-h-48 overflow-y-auto border border-green-700">
                {fileContent.slice(0, 1000) || '[No preview available]'}
              </pre>
            </div>
            <div className="mb-4">
              <h4 className="text-green-400 font-mono mb-2">Summary:</h4>
              <p className="text-green-300 font-mono text-sm">
                {fileContent.length > 0
                  ? `This file contains ${fileContent.split('\n').length} lines and ${fileContent.split(/\s+/).length} words. Ready for risk analysis.`
                  : 'No content detected.'}
              </p>
            </div>
            <button
              className="hacker-button px-6 py-3 rounded text-lg font-mono"
              onClick={async () => {
                setIsAnalyzing(true);
                await new Promise(resolve => setTimeout(resolve, 1000));
                const result = await analyzeData(fileContent, uploadedFile.name);
                setAnalysisResult(result);
                saveScan(result);
                setIsAnalyzing(false);
                setShowAnalysis(true);
              }}
              disabled={isAnalyzing}
            >{isAnalyzing ? 'Analyzing...' : 'Analyze Risks'}</button>
            <button
              className="hacker-button px-4 py-2 rounded mt-4 ml-4"
              onClick={resetAnalysis}
            >Cancel</button>
          </div>
        </div>
      ) : (
        <Dashboard 
          result={analysisResult}
          isAnalyzing={isAnalyzing}
          onReset={resetAnalysis}
          onShowSettings={() => setShowSettings(true)}
          layout={userPrefs.layout}
        />
      )}
    </div>
  );
}

export default App;
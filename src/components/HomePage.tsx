import React, { useCallback, useState } from 'react';
import { Shield, Upload, FileText, Database, Activity, Terminal, Zap, Eye } from 'lucide-react';
import MatrixRain from './MatrixRain';

interface HomePageProps {
  onFileUpload: (file: File) => void;
  onShowSettings?: () => void;
  onUrlScan?: (url: string) => void;
  scanError?: string | null;
  isAnalyzing?: boolean;
}

// Removed duplicate declaration
const HomePage: React.FC<HomePageProps> = ({ onFileUpload, onShowSettings, onUrlScan, scanError, isAnalyzing }) => {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const handleUrlScan = async () => {
    setUrlError('');
    if (!url.trim() || !/^https?:\/\//.test(url.trim())) {
      setUrlError('Please enter a valid http(s) URL.');
      return;
    }
    if (onUrlScan) await onUrlScan(url.trim());
  };
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  }, [onFileUpload]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen cyberpunk-animated-bg hacker-grid relative">
      <MatrixRain />
      <div className="container mx-auto px-6 py-12 relative z-10">
        <div className="flex justify-end mb-4">
          {onShowSettings && (
            <button className="hacker-button px-4 py-2 rounded" onClick={onShowSettings}>
              User Settings
            </button>
          )}
        </div>
        {/* Header */}
        <div className="text-center mb-16 slide-up">
          <div className="flex justify-center items-center mb-6">
            <Terminal className="w-16 h-16 cyberpunk-neon-alt mr-4 animate-pulse" />
            <h1 className="text-4xl md:text-6xl font-black cyberpunk-neon font-mono" data-text="DARK WEB MONITORING">
              DARK WEB MONITORING
            </h1>
          </div>
          <p className="text-xl md:text-2xl cyberpunk-neon-alt mb-4 font-semibold subtitle-animate">
            {'>'} OSINT & FORENSIC ANALYSIS SYSTEM
          </p>
          <p className="text-lg max-w-3xl mx-auto font-mono cyberpunk-neon" style={{color:'#00fff7'}}>
            [CLASSIFIED] AI-POWERED THREAT INTELLIGENCE PLATFORM
          </p>
          <div className="mt-4 flex justify-center items-center space-x-4" style={{color:'#00fff7'}}>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse mr-2"></div>
              <span className="text-sm font-mono">SYSTEM ONLINE</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse mr-2"></div>
              <span className="text-sm font-mono">THREAT DB ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16 fade-in">
          <div className="cyberpunk-card p-6 text-center">
            <Eye className="w-12 h-12 cyberpunk-neon mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-semibold cyberpunk-neon mb-2 font-mono">[OSINT] INTELLIGENCE</h3>
            <p className="text-sm font-mono cyberpunk-neon-alt">Real-time threat intelligence gathering</p>
          </div>
          <div className="cyberpunk-card p-6 text-center">
            <Zap className="w-12 h-12 cyberpunk-neon-alt mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-semibold cyberpunk-neon-alt mb-2 font-mono">[AI] THREAT SCAN</h3>
            <p className="text-sm font-mono cyberpunk-neon">Neural network threat classification</p>
          </div>
          <div className="cyberpunk-card p-6 text-center">
            <Shield className="w-12 h-12 cyberpunk-neon mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-semibold cyberpunk-neon mb-2 font-mono">[SECURE] REPORTS</h3>
            <p className="text-sm font-mono cyberpunk-neon-alt">Encrypted forensic documentation</p>
          </div>
        </div>

        {/* Upload/URL Scan Section */}
        <div className="max-w-2xl mx-auto slide-up">
          {/* URL Scan */}
          <div className="mb-8 p-8 bg-black bg-opacity-80 rounded-xl border border-green-500 text-center">
            <h2 className="text-2xl font-bold terminal-text mb-4 font-mono">[SCAN WEB URL]</h2>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="Enter https://... or http://...onion"
              className="px-4 py-2 rounded bg-black border border-green-500 text-green-400 font-mono w-2/3 mb-2"
              disabled={isAnalyzing}
            />
            <button
              className="hacker-button px-6 py-2 rounded ml-4"
              onClick={handleUrlScan}
              disabled={isAnalyzing}
            >{isAnalyzing ? 'Scanning...' : 'Scan URL'}</button>
            {urlError && <div className="text-red-400 mt-2 font-mono">{urlError}</div>}
            {scanError && (
              <div className="text-red-400 mt-2 font-mono p-3 bg-red-900 bg-opacity-30 border border-red-500 rounded">
                <div className="font-bold mb-1">Error:</div>
                <div className="text-sm">{scanError}</div>
                {scanError.includes('Tor') && (
                  <div className="text-xs mt-2 text-yellow-400">
                    💡 Tip: Make sure Tor Browser is running or Tor daemon is active on port 9050/9150
                  </div>
                )}
              </div>
            )}
            <div className="text-green-500 text-xs mt-2 font-mono">
              Supports both surface web and dark web (.onion) URLs. No data is stored.
            </div>
          </div>
          <div
            className={`terminal-border p-12 rounded-xl text-center transition-all duration-500 ${
              dragActive ? 'terminal-glow' : ''
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-16 h-16 text-green-500 mx-auto mb-6 animate-bounce" />
            <h2 className="text-2xl font-bold terminal-text mb-4 font-mono">[UPLOAD] DATA PACKAGE</h2>
            <p className="text-green-300 mb-8 font-mono">
              {'>'} DROP TARGET FILE OR INITIATE BROWSE PROTOCOL
            </p>
            <p className="text-sm text-green-500 mb-8 font-mono">
              SUPPORTED: [.CSV] [.TXT] [.JSON]
            </p>
            
            <label className="inline-block">
              <input
                type="file"
                accept=".csv,.txt,.json"
                onChange={handleFileInput}
                className="hidden"
              />
              <span className="hacker-button py-4 px-8 rounded-lg cursor-pointer inline-block">
                [INITIATE SCAN]
              </span>
            </label>
          </div>

          <div className="mt-8 text-center text-green-500 text-sm font-mono">
            <p>{'> SECURE: LOCAL PROCESSING | ZERO DATA RETENTION'}</p>
            <div className="mt-2 flex justify-center items-center space-x-4">
              <div className="flex items-center">
                <div className="w-1 h-1 bg-green-500 rounded-full mr-1"></div>
                <span className="text-xs">ENCRYPTED</span>
              </div>
              <div className="flex items-center">
                <div className="w-1 h-1 bg-green-500 rounded-full mr-1"></div>
                <span className="text-xs">ANONYMOUS</span>
              </div>
              <div className="flex items-center">
                <div className="w-1 h-1 bg-green-500 rounded-full mr-1"></div>
                <span className="text-xs">SECURE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
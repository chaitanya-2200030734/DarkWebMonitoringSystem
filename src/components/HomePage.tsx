import React, { useCallback, useState } from 'react';
import { Shield, Upload, FileText, Database, Activity, Terminal, Zap, Eye } from 'lucide-react';
import MatrixRain from './MatrixRain';

interface HomePageProps {
  onFileUpload: (file: File) => void;
  onShowSettings?: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onFileUpload, onShowSettings }) => {
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

        {/* Upload Section */}
        <div className="max-w-2xl mx-auto slide-up">
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
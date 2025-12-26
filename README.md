# 🌐 Dark Web Threat Detector

> **Educational Purpose Only** - Advanced threat analysis platform for monitoring dark web (.onion) sites and surface web URLs with comprehensive security scanning.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)

## 🎯 Overview

A production-ready web application that scans and analyzes URLs (including dark web `.onion` sites) for security threats, phishing attempts, malware, scams, and other cybercrime indicators. Features real-time threat intelligence integration, secure content analysis, and user-friendly reporting.

### ✨ Key Features

- **🌐 Dual Web Support**: Scan both surface web and dark web (.onion) URLs
- **🔒 Server-Side Tor**: Automatic Tor routing for dark web - users don't need Tor Browser
- **🛡️ Advanced Threat Detection**: Phishing, malware, scams, credential harvesting detection
- **📊 Visual Analytics**: Interactive charts and threat breakdowns
- **🔐 Secure by Design**: Content hashing, no raw HTML exposure, encrypted data handling
- **⚡ Production Ready**: Optimized builds, error handling, Docker support

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Tor daemon** (for dark web scanning) - See [Tor Setup](#-tor-setup)

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd threatdetector2/project

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# Build frontend
npm run build:prod

# Start server
npm start
```

Visit `http://localhost:3000` in your browser.

## 📋 Environment Variables

Create a `.env` file in the `project` directory (copy from `.env.example`):

```env
PORT=3000
NODE_ENV=production
ENABLE_DEBUG_LOGS=false
ALLOWED_ORIGINS=*
GOOGLE_SAFE_BROWSING_API_KEY=your_key_here
```

**Key Variables:**
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (`development` or `production`)
- `ENABLE_DEBUG_LOGS`: Enable verbose logging (`true`/`false`)
- `ALLOWED_ORIGINS`: CORS allowed origins (comma-separated, use `*` for all)
- `GOOGLE_SAFE_BROWSING_API_KEY`: Optional API key for enhanced threat detection

See `.env.example` for all available options.

## 🔧 Tor Setup

### For Development (Local Testing)

**Option 1: Tor Browser** (Easiest)
1. Download [Tor Browser](https://www.torproject.org/download/)
2. Start Tor Browser
3. Enable SOCKS proxy: Settings → Advanced → Network Settings → Configure
4. Ensure SOCKS proxy is on port `9150`
5. Keep Tor Browser running while testing

**Option 2: Tor Daemon** (Recommended for Production)
- **Linux**: `sudo apt install tor && sudo systemctl start tor`
- **Windows**: Download [Tor Expert Bundle](https://www.torproject.org/download/tor/) and install as service
- **macOS**: `brew install tor && brew services start tor`

See `TOR_SETUP_INSTRUCTIONS.md` for detailed setup.

### For Production

The server automatically detects Tor on ports `9050` (daemon) or `9150` (Tor Browser). No user configuration needed!

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
docker-compose up -d
```

### Manual Docker Build

```bash
docker build -t threatdetector .
docker run -p 3000:3000 threatdetector
```

The Dockerfile includes Tor daemon installation and configuration.

## ☁️ Free Hosting Options

### Railway.app (Recommended) 🚂

**Why Railway?**
- ✅ Free $5/month credit (enough for small apps)
- ✅ Supports Docker (Tor included)
- ✅ Auto-deploys from GitHub
- ✅ Easy environment variable management
- ✅ Built-in HTTPS

**Deployment Steps:**

1. **Sign up** at [railway.app](https://railway.app)
2. **Create new project** → Deploy from GitHub
3. **Connect your repository**
4. Railway will automatically detect `Dockerfile` and deploy
5. **Set environment variables** in Railway dashboard:
   - `NODE_ENV=production`
   - `PORT=3000` (or Railway's assigned port)
   - `ALLOWED_ORIGINS=your-frontend-domain.com`
6. **Deploy!** Your app will be live with Tor support

**Note:** Railway's free tier includes $5/month credit. For a small app, this is usually sufficient.

### Alternative: Render.com

1. Sign up at [render.com](https://render.com)
2. Create new **Web Service**
3. Connect GitHub repository
4. **Build Settings:**
   - Build Command: `docker build -t threatdetector .`
   - Start Command: `docker run -p 3000:3000 threatdetector`
5. Set environment variables
6. Deploy

**Note**: Render free tier has slower cold starts but works well for development/testing.

### Alternative: Fly.io

1. Sign up at [fly.io](https://fly.io)
2. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
3. Run: `fly launch` (follow prompts)
4. Deploy: `fly deploy`

## 📁 Project Structure

```
project/
├── api/                           # Backend API endpoints
│   ├── analyze-url.js            # Main URL analysis endpoint
│   ├── tor-crawler.js            # Tor connection & fetching logic
│   ├── advanced-threat-detect.js # Threat detection engine
│   └── fetch-url.js              # Legacy fetch endpoint
├── src/                           # Frontend React application
│   ├── components/                # React components
│   │   ├── HomePage.tsx          # Landing page
│   │   ├── UrlScanResults.tsx    # URL scan results display
│   │   ├── Dashboard.tsx         # File analysis dashboard
│   │   └── ...
│   ├── services/                  # API services
│   ├── types/                     # TypeScript types
│   └── App.tsx                   # Main app component
├── dist/                          # Production build output
├── server.js                      # Express server entry point
├── Dockerfile                     # Docker configuration
├── docker-compose.yml             # Docker Compose setup
├── .env.example                   # Environment variables template
└── package.json                   # Dependencies and scripts
```

## 🔐 Security Features

- ✅ **Content Hashing**: All scraped content is hashed (SHA-256) before storage
- ✅ **No Raw Data Exposure**: Users never see raw HTML or scraped content
- ✅ **Secure Error Handling**: Internal errors are sanitized before user display
- ✅ **CORS Protection**: Configurable allowed origins
- ✅ **Security Headers**: X-Frame-Options, X-XSS-Protection, etc.
- ✅ **Tor Isolation**: Dark web connections isolated via Tor network

## 🧪 Development

```bash
# Start frontend dev server (port 5173)
npm run dev

# Start backend server (port 3000)
npm run server

# Build for production
npm run build:prod

# Run production server
npm start
```

## 📚 API Endpoints

### `POST /api/analyze-url`

Analyze a URL for security threats.

**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "url": "https://example.com",
  "safetyVerdict": "SAFE|SUSPICIOUS|MALICIOUS",
  "riskScore": 0,
  "riskLevel": "Safe|Medium|High",
  "threatCategories": {
    "phishing": false,
    "malware": false,
    "scam": false,
    "suspicious_links": false,
    "high_risk_script": false,
    "metadata_alert": false
  },
  "keyFindings": ["No security threats detected..."],
  "recommendations": ["Site appears safe..."],
  "phaseTimings": {
    "crawl": 1234,
    "analysis": 5678,
    "intelligence": 234,
    "total": 6912
  },
  "isOnion": false,
  "darkWebThreats": null,
  "contentHash": "sha256-hash-here"
}
```

## 🛠️ Technologies

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Tor Integration**: `socks-proxy-agent`, `node-fetch`
- **Threat Detection**: Custom algorithms + threat intelligence APIs
- **Visualization**: Recharts
- **Deployment**: Docker, Railway/Render/Fly.io

## 📝 License

MIT License - See [LICENSE](LICENSE) file

## ⚠️ Disclaimer

**This tool is for educational and security research purposes only.** Users are responsible for complying with all applicable laws and regulations. The authors are not responsible for any misuse of this software.

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

## 📞 Support & Documentation

- **Deployment**: See `DEPLOYMENT_GUIDE.md` for detailed deployment instructions
- **Tor Setup**: See `TOR_SETUP_INSTRUCTIONS.md` for Tor configuration
- **Tor Installation**: See `TOR_INSTALLATION_GUIDE.md` for OS-specific installation
- **Dark Web Support**: See `DARK_WEB_SUPPORT.md` for dark web scanning details
- **Issues**: Open an issue on GitHub for bugs or questions

---

**Made with 🔒 for security researchers and SOC teams**

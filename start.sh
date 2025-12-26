#!/bin/bash
# Production startup script for ThreatDetector

set -e

echo "🚀 Starting ThreatDetector..."

# Check if Tor is running
if ! netstat -tuln | grep -q ":9050\|:9150"; then
    echo "⚠️  Warning: Tor not detected on ports 9050/9150"
    echo "   Dark web scanning may not work"
    echo "   Install Tor: sudo apt-get install tor && sudo systemctl start tor"
fi

# Check if dist folder exists (production build)
if [ ! -d "dist" ]; then
    echo "📦 Building frontend..."
    npm run build:prod
fi

# Set production environment
export NODE_ENV=production

# Start server
echo "✅ Starting server on port ${PORT:-3000}..."
node server.js


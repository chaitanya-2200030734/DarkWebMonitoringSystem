# Production Dockerfile for ThreatDetector
FROM node:18-slim

# Install Tor daemon
RUN apt-get update && \
    apt-get install -y tor && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Configure Tor
RUN echo "SocksPort 0.0.0.0:9050" >> /etc/tor/torrc && \
    echo "ControlPort 9051" >> /etc/tor/torrc && \
    echo "DataDirectory /var/lib/tor" >> /etc/tor/torrc

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (needed for build)
RUN npm install

# Copy application files
COPY . .

# Build frontend
RUN npm run build

# Use existing node user (already non-root, UID 1000)
# No need to create new user - node user is perfect
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Expose ports
EXPOSE 3000 9050

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start Tor and application (wait for Tor to initialize)
CMD ["sh", "-c", "tor & sleep 3 && NODE_ENV=production node server.js"]

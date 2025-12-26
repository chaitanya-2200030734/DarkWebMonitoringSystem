# Deployment Guide - Tor Integration & Production Setup

> **For quick production deployment, see `PRODUCTION.md`**

## Current Architecture

**Important**: Users do NOT need Tor Browser installed on their computers!

The Tor connection happens **server-side** (on your server), not client-side (on the user's browser).

## How It Works

```
User's Browser → Your Server → Tor Browser/Daemon → Dark Web (.onion sites)
```

1. **User**: Just enters a URL in your web app (no Tor needed)
2. **Your Server**: Detects `.onion` URLs and routes them through Tor
3. **Tor (on server)**: Fetches the content from dark web
4. **Your Server**: Analyzes and returns sanitized results to user

## Deployment Options

### Option 1: Server-Side Tor Daemon (Recommended for Production)

**Best for**: Production deployments, VPS/dedicated servers

**Setup**:
1. Install Tor daemon on your server (not Tor Browser)
2. Configure Tor to run as a service
3. Your application automatically connects to `localhost:9050`

**Pros**:
- ✅ Users don't need anything installed
- ✅ More reliable than Tor Browser
- ✅ Can run as a background service
- ✅ Better for production environments

**Cons**:
- ⚠️ Requires server access to install Tor
- ⚠️ Need to manage Tor service

**Installation** (Linux/Ubuntu):
```bash
sudo apt-get update
sudo apt-get install tor
sudo systemctl start tor
sudo systemctl enable tor  # Auto-start on boot
```

**Installation** (Windows Server):
- Download Tor Expert Bundle
- Configure as Windows Service
- Or use Tor Browser in headless mode

### Option 2: Tor Browser on Server (Current Setup)

**Best for**: Development, testing, small deployments

**Setup**:
- Keep Tor Browser running on server
- Application connects to port 9150

**Pros**:
- ✅ Easy to set up
- ✅ Good for development

**Cons**:
- ⚠️ Requires GUI environment (not ideal for servers)
- ⚠️ Less reliable for production
- ⚠️ Manual restart needed if crashes

### Option 3: Tor Proxy Service (Advanced)

**Best for**: Cloud deployments, serverless, or when you can't install Tor

**Setup**:
- Use a third-party Tor proxy service
- Or deploy Tor in a Docker container
- Connect to remote Tor proxy

**Pros**:
- ✅ Works in cloud/serverless environments
- ✅ No direct Tor installation needed

**Cons**:
- ⚠️ Requires external service (costs, reliability)
- ⚠️ More complex setup

## Quick Installation Guide

### Installing Tor Daemon (Linux/Ubuntu - Recommended)

```bash
# Update package list
sudo apt-get update

# Install Tor daemon
sudo apt-get install tor

# Start Tor service
sudo systemctl start tor

# Enable Tor to start on boot
sudo systemctl enable tor

# Verify Tor is running
sudo systemctl status tor
# Should show "active (running)" and port 9050 listening

# Check port
netstat -tuln | grep 9050
# Should show: tcp 0.0.0.0:9050 LISTEN
```

### Installing Tor Browser (Windows/Mac - Development)

1. Download from: https://www.torproject.org/download/
2. Extract ZIP file
3. Run `Start Tor Browser.exe` (Windows) or `start-tor-browser` (Mac/Linux)
4. Keep it running (minimize is fine)
5. Application will detect it on port 9150

### Recommended Production Setup

**For VPS/Dedicated Server:**

1. **Install Tor Daemon** (see above)
2. **Build frontend**: `npm run build:prod`
3. **Start server**: `npm start` or `NODE_ENV=production node server.js`
4. **Users** just use your website - no installation needed!

### For Cloud Platforms (Heroku, Railway, etc.):

**Option A**: Use Docker with Tor
- Create Dockerfile with Tor daemon
- Deploy containerized app + Tor

**Option B**: Use Tor proxy service
- Configure application to use external Tor proxy
- Update `TOR_PROXIES` array in `tor-crawler.js`

## User Experience

### What Users See:
1. ✅ Open your website in any browser
2. ✅ Enter `.onion` URL
3. ✅ Get results (no Tor Browser needed!)

### What Happens Behind the Scenes:
1. Your server detects `.onion` URL
2. Server connects to Tor (running on server)
3. Tor fetches content from dark web
4. Server analyzes and sanitizes results
5. User sees clean, safe results

## Security Considerations

### Server-Side Security:
- ✅ Tor runs on server (isolated from users)
- ✅ All dark web traffic stays on server
- ✅ Users never directly connect to dark web
- ✅ Content is sanitized before sending to users

### User Security:
- ✅ No need to install Tor Browser
- ✅ No direct dark web exposure
- ✅ All analysis happens server-side
- ✅ Only sanitized results are shown

## Monitoring & Maintenance

### Check Tor Status:
```bash
# Check if Tor is running
sudo systemctl status tor

# Check Tor port
netstat -tuln | grep 9050

# View Tor logs
sudo tail -f /var/log/tor/log
```

### Restart Tor if Needed:
```bash
sudo systemctl restart tor
```

## Troubleshooting Deployment

### Tor Not Working on Server:
1. Check if Tor is installed: `which tor`
2. Check if Tor is running: `sudo systemctl status tor`
3. Check port: `netstat -tuln | grep 9050`
4. Check logs: `sudo tail -f /var/log/tor/log`

### Application Can't Connect:
1. Verify Tor is listening on 9050 (daemon) or 9150 (Browser)
2. Check firewall rules
3. Update `TOR_PROXIES` in `tor-crawler.js` if using different port

## Summary

**Answer**: No, users do NOT need Tor Browser!

- ✅ **Users**: Just use your website, no installation needed
- ✅ **Server**: Needs Tor daemon or Tor Browser running
- ✅ **Best Practice**: Use Tor daemon for production deployments

Your application handles all Tor connections server-side, so users get a seamless experience without any technical setup!

## Production Checklist

- [ ] Install Tor daemon on server
- [ ] Build frontend: `npm run build:prod`
- [ ] Set `NODE_ENV=production`
- [ ] Configure environment variables (`.env`)
- [ ] Test Tor connection: `netstat -tuln | grep 9050`
- [ ] Start server: `npm start`
- [ ] Verify static files are served from `/dist`
- [ ] Test onion URL scanning
- [ ] Set up process manager (PM2, systemd, etc.)
- [ ] Configure reverse proxy (nginx, Apache) if needed
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging

## Process Management

### Using PM2 (Recommended)
```bash
npm install -g pm2
pm2 start server.js --name threatdetector
pm2 save
pm2 startup
```

### Using systemd
Create `/etc/systemd/system/threatdetector.service`:
```ini
[Unit]
Description=ThreatDetector Server
After=network.target tor.service

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/threatdetector2/project
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable threatdetector
sudo systemctl start threatdetector
```

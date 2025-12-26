# Tor Setup Instructions

## The Problem
The application is getting `ECONNREFUSED` errors on ports 9050 and 9150, which means Tor is not running or SOCKS proxy is not enabled.

## For Local Development/Testing

### Option 1: Tor Browser (Easiest)
1. **Download and install Tor Browser** from https://www.torproject.org/download/
2. **Start Tor Browser**
3. **Enable SOCKS Proxy**:
   - Open Tor Browser
   - Click the hamburger menu (☰) → Settings
   - Go to **Advanced** → **Network Settings**
   - Click **Configure**
   - Check **"Use a proxy to access the Internet"**
   - Select **SOCKS5**
   - Host: `127.0.0.1`
   - Port: `9150` (or `9050` if using Tor daemon)
   - Click **OK** and restart Tor Browser
4. **Keep Tor Browser running** while testing the application

### Option 2: Tor Daemon (For Production)
1. **Install Tor daemon**:
   - **Windows**: Download from https://www.torproject.org/download/ (choose "Expert Bundle")
   - **Linux**: `sudo apt-get install tor` or `sudo yum install tor`
   - **macOS**: `brew install tor`

2. **Configure Tor**:
   - Edit `/etc/tor/torrc` (Linux/macOS) or `torrc` in Tor installation directory (Windows)
   - Ensure these lines exist:
     ```
     SocksPort 127.0.0.1:9050
     ControlPort 9051
     ```

3. **Start Tor daemon**:
   - **Linux**: `sudo systemctl start tor` or `sudo service tor start`
   - **Windows**: Run `tor.exe` from command line
   - **macOS**: `brew services start tor`

4. **Verify it's running**:
   - Check if port 9050 is listening: `netstat -an | findstr 9050` (Windows) or `netstat -an | grep 9050` (Linux/macOS)

## For Production Deployment

**The server must have Tor running**, not the user's browser. Users don't need to install anything.

1. Install Tor daemon on the server (see Option 2 above)
2. Configure Tor daemon to listen on `0.0.0.0:9050` (not just localhost) if needed
3. Ensure Tor daemon starts automatically on server boot
4. The application will automatically connect to Tor on the server

## Troubleshooting

### Check if Tor is running:
```bash
# Windows
netstat -an | findstr "9050 9150"

# Linux/macOS
netstat -an | grep -E "9050|9150"
```

### Test Tor connection manually:
```bash
# Using curl through Tor SOCKS proxy
curl --socks5-hostname 127.0.0.1:9150 https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswczad.onion/
```

### Common Issues:
- **Port 9150 not available**: Tor Browser might not have SOCKS enabled. Enable it in settings.
- **Port 9050 not available**: Tor daemon is not running. Start it.
- **Both ports unavailable**: Tor is not installed or not running.

## Quick Test
Once Tor is running, try accessing this in your browser (through Tor Browser):
- `http://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswczad.onion/`

If that works, the application should also work.


# Tor Installation Guide for Windows

## Quick Setup (Recommended: Tor Browser)

### Option 1: Tor Browser (Easiest - Recommended)

1. **Download Tor Browser:**
   - Go to: https://www.torproject.org/download/
   - Download the Windows version
   - It's a portable application (no installation needed)

2. **Extract and Run:**
   - Extract the downloaded ZIP file
   - Run `Start Tor Browser.exe` or `Browser\firefox.exe`
   - **Keep Tor Browser running** (you can minimize it)

3. **Verify:**
   - Tor Browser automatically starts the Tor daemon on port **9150**
   - Your application will detect it automatically

### Option 2: Tor Expert Bundle (For Advanced Users)

1. **Download Tor Expert Bundle:**
   - Go to: https://www.torproject.org/download/tor/
   - Download the Windows expert bundle

2. **Extract and Configure:**
   - Extract to a folder (e.g., `C:\tor`)
   - Create a `torrc` configuration file:
     ```
     SocksPort 9050
     ControlPort 9051
     ```

3. **Start Tor:**
   ```powershell
   cd C:\tor
   .\tor.exe
   ```
   - This will run Tor daemon on port **9050**

## Verification

After starting Tor Browser or Tor daemon, verify it's running:

```powershell
# Check if Tor is listening
netstat -ano | findstr ":9050"
netstat -ano | findstr ":9150"
```

You should see output showing Tor is listening on one of these ports.

## Testing Your Setup

1. Start Tor Browser (or Tor daemon)
2. Wait 10-15 seconds for it to initialize
3. Try scanning an onion URL in your application:
   - Example: `http://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion`

## Troubleshooting

### "Tor service is not running"
- Make sure Tor Browser is actually running (check taskbar)
- Wait a bit longer for Tor to initialize (can take 10-30 seconds)
- Check if firewall is blocking Tor

### "Unable to connect through Tor network"
- Verify Tor Browser is running
- Check ports: `netstat -ano | findstr ":9150"`
- Try restarting Tor Browser
- Check Windows Firewall settings

### Port Already in Use
- Close other applications using ports 9050/9150
- Or configure Tor to use a different port

## Quick Start Script

Run the `START_TOR.ps1` script in this directory - it will:
- Search for installed Tor Browser
- Start it automatically if found
- Verify it's running on the correct port

## Notes

- **Tor Browser** is recommended because it's easier to set up
- Keep Tor Browser running while using the application
- The application automatically detects Tor on ports 9050 or 9150
- You don't need to browse with Tor Browser - just keep it running


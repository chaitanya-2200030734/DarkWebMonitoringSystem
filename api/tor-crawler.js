import fetch from 'node-fetch';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { createHash } from 'crypto';
import { URL } from 'url';

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
// Always enable debug logs for Tor to help diagnose issues
const ENABLE_DEBUG_LOGS = true; // Always log Tor operations

// Debug logging helper
const debugLog = (...args) => {
  console.log('[Tor]', ...args);
};

const debugError = (...args) => {
  console.error('[Tor]', ...args);
};

// Tor proxy configuration - try both common ports
const TOR_PROXIES = [
  'socks5h://127.0.0.1:9050',  // Tor daemon
  'socks5h://127.0.0.1:9150'   // Tor Browser
];

// Check if URL is a .onion domain
export function isOnionUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.endsWith('.onion');
  } catch {
    return false;
  }
}

// Test if Tor proxy is actually working by connecting to a known-good onion service
async function testTorProxy(proxyUrl, port) {
  const testUrl = 'https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswczad.onion/';
  debugLog(`[Port ${port}] Testing Tor connectivity with DuckDuckGo...`);
  
  try {
    const agent = new SocksProxyAgent(proxyUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s test timeout
    
    try {
      const response = await fetch(testUrl, {
        agent,
        signal: controller.signal,
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      clearTimeout(timeoutId);
      debugLog(`[Port ${port}] ✅ Tor test successful! Status: ${response.status}`);
      return true;
    } catch (testError) {
      clearTimeout(timeoutId);
      const errorCode = testError.code || '';
      const errorMsg = (testError.message || '').toString();
      
      // If it's connection refused, Tor is definitely not running on this port
      if (errorCode === 'ECONNREFUSED' || errorMsg.includes('ECONNREFUSED')) {
        debugError(`[Port ${port}] ❌ Tor test failed: Connection refused`);
        return false;
      }
      
      // For other errors (timeout, DNS, etc.), assume Tor might be working but slow
      debugLog(`[Port ${port}] ⚠️ Tor test got error but might still work: ${errorMsg.substring(0, 50)}`);
      return true; // Optimistic - let actual fetch determine
    }
  } catch (agentError) {
    debugError(`[Port ${port}] ❌ Failed to create SOCKS agent: ${agentError.message}`);
    return false;
  }
}

// Try to fetch with a specific Tor proxy
async function tryFetchWithProxy(url, proxyUrl, timeout, port) {
  try {
    const agent = new SocksProxyAgent(proxyUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    debugLog(`[Port ${port}] Starting fetch (timeout: ${timeout}ms)...`);
    
    try {
      const response = await fetch(url, {
        agent,
        signal: controller.signal,
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        redirect: 'follow',
        maxRedirects: 5
      });
      
      clearTimeout(timeoutId);
      debugLog(`[Port ${port}] ✅ Fetch successful! Status: ${response.status}`);
      return { success: true, response, error: null };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      // Log the actual error for debugging
      const errorCode = fetchError.code || '';
      const errorMsg = (fetchError.message || '').toString();
      const errorName = fetchError.name || '';
      
      debugError(`[Port ${port}] ❌ Fetch error:`, {
        name: errorName,
        code: errorCode,
        message: errorMsg.substring(0, 150)
      });
      
      return { success: false, response: null, error: fetchError };
    }
  } catch (agentError) {
    // Error creating agent itself
    debugError(`[Port ${port}] ❌ Agent creation error:`, agentError.message);
    return { 
      success: false, 
      response: null, 
      error: { 
        message: agentError.message || 'Failed to create SOCKS agent',
        code: agentError.code || 'AGENT_ERROR',
        name: agentError.name || 'Error'
      } 
    };
  }
}

// Secure hash function for content
export function hashContent(content) {
  return createHash('sha256').update(content).digest('hex');
}

// Encrypt/hash sensitive data (in-memory only, never persisted)
export function secureHash(data) {
  if (typeof data === 'string') {
    return hashContent(data);
  }
  return hashContent(JSON.stringify(data));
}

// Fetch page content with Tor support and retry logic
export async function fetchPageContentSecure(url, options = {}) {
  const {
    timeout = 5000, // Reduced to 5 seconds for Railway free tier
    retries = 1, // Only 1 retry to stay within Railway's 10-second limit
    retryDelay = 500, // Fast retry
    isOnion = false
  } = options;

  // For onion URLs, try both Tor ports with retries
  if (isOnion) {
    debugLog('\n=== FETCHING .ONION URL:', url.substring(0, 50) + '... ===\n');
    
    // First, find which Tor port is actually working
    debugLog('Step 1: Testing Tor connectivity...');
    let workingProxy = null;
    let workingPort = null;
    
    // Test both ports to find which one works
    for (const proxyUrl of TOR_PROXIES) {
      const port = proxyUrl.includes('9150') ? '9150' : '9050';
      const isWorking = await testTorProxy(proxyUrl, port);
      if (isWorking) {
        workingProxy = proxyUrl;
        workingPort = port;
        debugLog(`✅ Found working Tor proxy on port ${port}!`);
        break;
      }
    }
    
    // If no working proxy found, try anyway (might be slow to respond)
    if (!workingProxy) {
      debugLog('⚠️ Tor connectivity test inconclusive, will try anyway...');
      // Default to 9150 (Tor Browser) first
      workingProxy = TOR_PROXIES[1];
      workingPort = '9150';
    }
    
    // Now try to fetch the actual URL with retries
    debugLog(`\nStep 2: Fetching target URL using port ${workingPort}...`);
    const actualRetries = 5; // More retries for reliability
    const actualTimeout = 120000; // 120s per attempt (onion services are VERY slow)
    const actualRetryDelay = 3000; // 3s base delay
    
    let lastError = null;
    let lastErrorCode = null;
    let lastErrorMsg = null;
    let connectionRefusedCount = 0;
    let otherErrorCount = 0;
    
    // Try the working port first, then alternate if it fails
    for (let attempt = 0; attempt < actualRetries; attempt++) {
      // On first attempt, use the working proxy. After that, alternate
      let proxyToUse = workingProxy;
      let portToUse = workingPort;
      
      if (attempt > 0 && attempt % 2 === 1) {
        // Alternate to the other port
        proxyToUse = workingProxy === TOR_PROXIES[0] ? TOR_PROXIES[1] : TOR_PROXIES[0];
        portToUse = portToUse === '9050' ? '9150' : '9050';
      }
      
      debugLog(`\n[Attempt ${attempt + 1}/${actualRetries}] Fetching via port ${portToUse}...`);
      
      const result = await tryFetchWithProxy(url, proxyToUse, actualTimeout, portToUse);
      
      if (result.success) {
        const response = result.response;
        
        if (!response.ok) {
          if (response.status === 403 || response.status === 401) {
            throw new Error('ACCESS_RESTRICTED');
          }
          if (response.status >= 500) {
            throw new Error('SERVER_ERROR');
          }
          throw new Error(`HTTP_${response.status}`);
        }
        
        const html = await response.text();
        debugLog(`\n🎉 SUCCESS! Status: ${response.status}, Content length: ${html.length} bytes\n`);
        
        return {
          html,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          url: response.url,
          success: true
        };
      }
      
      // Fetch failed - analyze error
      const error = result.error;
      lastError = error;
      const errorMsg = (error.message || '').toString();
      const errorCode = error.code || '';
      const errorName = error.name || '';
      lastErrorCode = errorCode;
      lastErrorMsg = errorMsg;
      
      // Count error types
      if (errorCode === 'ECONNREFUSED' || 
          errorMsg.includes('ECONNREFUSED') ||
          errorMsg.includes('connect ECONNREFUSED') ||
          errorMsg.includes('Connection refused')) {
        connectionRefusedCount++;
        debugError(`❌ Port ${portToUse}: Connection refused`);
      } else {
        otherErrorCount++;
        debugError(`❌ Port ${portToUse}: ${errorName} - ${errorMsg.substring(0, 80)}`);
      }
      
      // If it's a connection refused and we have more attempts, try the other port
      if ((errorCode === 'ECONNREFUSED' || errorMsg.includes('ECONNREFUSED')) && attempt < actualRetries - 1) {
        debugLog(`→ Port ${portToUse} refused, will try other port on next attempt...`);
        // Continue to next attempt (will alternate port)
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
        continue;
      }
      
      // If it's a timeout, wait before retrying
      if (errorName === 'AbortError' || errorMsg.includes('timeout') || errorMsg.includes('aborted')) {
        if (attempt < actualRetries - 1) {
          const delay = actualRetryDelay * (attempt + 1);
          debugLog(`⏳ Timeout, waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // For other errors, wait and retry
      if (attempt < actualRetries - 1) {
        const delay = actualRetryDelay * (attempt + 1);
        debugLog(`⚠️ Error occurred, waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
    
    // All attempts failed - determine the error type
    debugError(`\n=== All ${actualRetries} attempts failed ===`);
    debugError(`Connection refused: ${connectionRefusedCount}, Other errors: ${otherErrorCount}`);
    debugError(`Last error: ${lastErrorCode} - ${lastErrorMsg}`);
    
    // Only throw TOR_NOT_RUNNING if MOST errors were connection refused
    // Be very lenient - only fail if we're 80%+ sure Tor isn't running
    if (connectionRefusedCount >= Math.ceil(actualRetries * 0.8) && otherErrorCount === 0) {
      debugError('🚫 Most errors were ECONNREFUSED - Tor likely not running');
      throw new Error('TOR_NOT_RUNNING');
    }
    
    // If we got timeouts, throw timeout error
    if (lastError && lastError.name === 'AbortError') {
      throw new Error('TIMEOUT_EXCEEDED');
    }
    
    // Otherwise, assume Tor is running but service is unavailable
    debugError('🔌 Tor appears to be running but target service unavailable');
    throw new Error('TOR_CONNECTION_FAILED');
  }

  // For surface web URLs, use normal fetch with Railway-optimized timeout
  // Railway free tier has 10-second limit, so we use 5 seconds max
  const surfaceWebTimeout = Math.min(timeout, 5000); // Cap at 5 seconds for Railway
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), surfaceWebTimeout);
  
  try {
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      redirect: 'follow',
      maxRedirects: 5,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        throw new Error('ACCESS_RESTRICTED');
      }
      if (response.status >= 500) {
        throw new Error('SERVER_ERROR');
      }
      throw new Error(`HTTP_${response.status}`);
    }
    
    const html = await response.text();
    
    return {
      html,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      url: response.url,
      success: true
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Enhanced error message translator
export function getErrorMessage(error) {
  const errorMsg = error.message || error.toString();
  
  if (errorMsg === 'TOR_NOT_RUNNING') {
    return {
      userMessage: 'Dark web connectivity is currently unavailable. The server cannot connect to Tor network.',
      internalMessage: 'Tor proxy not available on ports 9050 or 9150 - Tor service not running or SOCKS proxy not enabled',
      actionable: 'For local testing: Make sure Tor Browser is running and SOCKS proxy is enabled (Settings > Advanced > Network Settings > Configure). For production: Server administrator needs to install and start Tor daemon.'
    };
  }
  
  if (errorMsg === 'TOR_CONNECTION_FAILED') {
    return {
      userMessage: 'The dark web service appears to be unavailable or unreachable at this time.',
      internalMessage: 'Tor connection established but onion service unreachable',
      actionable: 'The service may be temporarily offline. Please try again later.'
    };
  }
  
  if (errorMsg === 'TIMEOUT_EXCEEDED') {
    return {
      userMessage: 'Request timed out. The onion service may be slow or unavailable.',
      internalMessage: `Request exceeded timeout limit`,
      actionable: 'Try again later or verify the onion service is operational'
    };
  }
  
  if (errorMsg === 'ACCESS_RESTRICTED') {
    return {
      userMessage: 'Access to this resource is restricted.',
      internalMessage: 'HTTP 403/401 received',
      actionable: 'This site may require authentication or block automated access'
    };
  }
  
  if (errorMsg === 'FETCH_FAILED') {
    return {
      userMessage: 'Failed to fetch page content after multiple attempts.',
      internalMessage: 'All retry attempts exhausted',
      actionable: 'Verify URL is correct and service is available'
    };
  }
  
  if (errorMsg.includes('HTTP_')) {
    const statusCode = errorMsg.replace('HTTP_', '');
    return {
      userMessage: `Server returned error code ${statusCode}`,
      internalMessage: `HTTP ${statusCode} response`,
      actionable: 'The server may be temporarily unavailable'
    };
  }
  
  return {
    userMessage: 'An unexpected error occurred while fetching the page.',
    internalMessage: errorMsg,
    actionable: 'Please try again or contact support'
  };
}


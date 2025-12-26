import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import dns from 'dns/promises';
import { URL } from 'url';
import { fetchPageContentSecure, isOnionUrl, hashContent } from './tor-crawler.js';

// Scoring weights
const WEIGHTS = {
  phishing: 5,
  malware: 7,
  scam: 4,
  cybercrime: 6,
  suspicious_links: 3,
  untrusted_domain: 5,
  high_risk_script: 6,
  metadata_alert: 2
};

const RISK_THRESHOLDS = {
  Safe: 0,
  Low: 5,
  Medium: 12,
  High: 20
};

const THREAT_INTEL = {
  google_safe_browsing_api_key: '<YOUR_GOOGLE_SAFE_BROWSING_API_KEY>',
  phishtank_api_url: 'https://data.phishtank.com/data/online-valid.json',
  spamhaus_blocklists: [
    'zen.spamhaus.org',
    'dbl.spamhaus.org'
  ]
};

async function fetchPageContent(url, timeout = 5000) {
  try {
    const isOnion = isOnionUrl(url);
    // Railway free tier has 10-second limit - we need to be FAST
    // Surface web: 5 seconds max, 1 retry
    // Onion: Not supported on Railway free tier (handled in fetch-url.js)
    const result = await fetchPageContentSecure(url, {
      timeout: timeout, // 5 seconds for surface web
      retries: 1, // Only 1 retry to stay within Railway's limit
      retryDelay: 500, // Fast retry
      isOnion: false // Force surface web only for Railway
    });
    
    // Check if result has error (from tor-crawler error handling)
    if (result.error || !result.html) {
      return {
        error: result.error || 'Failed to fetch page content',
        isOnion: isOnion,
        errorCode: result.errorCode || 'FETCH_FAILED'
      };
    }
    
    // Hash the content for secure storage (never expose raw HTML)
    const contentHash = hashContent(result.html);
    
    // Return HTML for processing, but mark it as secure
    return {
      html: result.html,
      hash: contentHash,
      isOnion,
      metadata: {
        status: result.status || 200,
        finalUrl: result.url || url,
        headers: result.headers || {}
      }
    };
  } catch (error) {
    // Return error details for proper handling
    const isOnion = isOnionUrl(url);
    // Only log errors in development or when debug is enabled
    const isDebug = process.env.ENABLE_DEBUG_LOGS === 'true' || process.env.NODE_ENV === 'development';
    if (isDebug) {
      console.error('[fetchPageContent] Error fetching URL:', url);
      console.error('[fetchPageContent] Is Onion:', isOnion);
      console.error('[fetchPageContent] Error message:', error.message);
      console.error('[fetchPageContent] Error code:', error.code);
      console.error('[fetchPageContent] Error name:', error.name);
    }
    
    // Preserve Tor-specific error messages
    let errorMessage = error.message || 'Failed to fetch page content';
    if (isOnion && (errorMessage.includes('TOR_') || errorMessage.includes('SOCKS'))) {
      // Keep the specific Tor error message
      errorMessage = error.message;
    }
    
    return {
      error: errorMessage,
      isOnion: isOnion,
      errorCode: error.code || 'UNKNOWN_ERROR'
    };
  }
}

function extractPageElements(html, baseUrl) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  // Visible text
  const visibleText = document.body.textContent.replace(/\s+/g, ' ').trim();
  // Links
  const links = Array.from(document.querySelectorAll('a[href]')).map(a => new URL(a.href, baseUrl).href);
  // Images
  const images = Array.from(document.querySelectorAll('img[src]')).map(img => new URL(img.src, baseUrl).href);
  // Videos
  const videos = Array.from(document.querySelectorAll('video')).map(video => video.src ? new URL(video.src, baseUrl).href : '').filter(Boolean);
  // Scripts
  const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => new URL(s.src, baseUrl).href);
  const inlineScripts = Array.from(document.querySelectorAll('script')).map(s => s.textContent || '');
  // Metadata
  const metadata = {};
  Array.from(document.querySelectorAll('meta')).forEach(meta => {
    if (meta.name && meta.content) metadata[meta.name.toLowerCase()] = meta.content;
    if (meta.property && meta.content) metadata[meta.property.toLowerCase()] = meta.content;
  });
  return { visibleText, links, images, videos, scripts, inlineScripts, metadata };
}

async function checkGoogleSafeBrowsing(url) {
  const apiKey = THREAT_INTEL.google_safe_browsing_api_key;
  const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;
  const payload = {
    client: { clientId: 'yourcompanyname', clientVersion: '1.0' },
    threatInfo: {
      threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
      platformTypes: ['ANY_PLATFORM'],
      threatEntryTypes: ['URL'],
      threatEntries: [{ url }]
    }
  };
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    if (!response.ok) return [false, null];
    const data = await response.json();
    if (data.matches) return [true, data.matches];
    return [false, null];
  } catch {
    return [false, null];
  }
}

let phishtankCache = null;
let phishtankCacheTime = 0;
const phishtankCacheTTL = 3600 * 1000;
async function loadPhishtankData() {
  const now = Date.now();
  if (phishtankCache && (now - phishtankCacheTime) < phishtankCacheTTL) return phishtankCache;
  try {
    const response = await fetch(THREAT_INTEL.phishtank_api_url, { timeout: 10000 });
    if (!response.ok) return null;
    const data = await response.json();
    phishtankCache = data;
    phishtankCacheTime = now;
    return data;
  } catch {
    return null;
  }
}
async function checkPhishtank(url) {
  const data = await loadPhishtankData();
  if (!data) return false;
  for (const entry of data) {
    if (entry.url === url && entry.verified && entry.valid) return true;
  }
  return false;
}

async function checkSpamhausDNSBL(ip) {
  const results = [];
  for (const zone of THREAT_INTEL.spamhaus_blocklists) {
    const query = `${ip.split('.').reverse().join('.')}.${zone}`;
    try {
      const res = await dns.resolve4(query);
      if (res && res.length) results.push(zone);
    } catch {}
  }
  return results;
}

function getIPFromUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return dns.lookup(hostname).then(res => res.address).catch(() => null);
  } catch {
    return null;
  }
}

function detectSuspiciousScripts(inlineScripts) {
  const patterns = [
    /eval\(/i,
    /document\.write\(/i,
    /unescape\(/i,
    /atob\(/i,
    /setTimeout\(/i,
    /window\.location/i,
    /XMLHttpRequest/i
  ];
  const found = [];
  for (const script of inlineScripts) {
    if (!script) continue;
    for (const pattern of patterns) {
      if (pattern.test(script)) found.push(pattern.source);
    }
  }
  return found;
}

function domainReputationAndIntent(url) {
  const domain = new URL(url).hostname.toLowerCase();
  const educationalTlds = ['.edu', '.ac', '.edu.', '.gov'];
  const commercialTlds = ['.com', '.net', '.biz', '.co'];
  // Strong whitelist for reputable/educational domains
  const reputableDomains = [
    'wikipedia.org', 'khanacademy.org', 'edx.org', 'coursera.org', 'mit.edu', 'harvard.edu', 'stanford.edu', 'openai.com', 'github.com', 'mozilla.org', 'nasa.gov', 'who.int', 'un.org', 'springer.com', 'nature.com', 'sciencedirect.com', 'britannica.com', 'nationalgeographic.com', 'bbc.co.uk', 'nytimes.com', 'theguardian.com', 'google.com', 'microsoft.com', 'apple.com', 'ibm.com', 'oracle.com', 'stackoverflow.com', 'w3schools.com', 'python.org', 'nodejs.org', 'reactjs.org', 'vuejs.org', 'angular.io', 'docker.com', 'cloudflare.com', 'archive.org', 'arxiv.org', 'scholar.google.com', 'wikimedia.org', 'wiktionary.org', 'wikibooks.org', 'wikiversity.org', 'wikinews.org', 'wikivoyage.org', 'wikidata.org', 'wikimediafoundation.org'
  ];
  let intent = 'unknown';
  let reputation = 'unknown';
  if (educationalTlds.some(tld => domain.endsWith(tld)) || reputableDomains.some(d => domain.endsWith(d) || domain === d)) {
    intent = 'educational';
    reputation = 'reputable';
  } else if (commercialTlds.some(tld => domain.endsWith(tld))) {
    intent = 'commercial';
    reputation = 'reputable';
  } else {
    intent = 'unknown';
    reputation = 'unknown';
  }
  // Additional heuristics for suspicious domains
  const suspiciousPatterns = [/[a-z0-9]{15,}/, /xn--/];
  if (suspiciousPatterns.some(p => p.test(domain))) reputation = 'suspicious';
  return { reputation, intent };
}

function cleanVisibleText(text) {
  const jargonPatterns = [
    /\bfunction\b/gi, /\bvar\b/gi, /\bconst\b/gi, /\blet\b/gi, /\bclass\b/gi,
    /\breturn\b/gi, /\bimport\b/gi, /\bexport\b/gi, /\bif\b/gi, /\belse\b/gi,
    /\bfor\b/gi, /\bwhile\b/gi, /\bconsole\b/gi, /\bwindow\b/gi
  ];
  let cleaned = text;
  for (const pattern of jargonPatterns) cleaned = cleaned.replace(pattern, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

function scoreAndClassify(threats, reputation, intent) {
  let score = 0;
  const details = [];
  // If reputable/educational domain and no real threats, always Safe
  if (reputation === 'reputable' && intent === 'educational' && !threats.phishing && !threats.malware && !threats.scam && !threats.cybercrime && !threats.high_risk_script) {
    return { riskLevel: 'Safe', score: 0, details: ['Educational/reputable site. No threats detected.'] };
  }
  if (threats.phishing) { score += WEIGHTS.phishing; details.push('Phishing indicators detected.'); }
  if (threats.malware) { score += WEIGHTS.malware; details.push('Malware indicators detected.'); }
  if (threats.scam) { score += WEIGHTS.scam; details.push('Scam indicators detected.'); }
  if (threats.cybercrime) { score += WEIGHTS.cybercrime; details.push('Cybercrime-related indicators detected.'); }
  if (threats.suspicious_links) { score += WEIGHTS.suspicious_links; details.push('Suspicious links found.'); }
  if (reputation === 'malicious') { score += WEIGHTS.untrusted_domain; details.push('Domain flagged as malicious.'); }
  if (threats.high_risk_script) { score += WEIGHTS.high_risk_script; details.push('High-risk script patterns detected.'); }
  if (threats.metadata_alert) { score += WEIGHTS.metadata_alert; details.push('Suspicious metadata found.'); }
  if (intent === 'educational' && score > 0) { score = Math.max(0, score - 3); details.push('Educational site intent lowers risk score.'); }
  let riskLevel = 'Safe';
  for (const [level, threshold] of Object.entries(RISK_THRESHOLDS).sort((a, b) => b[1] - a[1])) {
    if (score >= threshold) { riskLevel = level; break; }
  }
  return { riskLevel, score, details };
}

function generateSummary(riskLevel, score, details, url, timeMs) {
  const summary = {
    RiskLevel: riskLevel,
    RiskScore: score,
    Findings: details,
    Recommendations: [],
    Performance: `Analysis completed in ${(timeMs / 1000).toFixed(2)} seconds`,
    URL: url
  };
  if (riskLevel === 'Safe') summary.Recommendations.push('Site appears safe. No immediate action needed.');
  else {
    if (details.some(d => d.includes('Phishing'))) summary.Recommendations.push('Avoid entering sensitive information.');
    if (details.some(d => d.includes('Malware'))) summary.Recommendations.push('Do not download files or run scripts from this site.');
    if (details.some(d => d.includes('Scam'))) summary.Recommendations.push('Verify website legitimacy before transactions.');
    if (details.some(d => d.includes('Cybercrime'))) summary.Recommendations.push('Report to appropriate authorities if possible.');
    if (['Medium', 'High'].includes(riskLevel)) summary.Recommendations.push('Consider blocking or quarantining site access.');
  }
  return summary;
}

// Dark web specific threat keywords
const DARK_WEB_THREATS = {
  credential_harvesting: [
    'login', 'password', 'credential', 'account', 'username', 'email', 'verify',
    'authenticate', 'sign in', 'log in', 'access', 'security', 'update account'
  ],
  financial_fraud: [
    'bitcoin', 'cryptocurrency', 'wallet', 'payment', 'transfer', 'escrow',
    'crypto', 'btc', 'eth', 'monero', 'xmr', 'payment method', 'deposit'
  ],
  illegal_markets: [
    'marketplace', 'vendor', 'product', 'listing', 'order', 'shipping',
    'feedback', 'reviews', 'rating', 'buy', 'sell', 'trade'
  ],
  malware_distribution: [
    'download', 'install', 'executable', 'software', 'tool', 'crack',
    'keygen', 'patch', 'trojan', 'virus', 'malware', 'exploit'
  ],
  scam_indicators: [
    'urgent', 'limited time', 'act now', 'guaranteed', '100% safe',
    'no risk', 'free money', 'get rich', 'easy money', 'work from home'
  ]
};

function detectDarkWebThreats(text, links, scripts, isOnion) {
  const threats = {
    credential_harvesting: false,
    financial_fraud: false,
    illegal_markets: false,
    malware_distribution: false,
    scam_indicators: false
  };
  
  if (!isOnion) return threats;
  
  const allText = (text + ' ' + links.join(' ') + ' ' + scripts.join(' ')).toLowerCase();
  
  // Check for credential harvesting patterns
  const credentialPatterns = [
    /login.*password/i,
    /verify.*account/i,
    /update.*credentials/i,
    /enter.*password/i
  ];
  if (credentialPatterns.some(p => p.test(allText)) || 
      DARK_WEB_THREATS.credential_harvesting.some(k => allText.includes(k))) {
    threats.credential_harvesting = true;
  }
  
  // Check for financial fraud
  if (DARK_WEB_THREATS.financial_fraud.some(k => allText.includes(k))) {
    threats.financial_fraud = true;
  }
  
  // Check for illegal markets
  if (DARK_WEB_THREATS.illegal_markets.some(k => allText.includes(k))) {
    threats.illegal_markets = true;
  }
  
  // Check for malware distribution
  if (DARK_WEB_THREATS.malware_distribution.some(k => allText.includes(k))) {
    threats.malware_distribution = true;
  }
  
  // Check for scam indicators
  if (DARK_WEB_THREATS.scam_indicators.some(k => allText.includes(k))) {
    threats.scam_indicators = true;
  }
  
  return threats;
}

export async function detectWebThreat(url) {
  try {
    const start = Date.now();
    const fetchResult = await fetchPageContent(url);
    
    // Handle errors from fetch - check if result has error property
    if (fetchResult && fetchResult.error) {
      return { 
        error: fetchResult.error,
        isOnion: fetchResult.isOnion || isOnionUrl(url)
      };
    }
    
    // Check if we got valid HTML content
    if (!fetchResult || !fetchResult.html || typeof fetchResult.html !== 'string') {
      return { 
        error: 'Failed to fetch page content.',
        isOnion: (fetchResult && fetchResult.isOnion) || isOnionUrl(url)
      };
    }
    
    const html = fetchResult.html;
    const isOnion = fetchResult.isOnion || isOnionUrl(url);
    const contentHash = fetchResult.hash; // Store hash, never expose raw HTML
    
    let elements;
    try {
      elements = extractPageElements(html, url);
    } catch (parseError) {
      console.error('[detectWebThreat] Error parsing HTML:', parseError);
      return {
        error: 'Failed to parse page content.',
        isOnion: isOnion
      };
    }
  const cleanedText = cleanVisibleText(elements.visibleText);
  const threats = {
    phishing: false,
    malware: false,
    scam: false,
    cybercrime: false,
    suspicious_links: false,
    high_risk_script: false,
    metadata_alert: false
  };
  // Google Safe Browsing (with timeout for Railway)
  try {
    const gsbPromise = checkGoogleSafeBrowsing(url);
    const gsbTimeout = new Promise((resolve) => setTimeout(() => resolve([false]), 2000));
    const [gsbFlagged] = await Promise.race([gsbPromise, gsbTimeout]);
    if (gsbFlagged) threats.malware = true;
  } catch (e) {
    // Skip if timeout or error
  }
  
  // PhishTank (with timeout for Railway)
  try {
    const ptPromise = checkPhishtank(url);
    const ptTimeout = new Promise((resolve) => setTimeout(() => resolve(false), 2000));
    const ptFlagged = await Promise.race([ptPromise, ptTimeout]);
    if (ptFlagged) threats.phishing = true;
  } catch (e) {
    // Skip if timeout or error
  }
  // Suspicious scripts
  const suspiciousScriptsFound = detectSuspiciousScripts(elements.inlineScripts);
  if (suspiciousScriptsFound.length) threats.high_risk_script = true;
  // Check links
  let suspiciousLinksCount = 0, maliciousLinksCount = 0;
  for (const link of elements.links) {
    const { reputation } = domainReputationAndIntent(link);
    if (reputation === 'malicious') maliciousLinksCount++;
    if (reputation === 'suspicious') suspiciousLinksCount++;
  }
  if (maliciousLinksCount > 0) { threats.phishing = true; threats.scam = true; }
  if (suspiciousLinksCount > 2) threats.suspicious_links = true;
  // Metadata
  const suspiciousMetaKeywords = ['phishing', 'malware', 'scam', 'fraud', 'fake'];
  const metadataValues = Object.values(elements.metadata).join(' ').toLowerCase();
  if (suspiciousMetaKeywords.some(word => metadataValues.includes(word))) threats.metadata_alert = true;
  
  // Dark web specific threat detection
  const darkWebThreats = detectDarkWebThreats(
    cleanedText,
    elements.links,
    elements.inlineScripts,
    isOnion
  );
  
  // Merge dark web threats into main threats
  if (darkWebThreats.credential_harvesting) threats.phishing = true;
  if (darkWebThreats.financial_fraud) threats.scam = true;
  if (darkWebThreats.malware_distribution) threats.malware = true;
  if (darkWebThreats.illegal_markets) threats.cybercrime = true;
  if (darkWebThreats.scam_indicators) threats.scam = true;
  
  // Main site reputation/intent
  const { reputation, intent } = domainReputationAndIntent(url);
  
  // Adjust intent for onion sites
  if (isOnion && intent === 'unknown') {
    // Onion sites are inherently more suspicious
    if (Object.values(darkWebThreats).some(v => v)) {
      // Intent remains unknown but threats are flagged
    }
  }
  
  // Score/classify
  const { riskLevel, score, details } = scoreAndClassify(threats, reputation, intent);
  
  // Add dark web specific details
  if (isOnion) {
    details.push('Dark web (.onion) site detected.');
    if (darkWebThreats.credential_harvesting) {
      details.push('Credential harvesting patterns detected.');
    }
    if (darkWebThreats.illegal_markets) {
      details.push('Illegal marketplace indicators detected.');
    }
  }
  
    // Summary (include hash but never raw HTML)
    const summary = generateSummary(riskLevel, score, details, url, Date.now() - start);
    summary.contentHash = contentHash; // Include hash for verification
    summary.isOnion = isOnion;
    summary.darkWebThreats = darkWebThreats;
    
    return summary;
  } catch (error) {
    console.error('[detectWebThreat] Unhandled error:', error);
    console.error('[detectWebThreat] Error stack:', error.stack);
    return {
      error: 'An error occurred while analyzing the URL',
      isOnion: isOnionUrl(url),
      errorCode: error.message || 'ANALYSIS_ERROR'
    };
  }
}

// Helper functions for analyze-url.js
export function categorizeThreats(findings, riskLevel, riskScore) {
  const categories = {
    phishing: false,
    malware: false,
    scam: false,
    cybercrime: false,
    suspicious: false
  };
  
  const findingsStr = findings.join(' ').toLowerCase();
  if (findingsStr.includes('phishing')) categories.phishing = true;
  if (findingsStr.includes('malware')) categories.malware = true;
  if (findingsStr.includes('scam')) categories.scam = true;
  if (findingsStr.includes('cybercrime') || findingsStr.includes('illegal')) categories.cybercrime = true;
  if (riskScore > 5) categories.suspicious = true;
  
  return categories;
}

export function getSafetyVerdict(riskLevel, riskScore, intent) {
  if (riskLevel === 'Safe' && riskScore === 0) return 'SAFE';
  if (riskLevel === 'Low' || riskScore < 10) return 'SUSPICIOUS';
  if (riskLevel === 'Medium' || riskScore < 20) return 'HIGH_RISK';
  return 'CRITICAL';
}

export function generateKeyFindings(findings, riskLevel, riskScore, threatCategories) {
  const keyFindings = [];
  
  if (threatCategories.phishing) {
    keyFindings.push('Phishing indicators detected - do not enter credentials');
  }
  if (threatCategories.malware) {
    keyFindings.push('Malware indicators detected - avoid downloading files');
  }
  if (threatCategories.scam) {
    keyFindings.push('Scam indicators detected - be cautious with financial transactions');
  }
  if (threatCategories.cybercrime) {
    keyFindings.push('Cybercrime-related content detected');
  }
  if (riskScore > 15) {
    keyFindings.push(`High risk score: ${riskScore}/100`);
  }
  
  return keyFindings.length > 0 ? keyFindings : ['No major threats detected'];
}

export function generateRecommendations(riskLevel, threatCategories, safetyVerdict) {
  const recommendations = [];
  
  if (safetyVerdict === 'CRITICAL' || safetyVerdict === 'HIGH_RISK') {
    recommendations.push('Avoid visiting this site');
    recommendations.push('Do not enter any personal information');
    recommendations.push('Consider blocking this domain');
  } else if (safetyVerdict === 'SUSPICIOUS') {
    recommendations.push('Exercise caution when browsing');
    recommendations.push('Avoid entering sensitive information');
  } else {
    recommendations.push('Site appears safe - standard precautions apply');
  }
  
  if (threatCategories.phishing) {
    recommendations.push('Never enter passwords or credentials');
  }
  if (threatCategories.malware) {
    recommendations.push('Do not download files from this site');
  }
  
  return recommendations;
}

// Re-export from tor-crawler.js
export { getErrorMessage, isOnionUrl } from './tor-crawler.js';

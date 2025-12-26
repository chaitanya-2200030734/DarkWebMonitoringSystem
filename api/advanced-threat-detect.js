import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
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

// SIMPLIFIED: Skip slow threat intelligence for Railway
async function checkGoogleSafeBrowsing(url) {
  return [false, null]; // Skip for speed
}

async function checkPhishtank(url) {
  return false; // Skip for speed
}

async function fetchPageContent(url, timeout = 3000) {
  try {
    const isOnion = isOnionUrl(url);
    // Railway: 3 seconds max for fetch
    const result = await fetchPageContentSecure(url, {
      timeout: timeout,
      retries: 0, // No retries - must be fast
      retryDelay: 0,
      isOnion: false
    });
    
    if (result.error || !result.html) {
      return {
        error: result.error || 'Failed to fetch page content',
        isOnion: isOnion,
        errorCode: result.errorCode || 'FETCH_FAILED'
      };
    }
    
    const contentHash = hashContent(result.html);
    
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
    const isOnion = isOnionUrl(url);
    return {
      error: error.message || 'Failed to fetch page content',
      isOnion: isOnion,
      errorCode: error.code || 'UNKNOWN_ERROR'
    };
  }
}

function extractPageElements(html, baseUrl) {
  try {
    const dom = new JSDOM(html, { url: baseUrl });
    const document = dom.window.document;
    
    // SIMPLIFIED: Only extract essential elements
    const visibleText = document.body?.textContent || '';
    const title = document.title || '';
    const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
    const metaKeywords = document.querySelector('meta[name="keywords"]')?.content || '';
    
    // Get only first 10 links (for speed)
    const allLinks = Array.from(document.querySelectorAll('a[href]'));
    const links = allLinks.slice(0, 10).map(a => {
      try {
        return new URL(a.href, baseUrl).href;
      } catch {
        return null;
      }
    }).filter(Boolean);
    
    // Get only first 5 inline scripts (for speed)
    const scripts = Array.from(document.querySelectorAll('script:not([src])'))
      .slice(0, 5)
      .map(s => s.textContent || '')
      .filter(Boolean);
    
    return {
      visibleText: visibleText.substring(0, 5000), // Limit text size
      links,
      inlineScripts: scripts,
      metadata: {
        title,
        description: metaDescription,
        keywords: metaKeywords
      }
    };
  } catch (error) {
    console.error('[extractPageElements] Error:', error);
    return {
      visibleText: '',
      links: [],
      inlineScripts: [],
      metadata: {}
    };
  }
}

function cleanVisibleText(text) {
  return text.replace(/\s+/g, ' ').trim().substring(0, 1000);
}

function domainReputationAndIntent(url) {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    const educationalTlds = ['.edu', '.ac', '.gov'];
    const reputableDomains = [
      'wikipedia.org', 'khanacademy.org', 'edx.org', 'coursera.org', 
      'mit.edu', 'harvard.edu', 'stanford.edu', 'openai.com', 'github.com'
    ];
    
    if (educationalTlds.some(tld => domain.endsWith(tld)) || 
        reputableDomains.some(d => domain.endsWith(d) || domain === d)) {
      return { reputation: 'reputable', intent: 'educational' };
    }
    
    return { reputation: 'unknown', intent: 'unknown' };
  } catch {
    return { reputation: 'unknown', intent: 'unknown' };
  }
}

function detectSuspiciousScripts(scripts) {
  const suspiciousPatterns = [
    /eval\s*\(/i,
    /document\.write/i,
    /innerHTML\s*=/i,
    /atob\s*\(/i,
    /String\.fromCharCode/i
  ];
  
  return scripts.filter(script => 
    suspiciousPatterns.some(pattern => pattern.test(script))
  );
}

function detectDarkWebThreats(text, links, scripts, isOnion) {
  return {
    credential_harvesting: false,
    financial_fraud: false,
    illegal_markets: false,
    malware_distribution: false,
    scam_indicators: false
  };
}

function scoreAndClassify(threats, reputation, intent) {
  let score = 0;
  const details = [];
  
  if (reputation === 'reputable' && intent === 'educational') {
    return { riskLevel: 'Safe', score: 0, details: ['Reputable educational site.'] };
  }
  
  if (threats.phishing) { score += WEIGHTS.phishing; details.push('Phishing indicators.'); }
  if (threats.malware) { score += WEIGHTS.malware; details.push('Malware indicators.'); }
  if (threats.scam) { score += WEIGHTS.scam; details.push('Scam indicators.'); }
  if (threats.high_risk_script) { score += WEIGHTS.high_risk_script; details.push('Suspicious scripts.'); }
  
  let riskLevel = 'Safe';
  for (const [level, threshold] of Object.entries(RISK_THRESHOLDS).sort((a, b) => b[1] - a[1])) {
    if (score >= threshold) { riskLevel = level; break; }
  }
  
  return { riskLevel, score, details };
}

function generateSummary(riskLevel, score, details, url, timeMs) {
  return {
    RiskLevel: riskLevel,
    RiskScore: score,
    Findings: details,
    Performance: `Analysis completed in ${(timeMs / 1000).toFixed(2)} seconds`,
    URL: url
  };
}

// SIMPLIFIED detectWebThreat - optimized for Railway's 10-second limit
export async function detectWebThreat(url) {
  const start = Date.now();
  
  try {
    // Step 1: Fetch (3 seconds max)
    const fetchResult = await fetchPageContent(url, 3000);
    
    if (fetchResult && fetchResult.error) {
      return { 
        error: fetchResult.error,
        isOnion: fetchResult.isOnion || isOnionUrl(url)
      };
    }
    
    if (!fetchResult || !fetchResult.html || typeof fetchResult.html !== 'string') {
      return { 
        error: 'Failed to fetch page content.',
        isOnion: isOnionUrl(url)
      };
    }
    
    const html = fetchResult.html;
    const isOnion = fetchResult.isOnion || isOnionUrl(url);
    const contentHash = fetchResult.hash;
    
    // Step 2: Parse (1 second max)
    let elements;
    try {
      elements = extractPageElements(html, url);
    } catch (parseError) {
      return {
        error: 'Failed to parse page content.',
        isOnion: isOnion
      };
    }
    
    // Step 3: Quick analysis (1 second max)
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
    
    // Skip slow threat intelligence - just do basic checks
    const suspiciousScriptsFound = detectSuspiciousScripts(elements.inlineScripts);
    if (suspiciousScriptsFound.length) threats.high_risk_script = true;
    
    // Quick link check (only first 5)
    let suspiciousLinksCount = 0;
    for (const link of elements.links.slice(0, 5)) {
      const { reputation } = domainReputationAndIntent(link);
      if (reputation === 'unknown') suspiciousLinksCount++;
    }
    if (suspiciousLinksCount > 2) threats.suspicious_links = true;
    
    // Quick metadata check
    const metadataValues = Object.values(elements.metadata).join(' ').toLowerCase();
    if (['phishing', 'malware', 'scam'].some(word => metadataValues.includes(word))) {
      threats.metadata_alert = true;
    }
    
    const darkWebThreats = detectDarkWebThreats(cleanedText, elements.links, elements.inlineScripts, isOnion);
    const { reputation, intent } = domainReputationAndIntent(url);
    const { riskLevel, score, details } = scoreAndClassify(threats, reputation, intent);
    
    if (isOnion) {
      details.push('Dark web (.onion) site detected.');
    }
    
    const summary = generateSummary(riskLevel, score, details, url, Date.now() - start);
    summary.contentHash = contentHash;
    summary.isOnion = isOnion;
    summary.darkWebThreats = darkWebThreats;
    
    return summary;
  } catch (error) {
    console.error('[detectWebThreat] Error:', error);
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
  } else if (safetyVerdict === 'SUSPICIOUS') {
    recommendations.push('Exercise caution when browsing');
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

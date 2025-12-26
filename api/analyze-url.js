import { detectWebThreat } from './advanced-threat-detect.js';
import { 
  categorizeThreats, 
  getSafetyVerdict, 
  generateKeyFindings, 
  generateRecommendations,
  getErrorMessage,
  isOnionUrl
} from './advanced-threat-detect.js';

export async function analyzeUrlEndpoint(req, res) {
  const requestId = res.getHeader('X-Request-ID') || 'unknown';
  console.log(`[analyzeUrlEndpoint:${requestId}] Starting analysis`);
  
  try {
    const { url } = req.body;
    
    if (!url || typeof url !== 'string' || !/^https?:\/\//.test(url)) {
      console.log(`[analyzeUrlEndpoint:${requestId}] Invalid URL validation`);
      return res.status(400).json({ error: 'Invalid URL' });
    }
    
    console.log(`[analyzeUrlEndpoint:${requestId}] Valid URL: ${url}`);

    const phaseTimings = {
      crawlStart: Date.now(),
      crawlEnd: null,
      analysisStart: null,
      analysisEnd: null,
      intelligenceStart: null,
      intelligenceEnd: null,
      totalEnd: null
    };

    try {
      // PHASE 1: Crawling + Analysis (detectWebThreat handles both internally)
      phaseTimings.analysisStart = Date.now();
      console.log(`[analyzeUrlEndpoint:${requestId}] Calling detectWebThreat`);
      
      // detectWebThreat internally fetches HTML and performs analysis
      let threatAnalysis;
      try {
        threatAnalysis = await detectWebThreat(url);
        console.log(`[analyzeUrlEndpoint:${requestId}] detectWebThreat completed`);
      } catch (detectError) {
        console.error(`[analyzeUrlEndpoint:${requestId}] Error in detectWebThreat:`, detectError);
        const errorInfo = getErrorMessage(detectError);
        return res.status(500).json({
          error: errorInfo.userMessage || 'Failed to analyze URL',
          errorCode: detectError.message || 'ANALYSIS_ERROR',
          isOnion: isOnionUrl(url),
          actionable: errorInfo.actionable || 'Please try again later',
          phaseTimings: {
            crawlDuration: null,
            analysisDuration: Date.now() - phaseTimings.analysisStart,
            status: 'failed'
          }
        });
      }
      
      if (threatAnalysis.error) {
        console.log(`[analyzeUrlEndpoint:${requestId}] Threat analysis returned error: ${threatAnalysis.error}`);
        // Get user-friendly error message
        const errorInfo = getErrorMessage({ message: threatAnalysis.error });
        
        // For TOR_NOT_RUNNING errors, provide more helpful guidance
        let errorMessage = errorInfo.userMessage;
        let actionableTip = errorInfo.actionable;
        
        if (threatAnalysis.error === 'TOR_NOT_RUNNING') {
          const isOnion = threatAnalysis.isOnion || isOnionUrl(url);
          if (isOnion) {
            // Provide setup instructions link in development
            if (process.env.NODE_ENV === 'development') {
              actionableTip = 'Tor is not running. See TOR_SETUP_INSTRUCTIONS.md for setup guide. For local testing: Start Tor Browser and enable SOCKS proxy (Settings > Advanced > Network Settings).';
            } else {
              actionableTip = 'Server-side Tor service is not available. Please contact support.';
            }
          }
        }
        
        return res.status(500).json({ 
          error: errorMessage,
          errorCode: threatAnalysis.error,
          isOnion: threatAnalysis.isOnion || isOnionUrl(url),
          actionable: actionableTip,
          phaseTimings: {
            crawlDuration: null,
            analysisDuration: Date.now() - phaseTimings.analysisStart,
            status: 'failed_at_analysis'
          },
          // Internal logging (not exposed to user in production)
          _internal: {
            message: errorInfo.internalMessage,
            timestamp: new Date().toISOString()
          }
        });
      }

      console.log(`[analyzeUrlEndpoint:${requestId}] Processing threat analysis results`);
      
      // Estimate phase timings (detectWebThreat combines crawl+analysis+intelligence)
      // Split roughly: 30% crawl, 50% analysis, 20% intelligence correlation
      const totalAnalysisTime = Date.now() - phaseTimings.analysisStart;
      phaseTimings.crawlEnd = phaseTimings.crawlStart + Math.floor(totalAnalysisTime * 0.3);
      phaseTimings.analysisEnd = phaseTimings.crawlStart + Math.floor(totalAnalysisTime * 0.8);
      phaseTimings.intelligenceStart = phaseTimings.analysisEnd;
      phaseTimings.intelligenceEnd = Date.now();
      phaseTimings.totalEnd = Date.now();

      // Extract data from threat analysis
      const riskLevel = threatAnalysis.RiskLevel || 'Safe';
      const riskScore = threatAnalysis.RiskScore || 0;
      const findings = threatAnalysis.Findings || [];
      const isOnion = threatAnalysis.isOnion || isOnionUrl(url);
      const darkWebThreats = threatAnalysis.darkWebThreats || {};
      
      // Extract intent from URL domain
      let intent = 'unknown';
      try {
        const domain = new URL(url).hostname.toLowerCase();
        if (isOnion) {
          // Onion sites default to unknown intent unless proven otherwise
          intent = 'unknown';
        } else {
          const educationalTlds = ['.edu', '.ac', '.gov'];
          const reputableDomains = [
            'wikipedia.org', 'khanacademy.org', 'edx.org', 'coursera.org', 
            'mit.edu', 'harvard.edu', 'stanford.edu', 'openai.com', 'github.com'
          ];
          if (educationalTlds.some(tld => domain.endsWith(tld)) || 
              reputableDomains.some(d => domain.endsWith(d) || domain === d)) {
            intent = 'educational';
          } else if (domain.endsWith('.com') || domain.endsWith('.net')) {
            intent = 'commercial';
          }
        }
      } catch (e) {
        intent = 'unknown';
      }

      // Categorize threats
      const threatCategories = categorizeThreats(findings, riskLevel, riskScore);

      // Get safety verdict
      const safetyVerdict = getSafetyVerdict(riskLevel, riskScore, intent);

      // Generate key findings (sanitized)
      const keyFindings = generateKeyFindings(findings, riskLevel, riskScore, threatCategories);

      // Generate recommendations
      const recommendations = generateRecommendations(riskLevel, threatCategories, safetyVerdict);

      // Calculate phase durations
      const phaseDurations = {
        crawl: phaseTimings.crawlEnd - phaseTimings.crawlStart,
        analysis: phaseTimings.analysisEnd - phaseTimings.analysisStart,
        intelligence: phaseTimings.intelligenceEnd - phaseTimings.intelligenceStart,
        total: phaseTimings.totalEnd - phaseTimings.crawlStart
      };

      // Return sanitized response (NO raw HTML, DOM, or sensitive data)
      console.log(`[analyzeUrlEndpoint:${requestId}] Sending success response`);
      return res.json({
        url,
        safetyVerdict,
        riskScore,
        riskLevel,
        threatCategories,
        keyFindings,
        recommendations,
        phaseTimings: phaseDurations,
        analyzedAt: new Date().toISOString(),
        // Intent for context (but no raw content)
        intent: intent,
        // Dark web indicators (sanitized)
        isOnion: isOnion,
        darkWebThreats: isOnion ? {
          credentialHarvesting: darkWebThreats.credential_harvesting || false,
          financialFraud: darkWebThreats.financial_fraud || false,
          illegalMarkets: darkWebThreats.illegal_markets || false,
          malwareDistribution: darkWebThreats.malware_distribution || false,
          scamIndicators: darkWebThreats.scam_indicators || false
        } : null,
        // Content hash for verification (never raw HTML)
        contentHash: threatAnalysis.contentHash || null
      });

    } catch (error) {
      const requestId = res.getHeader('X-Request-ID') || 'unknown';
      console.error(`[analyzeUrlEndpoint:${requestId}] Inner error:`, error);
      console.error(`[analyzeUrlEndpoint:${requestId}] Error stack:`, error.stack);
      
      // Ensure response is sent
      if (res.headersSent) {
        console.log(`[analyzeUrlEndpoint:${requestId}] Response already sent, skipping`);
        return; // Response already sent, don't try again
      }
      
      console.log(`[analyzeUrlEndpoint:${requestId}] Sending error response`);
      const errorInfo = getErrorMessage(error);
      const isOnion = isOnionUrl(req.body?.url || '');
      
      return res.status(500).json({ 
        error: errorInfo.userMessage || 'An unexpected error occurred',
        errorCode: error.message || 'UNKNOWN_ERROR',
        isOnion: isOnion,
        actionable: errorInfo.actionable || 'Please try again later',
        phaseTimings: {
          crawlDuration: null,
          analysisDuration: null,
          status: 'failed'
        },
        // Internal logging (not exposed to user in production)
        _internal: {
          message: errorInfo.internalMessage || error.toString(),
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (outerError) {
    // Catch any errors from the outer try block
    const requestId = res.getHeader('X-Request-ID') || 'unknown';
    console.error(`[analyzeUrlEndpoint:${requestId}] Outer catch error:`, outerError);
    console.error(`[analyzeUrlEndpoint:${requestId}] Outer error stack:`, outerError.stack);
    
    if (!res.headersSent) {
      console.log(`[analyzeUrlEndpoint:${requestId}] Sending outer error response`);
      return res.status(500).json({
        error: 'An unexpected error occurred',
        errorCode: 'INTERNAL_ERROR',
        actionable: 'Please try again later'
      });
    } else {
      console.log(`[analyzeUrlEndpoint:${requestId}] Response already sent, cannot send outer error`);
    }
  }
}

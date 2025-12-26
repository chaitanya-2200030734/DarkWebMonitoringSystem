import express from 'express';
import cors from 'cors';
import { analyzeUrlEndpoint } from './analyze-url.js';

const app = express();

// CORS configuration - allow all origins by default
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : '*',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', message: 'API is working', timestamp: new Date().toISOString() });
});

// URL analysis endpoint - Railway-optimized with immediate response handling
app.post('/api/analyze-url', async (req, res) => {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  console.log(`[${requestId}] Request received at ${new Date().toISOString()}`);
  console.log(`[${requestId}] URL: ${req.body?.url || 'missing'}`);
  
  // Track response status
  let responded = false;
  
  const safeResponse = (status, data) => {
    if (!responded && !res.headersSent) {
      responded = true;
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] Sending response (${status}) after ${duration}ms`);
      try {
        res.status(status).json(data);
        console.log(`[${requestId}] Response sent successfully`);
      } catch (err) {
        console.error(`[${requestId}] Failed to send response:`, err);
      }
    } else {
      console.log(`[${requestId}] Response already sent, skipping`);
    }
  };

  // Set Railway-friendly timeout (30 seconds - Railway's typical limit)
  const RAILWAY_TIMEOUT = 30000; // 30 seconds
  res.setTimeout(RAILWAY_TIMEOUT);
  
  // Send headers immediately to keep connection alive
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Request-ID', requestId);

  try {
    // Validate input immediately
    if (!req.body?.url) {
      console.log(`[${requestId}] Validation failed: URL missing`);
      return safeResponse(400, { error: 'URL is required' });
    }

    const url = String(req.body.url).trim();
    if (!/^https?:\/\//.test(url)) {
      console.log(`[${requestId}] Validation failed: Invalid URL format`);
      return safeResponse(400, { error: 'Invalid URL format' });
    }

    console.log(`[${requestId}] Starting analysis for: ${url}`);

    // Execute analysis with Railway timeout protection
    const analysisPromise = analyzeUrlEndpoint(req, res);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => {
        console.error(`[${requestId}] Railway timeout reached (${RAILWAY_TIMEOUT}ms)`);
        reject(new Error('RAILWAY_TIMEOUT'));
      }, RAILWAY_TIMEOUT - 1000) // 1 second buffer before Railway kills it
    );
    
    try {
      await Promise.race([analysisPromise, timeoutPromise]);
      
      // Check if response was sent by analyzeUrlEndpoint
      if (!res.headersSent && !responded) {
        console.log(`[${requestId}] Analysis completed but no response sent - sending default`);
        safeResponse(200, { 
          message: 'Analysis completed',
          url: url,
          requestId: requestId
        });
      } else {
        console.log(`[${requestId}] Response already sent by analyzeUrlEndpoint`);
      }
    } catch (analysisError) {
      console.error(`[${requestId}] Analysis error:`, analysisError);
      console.error(`[${requestId}] Error stack:`, analysisError.stack);
      
      if (!responded && !res.headersSent) {
        const errorMessage = analysisError.message === 'RAILWAY_TIMEOUT'
          ? 'Analysis timed out - please try again with a simpler URL'
          : 'Failed to analyze URL';
        
        safeResponse(500, {
          error: errorMessage,
          errorCode: analysisError.message || 'ANALYSIS_ERROR',
          actionable: 'Please try again',
          requestId: requestId
        });
      }
    }
    
  } catch (outerError) {
    console.error(`[${requestId}] Outer error:`, outerError);
    console.error(`[${requestId}] Outer error stack:`, outerError.stack);
    
    if (!responded && !res.headersSent) {
      safeResponse(500, {
        error: 'An unexpected error occurred',
        errorCode: 'UNKNOWN_ERROR',
        actionable: 'Please try again later',
        requestId: requestId
      });
    }
  } finally {
    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] Request completed in ${totalDuration}ms`);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error middleware:', err);
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR'
    });
  }
});

// 404 handler for API routes
app.use('/api', (req, res) => {
  if (!res.headersSent) {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

export default app;

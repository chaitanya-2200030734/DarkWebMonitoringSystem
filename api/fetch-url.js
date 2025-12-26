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

// URL analysis endpoint - bulletproof error handling
app.post('/api/analyze-url', async (req, res) => {
  // Set timeout
  res.setTimeout(300000);
  
  // Track response status
  let responded = false;
  
  const safeResponse = (status, data) => {
    if (!responded && !res.headersSent) {
      responded = true;
      try {
        res.status(status).json(data);
      } catch (err) {
        console.error('[safeResponse] Failed to send:', err);
      }
    }
  };

  try {
    // Validate input
    if (!req.body?.url) {
      return safeResponse(400, { error: 'URL is required' });
    }

    const url = String(req.body.url).trim();
    if (!/^https?:\/\//.test(url)) {
      return safeResponse(400, { error: 'Invalid URL format' });
    }

    // Execute analysis with timeout
    try {
      await Promise.race([
        analyzeUrlEndpoint(req, res),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT')), 300000)
        )
      ]);
      
      // Check if response was sent
      if (!res.headersSent && !responded) {
        safeResponse(200, { 
          message: 'Analysis completed',
          url: url 
        });
      }
    } catch (analysisError) {
      console.error('[POST /api/analyze-url] Analysis error:', analysisError);
      if (!responded && !res.headersSent) {
        safeResponse(500, {
          error: analysisError.message === 'TIMEOUT' 
            ? 'Analysis timed out'
            : 'Failed to analyze URL',
          errorCode: analysisError.message || 'ANALYSIS_ERROR',
          actionable: 'Please try again'
        });
      }
    }
    
  } catch (outerError) {
    console.error('[POST /api/analyze-url] Outer error:', outerError);
    if (!responded && !res.headersSent) {
      safeResponse(500, {
        error: 'An unexpected error occurred',
        errorCode: 'UNKNOWN_ERROR',
        actionable: 'Please try again later'
      });
    }
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

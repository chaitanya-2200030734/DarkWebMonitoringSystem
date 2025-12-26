import express from 'express';
import cors from 'cors';
import { analyzeUrlEndpoint } from './analyze-url.js';

const app = express();

// CORS configuration - allow all origins by default
// Set ALLOWED_ORIGINS env var to restrict if needed (comma-separated)
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : '*', // Allow all origins
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

// Test endpoint to verify API is working
app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', message: 'API is working', timestamp: new Date().toISOString() });
});

// URL analysis endpoint - simplified and bulletproof
app.post('/api/analyze-url', async (req, res) => {
  // Set response timeout (Railway has limits)
  res.setTimeout(300000); // 5 minutes
  
  // Track if response was sent
  let responseSent = false;
  
  const sendResponse = (status, data) => {
    if (!responseSent && !res.headersSent) {
      responseSent = true;
      try {
        res.status(status).json(data);
      } catch (sendError) {
        console.error('[sendResponse] Error sending response:', sendError);
      }
    }
  };

  try {
    // Validate request
    if (!req.body || !req.body.url) {
      return sendResponse(400, { error: 'URL is required' });
    }

    const { url } = req.body;
    
    if (typeof url !== 'string' || !/^https?:\/\//.test(url)) {
      return sendResponse(400, { error: 'Invalid URL format' });
    }

    // Wrap analyzeUrlEndpoint to ensure it always sends a response
    try {
      await analyzeUrlEndpoint(req, res);
      // If analyzeUrlEndpoint didn't send response, send a default one
      if (!res.headersSent && !responseSent) {
        sendResponse(200, { 
          error: 'Analysis completed but no response was sent',
          url: url 
        });
      }
    } catch (endpointError) {
      console.error('[POST /api/analyze-url] Endpoint error:', endpointError);
      if (!responseSent && !res.headersSent) {
        sendResponse(500, {
          error: 'An error occurred while analyzing the URL',
          errorCode: endpointError.message || 'ENDPOINT_ERROR',
          actionable: 'Please try again later'
        });
      }
    }
    
  } catch (error) {
    console.error('[POST /api/analyze-url] Outer error:', error);
    console.error('[POST /api/analyze-url] Stack:', error.stack);
    
    if (!responseSent && !res.headersSent) {
      sendResponse(500, {
        error: 'An unexpected error occurred',
        errorCode: error.message || 'UNKNOWN_ERROR',
        actionable: 'Please try again later'
      });
    }
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR'
    });
  }
});

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

export default app;

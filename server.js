import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import app from './api/fetch-url.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'production';

// Process-level error handlers to catch unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit - let Railway handle it
});

// Serve static files from Vite build in production
if (NODE_ENV === 'production') {
  // Serve static assets
  app.use(express.static(join(__dirname, 'dist'), {
    maxAge: '1y', // Cache static assets for 1 year
    etag: true,
    lastModified: true
  }));
  
  // SPA routing: catch-all middleware for non-API routes
  // Express 5 compatible - NO wildcard '*' pattern
  app.use((req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    // Serve index.html for all other routes (SPA routing)
    res.sendFile(join(__dirname, 'dist', 'index.html'), (err) => {
      if (err) {
        console.error('Error sending index.html:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  });
}

app.listen(PORT, () => {
  console.log(`🚀 ThreatDetector Server running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${NODE_ENV}`);
  if (NODE_ENV === 'production') {
    console.log(`✅ Serving production build from /dist`);
  }
  console.log(`🔒 Tor support: Enabled (ports 9050/9150)`);
});

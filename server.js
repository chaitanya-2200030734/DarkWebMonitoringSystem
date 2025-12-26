import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import app from './api/fetch-url.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'production';

// Serve static files from Vite build in production
if (NODE_ENV === 'production') {
  // Serve static assets
  app.use(express.static(join(__dirname, 'dist'), {
    maxAge: '1y', // Cache static assets for 1 year
    etag: true,
    lastModified: true
  }));
  
  // Serve index.html for all routes (SPA routing) - must be last
  // Express 5 compatible: use catch-all middleware instead of '*'
  app.use((req, res, next) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    // Serve index.html for all other routes (SPA routing)
    res.sendFile(join(__dirname, 'dist', 'index.html'));
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

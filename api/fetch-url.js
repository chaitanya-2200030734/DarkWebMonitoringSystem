import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { JSDOM } from 'jsdom';
import { analyzeUrlEndpoint } from './analyze-url.js';

const app = express();

// CORS configuration for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || '*' 
    : '*',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

const TOR_PROXY = 'socks5h://127.0.0.1:9050';

const maliciousDomains = [
  'phishing.com', 'malware.com', 'scam.com', 'badsite.ru', 'stealer.net'
];
const reputableDomains = [
  'wikipedia.org', 'khanacademy.org', 'edx.org', 'coursera.org', 'mit.edu', 'harvard.edu', 'stanford.edu', 'openai.com', 'github.com', 'mozilla.org', 'nasa.gov', 'who.int', 'un.org', 'springer.com', 'nature.com', 'sciencedirect.com', 'britannica.com', 'nationalgeographic.com', 'bbc.co.uk', 'nytimes.com', 'theguardian.com', 'google.com', 'microsoft.com', 'apple.com', 'amazon.com', 'ibm.com', 'oracle.com', 'stackoverflow.com', 'w3schools.com', 'python.org', 'nodejs.org', 'reactjs.org', 'vuejs.org', 'angular.io', 'docker.com', 'cloudflare.com', 'archive.org', 'arxiv.org', 'scholar.google.com', 'wikimedia.org', 'wiktionary.org', 'wikibooks.org', 'wikiversity.org', 'wikinews.org', 'wikivoyage.org', 'wikidata.org', 'wikimediafoundation.org'
];
const scamKeywords = [
  'urgent', 'verify your account', 'password reset', 'click here', 'free bitcoin', 'credit card', 'bank details'
];
const educationalKeywords = [
  'tutorial', 'course', 'learn', 'education', 'university', 'research', 'study', 'academic', 'how to', 'guide', 'reference', 'wiki', 'documentation', 'textbook', 'lecture', 'school', 'edx', 'coursera', 'khan academy', 'mit', 'stanford', 'harvard', 'open source', 'knowledge', 'science', 'math', 'history', 'language', 'teacher', 'student', 'scholar', 'journal', 'article', 'library', 'encyclopedia'
];
const commercialKeywords = [
  'buy', 'shop', 'sale', 'discount', 'deal', 'order', 'cart', 'checkout', 'payment', 'subscribe', 'register', 'account', 'shipping', 'business', 'company', 'brand', 'store', 'product', 'service', 'contact', 'support', 'customer', 'price', 'invoice', 'quote', 'advertisement', 'ad', 'sponsor', 'affiliate', 'market', 'commerce', 'retail', 'wholesale', 'b2b', 'b2c', 'amazon', 'ebay', 'alibaba', 'flipkart', 'walmart'
];
const cybercrimeKeywords = [
  'hack', 'exploit', 'crack', 'leak', 'dump', 'zero-day', 'ransomware', 'malware', 'phishing', 'carding', 'botnet', 'keylogger', 'backdoor', 'rootkit', 'stolen', 'illegal', 'darkweb', 'tor', 'bitcoin', 'drugs', 'weapons', 'counterfeit', 'scam', 'fraud', 'stealer', 'breach', 'attack', 'penetration', 'xss', 'sql injection', 'ddos', 'blackhat', 'cybercrime', 'crime', 'criminal', 'anonymity', 'laundering', 'forged', 'fake id', 'fake passport', 'piracy', 'warez', 'crypter', 'carder', 'dump', 'vpn', 'proxy', 'obfuscate', 'spoof', 'phreak', 'exploit kit', 'exploit-db', 'pastebin', 'dark market', 'vendor', 'contraband', 'silk road', 'marketplace'
];

function isMaliciousLink(url) {
  if (!url) return false;
  return maliciousDomains.some(domain => url.includes(domain));
}
function isReputableDomain(url) {
  if (!url) return false;
  return reputableDomains.some(domain => url.includes(domain));
}
function isScamText(text) {
  return scamKeywords.some(keyword => text.toLowerCase().includes(keyword));
}
function getIntent(text, links, meta, url) {
  const safeText = text || '';
  const safeLinks = Array.isArray(links) ? links : [];
  const safeMeta = meta || { title: '', description: '', keywords: '' };
  const allText = [
    safeText,
    safeMeta.title || '',
    safeMeta.description || '',
    safeMeta.keywords || '',
    ...safeLinks.map(l => l.text || '')
  ].join(' ').toLowerCase();

  let scores = { educational: 0, commercial: 0, cybercrime: 0 };
  educationalKeywords.forEach(k => { if (allText.includes(k)) scores.educational++; });
  commercialKeywords.forEach(k => { if (allText.includes(k)) scores.commercial++; });
  cybercrimeKeywords.forEach(k => { if (allText.includes(k)) scores.cybercrime++; });

  // Whitelist reputable domains
  if (isReputableDomain(url)) {
    scores.educational += 10;
    scores.cybercrime = 0;
  }

  let intent = 'unknown';
  let maxScore = Math.max(scores.educational, scores.commercial, scores.cybercrime);
  if (maxScore === 0) intent = 'unknown';
  else if (scores.cybercrime === maxScore) intent = 'cybercrime';
  else if (scores.educational === maxScore) intent = 'educational';
  else if (scores.commercial === maxScore) intent = 'commercial';
  return { intent, scores };
}

app.post('/api/fetch-url', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string' || !/^https?:\/\//.test(url)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  try {
    let response, html;
    if (url.endsWith('.onion/') || url.includes('.onion/')) {
      const agent = new SocksProxyAgent(TOR_PROXY);
      response = await fetch(url, { agent, timeout: 20000 });
    } else {
      response = await fetch(url, { timeout: 10000 });
    }
    html = await response.text();

    // Parse HTML
    const dom = new JSDOM(html);
    const { document } = dom.window;

    // Extract metadata
    const title = document.querySelector('title')?.textContent || '';
    const description = document.querySelector('meta[name="description"]')?.content || '';
    const keywords = document.querySelector('meta[name="keywords"]')?.content || '';
    const meta = { title, description, keywords };

    // Extract visible text (remove markup)
    let bodyText = document.body.textContent || '';
    bodyText = bodyText.replace(/\s+/g, ' ').replace(/[\x00-\x1F\x7F]+/g, ' ').trim();

    // Extract links
    const links = Array.from(document.querySelectorAll('a')).map(a => ({
      href: a.href,
      text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
      malicious: isMaliciousLink(a.href),
      reputable: isReputableDomain(a.href)
    }));

    // Extract images/videos
    const images = Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.src,
      alt: (img.alt || '').replace(/\s+/g, ' ').trim(),
      suspicious: isMaliciousLink(img.src),
      reputable: isReputableDomain(img.src)
    }));
    const videos = Array.from(document.querySelectorAll('video')).map(video => ({
      src: video.src,
      suspicious: isMaliciousLink(video.src),
      reputable: isReputableDomain(video.src)
    }));

    // Threat detection - expanded
    const flaggedLinks = links.filter(l => l.malicious && !l.reputable);
    const flaggedImages = images.filter(i => i.suspicious && !i.reputable);
    const flaggedVideos = videos.filter(v => v.suspicious && !v.reputable);
    const scamTextFound = isScamText(bodyText);

    // Scan for suspicious file types and keywords in links
    const suspiciousFileTypes = ['.exe', '.scr', '.zip', '.rar', '.7z', '.bat', '.js', '.jar', '.onion', '.php', '.asp', '.aspx', '.cgi'];
    const flaggedFileLinks = links.filter(l => suspiciousFileTypes.some(ext => l.href.toLowerCase().endsWith(ext)));

    // Scan meta tags and scripts for threat keywords
    const scripts = Array.from(document.querySelectorAll('script')).map(s => s.textContent || '').join(' ');
    const metaText = [title, description, keywords].join(' ');
    const allText = [bodyText, metaText, scripts].join(' ').toLowerCase();
    const foundThreatKeywords = cybercrimeKeywords.filter(k => allText.includes(k));

    let threats = [];
    if (isReputableDomain(url) && !flaggedLinks.length && !flaggedImages.length && !flaggedVideos.length && !scamTextFound && !flaggedFileLinks.length && foundThreatKeywords.length === 0) {
      threats.push('This is a reputable/educational site. No threats detected.');
    } else {
      if (flaggedLinks.length) threats.push('Malicious links detected');
      if (flaggedImages.length) threats.push('Suspicious images detected');
      if (flaggedVideos.length) threats.push('Suspicious videos detected');
      if (scamTextFound) threats.push('Scam keywords found in page text');
      if (flaggedFileLinks.length) threats.push('Suspicious file links detected');
      if (foundThreatKeywords.length) threats.push('Threat keywords found: ' + foundThreatKeywords.join(', '));
      if (!threats.length) threats.push('No obvious threats detected');
    }

    // Intent detection
    let intentResult = getIntent(bodyText, links, meta, url);
    // If any threat is detected (except 'No obvious threats detected'), set intent to 'cybercrime'
    if (threats.length > 0 && !threats[0].includes('No threats detected') && !threats[0].includes('No obvious threats detected')) {
      intentResult.intent = 'cybercrime';
    }

    res.json({
      meta,
      textContent: bodyText,
      links,
      images,
      videos,
      threats,
      intent: intentResult.intent,
      intentScores: intentResult.scores
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch or analyze content' });
  }
});

// New secure URL analysis endpoint
app.post('/api/analyze-url', analyzeUrlEndpoint);

// Error handling middleware - must be last
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    errorCode: err.code || 'INTERNAL_ERROR'
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

export default app;
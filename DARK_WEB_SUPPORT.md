# Dark Web (.onion) Support Implementation

## Overview

The ThreatDetector application now fully supports scanning dark web (.onion) URLs through the Tor network with enhanced security, error handling, and threat detection.

## Features Implemented

### 1. Tor-Based Fetching ✅
- **Automatic Detection**: Automatically detects `.onion` URLs and routes through Tor
- **Dual Port Support**: Tries both common Tor ports (9050 for Tor daemon, 9150 for Tor Browser)
- **Retry Logic**: Implements 3 retry attempts with exponential backoff for slow onion services
- **Extended Timeouts**: 30-second timeout for onion services (vs 10s for surface web)
- **Connection Testing**: Validates Tor connection before attempting fetch

### 2. Secure Data Handling ✅
- **Content Hashing**: All crawled HTML is hashed using SHA-256 before storage
- **No Raw Data Exposure**: Raw HTML/DOM is never exposed to users or stored
- **In-Memory Only**: Content is processed in-memory and immediately discarded after analysis
- **Hash Verification**: Content hash is included in results for verification

### 3. Enhanced Threat Analysis ✅
- **Dark Web Specific Detection**:
  - Credential harvesting patterns
  - Financial fraud indicators (cryptocurrency, wallets)
  - Illegal marketplace detection
  - Malware distribution patterns
  - Scam language detection
- **Combined Scoring**: Dark web threats are integrated into overall risk scoring
- **Category Breakdown**: Separate dark web threat categories displayed

### 4. Improved Error Handling ✅
- **Specific Error Messages**:
  - `TOR_NOT_RUNNING`: Tor service not available
  - `TOR_CONNECTION_FAILED`: Cannot connect through Tor
  - `TIMEOUT_EXCEEDED`: Request timed out
  - `ACCESS_RESTRICTED`: HTTP 403/401 errors
  - `FETCH_FAILED`: General fetch failure
- **User-Friendly Messages**: Clear, actionable error messages
- **Internal Logging**: Detailed internal logs (not exposed to users)

### 5. UX Enhancements ✅
- **Dark Web Indicator**: Visual badge showing `.onion` site detection
- **Extended Loading States**: Longer phase indicators for dark web scans
- **Dark Web Threat Section**: Dedicated section for dark web specific threats
- **Error Tips**: Helpful tips when Tor-related errors occur

## Technical Implementation

### Files Created/Modified

1. **`project/api/tor-crawler.js`** (NEW)
   - Tor proxy detection and connection testing
   - Secure content fetching with retry logic
   - Content hashing functions
   - Error message translation

2. **`project/api/advanced-threat-detect.js`** (MODIFIED)
   - Updated `fetchPageContent()` to use Tor crawler
   - Added dark web threat detection
   - Enhanced threat categorization

3. **`project/api/analyze-url.js`** (MODIFIED)
   - Improved error handling with specific messages
   - Dark web threat data in response
   - Content hash inclusion

4. **`project/src/components/UrlScanResults.tsx`** (MODIFIED)
   - Dark web indicator badge
   - Dark web threat breakdown section
   - Enhanced UI for .onion sites

5. **`project/src/components/HomePage.tsx`** (MODIFIED)
   - Updated placeholder text for .onion URLs
   - Enhanced error display with Tor tips

6. **`project/src/App.tsx`** (MODIFIED)
   - Extended loading delays for dark web scans
   - Better error message handling

## Usage

### Prerequisites

1. **Tor Browser** or **Tor Daemon** must be running
   - Tor Browser: Automatically runs on port 9150
   - Tor Daemon: Runs on port 9050

### Scanning Dark Web URLs

1. Start Tor Browser or ensure Tor daemon is running
2. Enter a `.onion` URL in the scan field (e.g., `http://example.onion`)
3. Click "Scan URL"
4. Wait for analysis (may take longer than surface web)
5. View results with dark web specific threat indicators

### Error Handling

If Tor is not running, you'll see:
- **Error**: "Tor service is not running. Please start Tor Browser or Tor daemon."
- **Actionable**: "Start Tor Browser or install and start Tor daemon"

If onion service is unavailable:
- **Error**: "Unable to connect through Tor network. The onion service may be unavailable."
- **Actionable**: "Verify Tor is running and onion service is accessible"

## Security Features

✅ **No Raw HTML Exposure**: Users never see raw crawled content
✅ **Content Hashing**: All content is hashed before any storage
✅ **Secure Processing**: Content processed in-memory only
✅ **Sandboxed Analysis**: All analysis happens server-side
✅ **Error Sanitization**: Internal errors are sanitized before user display

## Testing

### Surface Web URLs
- ✅ Works as before
- ✅ No performance degradation
- ✅ Same security guarantees

### Dark Web URLs
- ✅ Automatic Tor routing
- ✅ Extended timeouts
- ✅ Retry logic
- ✅ Dark web threat detection
- ✅ Enhanced error messages

## API Response Format

```json
{
  "url": "http://example.onion",
  "safetyVerdict": "SUSPICIOUS",
  "riskScore": 15,
  "isOnion": true,
  "darkWebThreats": {
    "credentialHarvesting": false,
    "financialFraud": true,
    "illegalMarkets": true,
    "malwareDistribution": false,
    "scamIndicators": true
  },
  "contentHash": "sha256_hash_here",
  "threatCategories": { ... },
  "keyFindings": [ ... ],
  "recommendations": [ ... ]
}
```

## Error Response Format

```json
{
  "error": "User-friendly error message",
  "errorCode": "TOR_NOT_RUNNING",
  "isOnion": true,
  "actionable": "Action user can take",
  "_internal": {
    "message": "Detailed internal message",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Notes

- Dark web scans take longer (30s timeout vs 10s)
- Tor must be running before scanning .onion URLs
- Content is never stored or exposed to users
- All analysis happens server-side for security


/* ============================================================
   Marketing Command Center — api.js
   Centralised fetch wrapper.
   All module JS files call MCC_API.post() — never raw fetch().
   Responsibilities:
     • Base URL configuration
     • JSON serialisation / deserialisation
     • Unified error normalisation
     • Request timeout via AbortSignal
     • Retry logic (1 automatic retry on network failure)
     • Exposes MCC_API_BASE on window for app.js health check
   ============================================================ */

'use strict';

// ── Configuration ─────────────────────────────────────────────
const API_BASE    = 'https://marketing-command-center-api.onrender.com/api';
const API_TIMEOUT = 10_000;   // 10 s per request
const MAX_RETRIES = 1;        // retry once on network error

// Expose base so app.js health check can reference root
window.MCC_API_BASE = 'https://marketing-command-center-api.onrender.com';

// ── Internal: single fetch attempt ───────────────────────────
async function _fetchOnce(endpoint, body, signal) {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    signal,
  });

  // Try to parse JSON regardless of status (FastAPI error bodies are JSON)
  let data;
  try {
    data = await response.json();
  } catch {
    throw new APIError('Server returned a non-JSON response.', response.status);
  }

  if (!response.ok) {
    // FastAPI validation errors have a `detail` array or string
    const detail = normaliseDetail(data.detail);
    throw new APIError(detail, response.status);
  }

  return data;
}

// ── Normalise FastAPI `detail` field ─────────────────────────
function normaliseDetail(detail) {
  if (!detail) return 'An unknown server error occurred.';
  if (typeof detail === 'string') return detail;

  // Pydantic v2 validation errors: array of { loc, msg, type }
  if (Array.isArray(detail)) {
    return detail
      .map(err => {
        const field = err.loc ? err.loc.slice(1).join(' → ') : 'input';
        return `${field}: ${err.msg}`;
      })
      .join('\n');
  }

  return JSON.stringify(detail);
}

// ── Custom error class ────────────────────────────────────────
class APIError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name   = 'APIError';
    this.status = status;
  }
}

// ── Public: POST with retry & timeout ────────────────────────
/**
 * Send a POST request to the FastAPI backend.
 *
 * @param {string} endpoint   - Path after /api, e.g. '/paid-media/roas'
 * @param {Object} body       - Plain object; will be JSON-serialised
 * @param {number} [retries]  - Remaining retry attempts (internal use)
 * @returns {Promise<Object>} - Parsed response body
 * @throws {APIError}         - Normalised error with .message and .status
 */
async function post(endpoint, body, retries = MAX_RETRIES) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const data = await _fetchOnce(endpoint, body, controller.signal);
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new APIError('Request timed out. Is the backend server running?', 0);
    }

    // Network failure (fetch itself threw) — retry once
    if (!(err instanceof APIError) && retries > 0) {
      console.warn(`[MCC API] Network error on ${endpoint}, retrying…`, err.message);
      return post(endpoint, body, retries - 1);
    }

    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Convenience: map module + action to endpoint ──────────────
const ENDPOINTS = {
  // Paid Media
  roas:              '/paid-media/roas',
  cpc:               '/paid-media/cpc',
  cpm:               '/paid-media/cpm',
  ctr:               '/paid-media/ctr',
  // Customer Economics
  cac:               '/customer-economics/cac',
  ltv:               '/customer-economics/ltv',
  ltvCacRatio:       '/customer-economics/ltv-cac-ratio',
  // Conversion
  conversionRate:    '/conversion/conversion-rate',
  cartAbandonment:   '/conversion/cart-abandonment',
  // Forecasting
  breakEven:         '/forecasting/break-even',
  adSpendForecast:   '/forecasting/ad-spend-forecast',
};

/**
 * Named API call — preferred over raw post() in module files.
 * @param {keyof ENDPOINTS} key
 * @param {Object} body
 */
async function call(key, body) {
  const endpoint = ENDPOINTS[key];
  if (!endpoint) throw new APIError(`Unknown API key: "${key}"`);
  return post(endpoint, body);
}

// ── Expose globally ───────────────────────────────────────────
window.MCC_API = { post, call, APIError };
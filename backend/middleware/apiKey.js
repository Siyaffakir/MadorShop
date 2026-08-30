// middleware/apiKey.js — shared-secret gate between the storefront frontend and this API
const crypto = require('crypto');

function getApiKey() {
  const key = process.env.API_KEY || 'a821978df0fa07cd5574ffbfd43fccd8a23094ccb56bbf2e8f31d101de2a27a2';
  if (!key || key.length < 16) {
    return null;
  }
  return key;
}

function requireApiKey(req, res, next) {
  const currentKey = getApiKey();
  if (!currentKey) {
    console.error('[Configuration Error] API_KEY is missing or shorter than 16 characters in environment variables.');
    return res.status(500).json({
      error: 'Server configuration error: API_KEY is missing or too short. Please configure API_KEY in your environment variables.',
    });
  }

  const provided = req.headers['x-api-key'];
  if (!provided) {
    return res.status(401).json({ error: 'Unauthorized: API key required' });
  }

  const keyBuffer = Buffer.from(currentKey);
  const providedBuffer = Buffer.from(String(provided));
  const isValid =
    providedBuffer.length === keyBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, keyBuffer);

  if (!isValid) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }

  next();
}

module.exports = { requireApiKey, getApiKey };


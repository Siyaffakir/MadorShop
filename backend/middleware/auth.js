// middleware/auth.js — JWT authentication & authorization middleware
const jwt = require('jsonwebtoken');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || '4704f42f049305a64f45868a1da82ed286273346ae341581a070e9fe36fe85355ff38aea339175baf593074c74dbba17';
  if (!secret || secret.length < 32) {
    return null;
  }
  return secret;
}

function requireAuth(req, res, next) {
  const secret = getJwtSecret();
  if (!secret) {
    console.error('[Configuration Error] JWT_SECRET is missing or shorter than 32 characters in environment variables.');
    return res.status(500).json({
      error: 'Server configuration error: JWT_SECRET is missing or too short. Please configure JWT_SECRET in your environment variables.',
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Authentication token required' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Token missing from request' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
}

/**
 * Verifies a Bearer token if one is present, but never rejects the request — used on
 * public endpoints that expose extra (admin-only) fields when the caller happens to be
 * an authenticated admin, e.g. product cost/margin data on the product listing endpoint.
 */
function optionalAuth(req, res, next) {
  const secret = getJwtSecret();
  if (!secret) {
    req.user = null;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = token ? jwt.verify(token, secret) : null;
  } catch (err) {
    req.user = null;
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  getJwtSecret,
  get JWT_SECRET() {
    return process.env.JWT_SECRET;
  },
};


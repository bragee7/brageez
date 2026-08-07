const jwt = require('jsonwebtoken');
const config = require('../config');

const JWT_SECRET = config.jwt.secret;

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    console.error('[AUTH] 401: no Authorization header present');
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  
  if (!token) {
    console.error('[AUTH] 401: empty token in Authorization header');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error(`[AUTH] 401: invalid token -> ${error.message}`);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Token invalid, continue without user
    }
  }
  
  next();
};

module.exports = { authMiddleware, optionalAuth, JWT_SECRET };
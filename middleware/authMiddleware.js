const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];

  if (!token || token === "undefined" || token === "null") {
    return res.status(401).json({ error: 'Token is missing or invalid' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("JWT Verification Error:", err.message);
      console.log("Token:", token); // Log the token for debugging
      console.log("Current time:", new Date()); // Log current time

      if (err.name === 'TokenExpiredError') {
        console.log("Token expired at:", err.expiredAt); // Log expiration time
        return res.status(401).json({ error: 'Token expired. Please log in again.' });
      }
      return res.status(401).json({ error: 'Invalid token. Please log in again.' });
    }

    if (!decoded.policyholderId) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    req.policyholder = {
      id: decoded.policyholderId,
      role: decoded.role
    };
    next();
  });
};

module.exports = authenticateToken;
// authMiddleware.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization; // Expect "Bearer <token>"
  if (!authHeader) {
    return res.status(401).json({ error: 'Access token is missing' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2) {
    return res.status(401).json({ error: 'Token error: Invalid authorization header format' });
  }

  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ error: 'Token error: Malformatted token' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Debug: log the decoded token
    console.log("Decoded token:", decoded);
    
    // Use the `userId` property from the token for consistency
    req.user = { id: decoded.userId, role: decoded.role };
    next();
  });
};

module.exports = authMiddleware;

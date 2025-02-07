const jwt = require('jsonwebtoken');

module.exports = {
  generateValidToken: (policyholderId) => jwt.sign(
    { policyholderId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  ),
  
  generateExpiredToken: (policyholderId) => jwt.sign(
    { policyholderId, exp: Math.floor(Date.now() / 1000) - 300 }, // Expired 5 mins ago
    process.env.JWT_SECRET
  )
}; 
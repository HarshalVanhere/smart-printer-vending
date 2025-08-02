const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Mock user DB
const users = { 'user@example.com': { email: 'user@example.com', name: 'Demo User' } };

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// POST /login (send OTP, mocked)
router.post('/login', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  if (!email.includes('@')) return res.status(400).json({ error: 'Invalid email' });
  
  users[email] = { email, name: email.split('@')[0] };
  res.json({ success: true, message: 'OTP sent (mocked)' });
});

// POST /verify (verify OTP, mocked)
router.post('/verify', (req, res) => {
  const { email, otp } = req.body;
  if (!users[email]) return res.status(400).json({ error: 'User not found' });
  
  // Mock OTP verification (accept any 6-digit number)
  if (!otp || otp.length !== 6) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }
  
  // Generate proper JWT token
  const token = jwt.sign(
    { email: users[email].email, name: users[email].name },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
  
  res.json({ token, user: users[email] });
});

// GET /me (now properly uses JWT)
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;
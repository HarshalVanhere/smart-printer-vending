const express = require('express');
const router = express.Router();

// Mock user DB
const users = { 'user@example.com': { email: 'user@example.com', name: 'Demo User' } };

// POST /login (send OTP, mocked)
router.post('/login', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  // In real system, send OTP here
  users[email] = { email, name: email.split('@')[0] };
  res.json({ success: true, message: 'OTP sent (mocked)' });
});

// POST /verify (verify OTP, mocked)
router.post('/verify', (req, res) => {
  const { email, otp } = req.body;
  if (!users[email]) return res.status(400).json({ error: 'User not found' });
  // In real system, verify OTP
  // Return a mock token
  res.json({ token: 'mock-token', user: users[email] });
});

// GET /me (mocked)
router.get('/me', (req, res) => {
  // In real system, decode JWT
  res.json({ user: users['user@example.com'] });
});

module.exports = router; 
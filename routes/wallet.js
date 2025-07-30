const express = require('express');
const router = express.Router();

// In-memory wallet (mock)
const wallets = { 'user@example.com': 100 };

// GET /balance?email=...
router.get('/balance', (req, res) => {
  const { email } = req.query;
  res.json({ balance: wallets[email] || 0 });
});

// POST /deduct { email, amount }
router.post('/deduct', (req, res) => {
  const { email, amount } = req.body;
  if ((wallets[email] || 0) >= amount) {
    wallets[email] -= amount;
    res.json({ success: true, balance: wallets[email] });
  } else {
    res.json({ success: false, balance: wallets[email] || 0 });
  }
});

module.exports = router;
module.exports.wallets = wallets; 
const express = require('express');
const router = express.Router();

// Mock printers and jobs (in-memory)
const printers = [
  { id: 'printer3', status: 'online' },
  { id: 'printer4', status: 'offline' }
];
const jobs = require('./print').jobs || {};
const wallets = require('./wallet').wallets || {};

// GET /printers
router.get('/printers', (req, res) => {
  res.json({ printers });
});

// GET /jobs
router.get('/jobs', (req, res) => {
  res.json({ jobs });
});

// POST /wallet/adjust { email, amount }
router.post('/wallet/adjust', (req, res) => {
  const { email, amount } = req.body;
  if (!wallets[email]) wallets[email] = 0;
  wallets[email] += amount;
  res.json({ success: true, balance: wallets[email] });
});

module.exports = router; 
const express = require('express');
const { authenticateToken } = require('./auth');
const router = express.Router();

// In-memory wallet (mock) - in production, use database with transactions
// Using PRN as key instead of email
const wallets = { 
  '123456789': 100,
  '987654321': 50,
  '111222333': 75
};
const walletLocks = {}; // Simple lock mechanism

// Helper function to safely modify wallet balance
const modifyWallet = async (prn, amount, operation) => {
  return new Promise((resolve) => {
    // Simple lock mechanism to prevent race conditions
    if (walletLocks[prn]) {
      setTimeout(() => modifyWallet(prn, amount, operation).then(resolve), 10);
      return;
    }
    
    walletLocks[prn] = true;
    
    try {
      if (!wallets[prn]) wallets[prn] = 0;
      
      if (operation === 'deduct') {
        if (wallets[prn] >= amount) {
          wallets[prn] -= amount;
          resolve({ success: true, balance: wallets[prn] });
        } else {
          resolve({ success: false, balance: wallets[prn], error: 'Insufficient funds' });
        }
      } else if (operation === 'add') {
        wallets[prn] += amount;
        resolve({ success: true, balance: wallets[prn] });
      }
    } finally {
      delete walletLocks[prn];
    }
  });
};

// GET /balance - Get authenticated user's balance
router.get('/balance', authenticateToken, (req, res) => {
  try {
    const prn = req.user.prn;
    const balance = wallets[prn] || 0;
    res.json({ balance });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /deduct - Deduct from authenticated user's wallet
router.post('/deduct', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const prn = req.user.prn;
    
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    if (amount > 1000) {
      return res.status(400).json({ error: 'Amount too large' });
    }
    
    const result = await modifyWallet(prn, amount, 'deduct');
    
    if (result.success) {
      res.json({ success: true, balance: result.balance });
    } else {
      res.status(400).json({ 
        success: false, 
        balance: result.balance, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('Error deducting from wallet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /add - Add to authenticated user's wallet
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const prn = req.user.prn;
    
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    if (amount > 10000) {
      return res.status(400).json({ error: 'Amount too large' });
    }
    
    const result = await modifyWallet(prn, amount, 'add');
    res.json({ success: true, balance: result.balance });
  } catch (error) {
    console.error('Error adding to wallet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /transactions - Get transaction history (mock)
router.get('/transactions', authenticateToken, (req, res) => {
  try {
    const prn = req.user.prn;
    // In production, fetch from database
    const mockTransactions = [
      {
        id: '1',
        type: 'credit',
        amount: 100,
        description: 'Initial balance',
        timestamp: new Date().toISOString(),
        prn: prn
      }
    ];
    
    res.json({ transactions: mockTransactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
module.exports.wallets = wallets;
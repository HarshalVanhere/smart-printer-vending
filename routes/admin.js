const express = require('express');
const { authenticateToken } = require('./auth');
const router = express.Router();

// Mock admin users - in production, store in database
const adminUsers = ['admin@example.com'];

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  if (!adminUsers.includes(req.user.email)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Mock printers data
const printers = [
  { id: 'printer1', status: 'online', location: 'Library Floor 1', lastSeen: new Date().toISOString() },
  { id: 'printer2', status: 'offline', location: 'Library Floor 2', lastSeen: new Date(Date.now() - 3600000).toISOString() }
];

// Import jobs and wallets
let jobs = {};
let wallets = {};

try {
  jobs = require('./print').jobs || {};
  wallets = require('./wallet').wallets || {};
} catch (error) {
  console.log('Could not import jobs/wallets, using empty objects');
}

// GET /printers - Get all printers
router.get('/printers', authenticateToken, authenticateAdmin, (req, res) => {
  try {
    res.json({ printers });
  } catch (error) {
    console.error('Error fetching printers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /printer-status - Update printer status (changed route name)
router.post('/printer-status', authenticateToken, authenticateAdmin, (req, res) => {
  try {
    const { printerId, status } = req.body;
    
    if (!printerId || !status) {
      return res.status(400).json({ error: 'printerId and status are required' });
    }
    
    const validStatuses = ['online', 'offline', 'maintenance', 'error'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const printer = printers.find(p => p.id === printerId);
    if (!printer) {
      return res.status(404).json({ error: 'Printer not found' });
    }
    
    printer.status = status;
    printer.lastSeen = new Date().toISOString();
    
    res.json({ success: true, printer });
  } catch (error) {
    console.error('Error updating printer status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /jobs - Get all jobs
router.get('/jobs', authenticateToken, authenticateAdmin, (req, res) => {
  try {
    const allJobs = Object.entries(jobs).map(([jobId, job]) => ({
      jobId,
      ...job
    }));
    
    res.json({ jobs: allJobs });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /users - Get all users
router.get('/users', authenticateToken, authenticateAdmin, (req, res) => {
  try {
    const users = Object.entries(wallets).map(([email, balance]) => ({
      email,
      balance
    }));
    
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /wallet-adjust - Adjust user wallet (changed route name)
router.post('/wallet-adjust', authenticateToken, authenticateAdmin, (req, res) => {
  try {
    const { email, amount } = req.body;
    
    if (!email || typeof amount !== 'number') {
      return res.status(400).json({ error: 'Email and amount are required' });
    }
    
    if (!wallets[email]) wallets[email] = 0;
    wallets[email] += amount;
    
    res.json({ 
      success: true, 
      balance: wallets[email] 
    });
  } catch (error) {
    console.error('Error adjusting wallet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /stats - Get system statistics
router.get('/stats', authenticateToken, authenticateAdmin, (req, res) => {
  try {
    const totalJobs = Object.keys(jobs).length;
    const totalUsers = Object.keys(wallets).length;
    const onlinePrinters = printers.filter(p => p.status === 'online').length;
    
    res.json({
      totalJobs,
      totalUsers,
      onlinePrinters,
      totalPrinters: printers.length
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Mock user DB with PRN as key and hashed password
// Initial password is the PRN number itself. Let's assume some PRNs and pre-hash them.
// For a real app, you'd generate this dynamically or have a secure way to set initial passwords.
const salt = bcrypt.genSaltSync(10);
const users = {
  '123456789': {
    prn: '123456789',
    name: 'Student One',
    password: bcrypt.hashSync('123456789', salt),
  },
  '987654321': {
    prn: '987654321',
    name: 'Student Two',
    password: bcrypt.hashSync('987654321', salt),
  },
};

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

// POST /login with PRN and password
router.post('/login', (req, res) => {
  const { prn, password } = req.body;
  if (!prn || !password) {
    return res.status(400).json({ error: 'PRN and password are required' });
  }

  const user = users[prn];
  if (!user) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  bcrypt.compare(password, user.password, (err, isMatch) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { prn: user.prn, name: user.name },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ token, user: { prn: user.prn, name: user.name } });
  });
});

// POST /change-password
router.post('/change-password', authenticateToken, (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const { prn } = req.user;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Old and new passwords are required' });
    }

    const user = users[prn];
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    bcrypt.compare(oldPassword, user.password, (err, isMatch) => {
        if (err) {
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid old password' });
        }

        const newSalt = bcrypt.genSaltSync(10);
        users[prn].password = bcrypt.hashSync(newPassword, newSalt);

        res.json({ success: true, message: 'Password changed successfully' });
    });
});


// GET /me (now properly uses JWT)
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;
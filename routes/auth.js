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
    email: '123456789@college.edu', // Auto-generated email format
    password: bcrypt.hashSync('123456789', salt),
  },
  '987654321': {
    prn: '987654321',
    name: 'Student Two', 
    email: '987654321@college.edu',
    password: bcrypt.hashSync('987654321', salt),
  },
  '111222333': {
    prn: '111222333',
    name: 'Student Three',
    email: '111222333@college.edu',
    password: bcrypt.hashSync('111222333', salt),
  },
  // Add more PRNs as needed
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
  try {
    const { prn, password } = req.body;
    
    console.log('Login attempt:', { prn }); // Debug log
    
    if (!prn || !password) {
      return res.status(400).json({ error: 'PRN and password are required' });
    }

    const user = users[prn];
    if (!user) {
      console.log('User not found:', prn); // Debug log
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error('Bcrypt error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (!isMatch) {
        console.log('Password mismatch for PRN:', prn); // Debug log
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          prn: user.prn, 
          name: user.name,
          email: user.email 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      console.log('Login successful for PRN:', prn); // Debug log
      
      res.json({ 
        token, 
        user: { 
          prn: user.prn, 
          name: user.name,
          email: user.email
        } 
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /change-password
router.post('/change-password', authenticateToken, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const { prn } = req.user;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Old and new passwords are required' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const user = users[prn];
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    bcrypt.compare(oldPassword, user.password, (err, isMatch) => {
        if (err) {
            console.error('Bcrypt error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid old password' });
        }

        const newSalt = bcrypt.genSaltSync(10);
        users[prn].password = bcrypt.hashSync(newPassword, newSalt);

        res.json({ success: true, message: 'Password changed successfully' });
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /me (get current user info)
router.get('/me', authenticateToken, (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /register-prn (Admin only - to add new PRNs)
router.post('/register-prn', authenticateToken, (req, res) => {
  try {
    const { prn, name } = req.body;
    
    // Simple admin check - you can make this more sophisticated
    const adminPRNs = ['123456789']; // Add admin PRNs here
    if (!adminPRNs.includes(req.user.prn)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    if (!prn || !name) {
      return res.status(400).json({ error: 'PRN and name are required' });
    }
    
    if (users[prn]) {
      return res.status(400).json({ error: 'PRN already exists' });
    }
    
    const salt = bcrypt.genSaltSync(10);
    users[prn] = {
      prn: prn,
      name: name,
      email: `${prn}@college.edu`,
      password: bcrypt.hashSync(prn, salt), // Initial password is PRN
    };
    
    res.json({ 
      success: true, 
      message: 'PRN registered successfully',
      user: {
        prn: prn,
        name: name,
        email: `${prn}@college.edu`
      }
    });
  } catch (error) {
    console.error('Register PRN error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /users (Admin only - to list all users)
router.get('/users', authenticateToken, (req, res) => {
  try {
    // Simple admin check
    const adminPRNs = ['123456789'];
    if (!adminPRNs.includes(req.user.prn)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const userList = Object.values(users).map(user => ({
      prn: user.prn,
      name: user.name,
      email: user.email
    }));
    
    res.json({ users: userList });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;
module.exports.users = users; // Export for other modules to access
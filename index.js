require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

console.log('Starting server setup...');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

console.log('Basic middleware loaded...');

// Health check
app.get('/', (req, res) => res.json({ 
  message: 'Smart Printer Backend Running',
  timestamp: new Date().toISOString()
}));

console.log('Health check route added...');

// Add routes one by one and see which one breaks
try {
  console.log('Loading auth routes...');
  app.use('/api/auth', require('./routes/auth'));
  console.log('✅ Auth routes loaded in Express');
} catch (error) {
  console.error('❌ Error loading auth routes in Express:', error.message);
  process.exit(1);
}

try {
  console.log('Loading upload routes...');
  app.use('/api/upload', require('./routes/upload'));
  console.log('✅ Upload routes loaded in Express');
} catch (error) {
  console.error('❌ Error loading upload routes in Express:', error.message);
  process.exit(1);
}

try {
  console.log('Loading wallet routes...');
  app.use('/api/wallet', require('./routes/wallet'));
  console.log('✅ Wallet routes loaded in Express');
} catch (error) {
  console.error('❌ Error loading wallet routes in Express:', error.message);
  process.exit(1);
}

try {
  console.log('Loading print routes...');
  app.use('/api/print', require('./routes/print'));
  console.log('✅ Print routes loaded in Express');
} catch (error) {
  console.error('❌ Error loading print routes in Express:', error.message);
  process.exit(1);
}

try {
  console.log('Loading admin routes...');
  app.use('/api/admin', require('./routes/admin'));
  console.log('✅ Admin routes loaded in Express');
} catch (error) {
  console.error('❌ Error loading admin routes in Express:', error.message);
  process.exit(1);
}

console.log('All routes loaded successfully, starting server...');

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log('Server started successfully!');
});
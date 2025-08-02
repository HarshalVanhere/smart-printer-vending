// test-routes.js - Test each route file individually
console.log('Testing route files...');

try {
  console.log('Testing auth routes...');
  require('./routes/auth');
  console.log('✅ Auth routes OK');
} catch (error) {
  console.error('❌ Auth routes failed:', error.message);
}

try {
  console.log('Testing upload routes...');
  require('./routes/upload');
  console.log('✅ Upload routes OK');
} catch (error) {
  console.error('❌ Upload routes failed:', error.message);
}

try {
  console.log('Testing wallet routes...');
  require('./routes/wallet');
  console.log('✅ Wallet routes OK');
} catch (error) {
  console.error('❌ Wallet routes failed:', error.message);
}

try {
  console.log('Testing print routes...');
  require('./routes/print');
  console.log('✅ Print routes OK');
} catch (error) {
  console.error('❌ Print routes failed:', error.message);
}

try {
  console.log('Testing admin routes...');
  require('./routes/admin');
  console.log('✅ Admin routes OK');
} catch (error) {
  console.error('❌ Admin routes failed:', error.message);
}

console.log('Route testing complete');
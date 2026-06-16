const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://[::1]:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://[::1]:3000',
  'https://krishantransports.netlify.app',
  'https://krishan-transport-frontend.vercel.app',
  'https://raxwo-rent-a-car.netlify.app',
    'https://maggi-tool-rentals.netlify.app',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Log origin for final fix
    if (origin) console.log('DEBUG: Incoming Request from Origin:', origin);
    
    // In development, we allow all to unblock login issues
    return callback(null, true);
  },
  credentials: true
}));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database Connection
const dbUri = process.env.MONGODB_URI;
const dbName = dbUri ? dbUri.split('/').pop().split('?')[0] : 'unknown';

if (!dbUri) {
  console.error("⚠️ MONGODB_URI is not set!");
} else {
  mongoose.connect(dbUri)
    .then(() => {
      console.log(`✅ MongoDB Connected to database: ${dbName}`);
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
}

// Routes
app.use('/api/accessories', require('./routes/accessories'));
app.use('/api/consumables', require('./routes/consumables'));
app.use('/api/hires', require('./routes/hires'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/salaries', require('./routes/salaries'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/tools', require('./routes/tools'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/quotations', require('./routes/quotations'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/advances', require('./routes/advances'));
app.use('/api/extra-income', require('./routes/extraIncome'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/cheques', require('./routes/cheques'));
app.use('/api/settings', require('./routes/settings'));

app.get('/', (req, res) => {
  res.send('RAXWO Tool Rental System API is running...');
});

// Start server for Node hosts (Render/local), but avoid starting inside Vercel serverless runtime.
// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 RAXWO Tool Rental Backend running on PORT: ${PORT}`);
  console.log(`📡 Database: ${dbName}`);
});

module.exports = app;

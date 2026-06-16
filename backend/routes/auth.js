const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');

// Register route
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    
    // Check if user exists
    const existing = await Employee.findOne({ username });
    if (existing) return res.status(400).json({ message: 'Username already taken' });

    const newUser = new Employee({
      username,
      password,
      name,
      role: role || 'Employee', // Default to employee
      status: 'Active'
    });

    await newUser.save();
    res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  try {
    // 1. Check for Hardcoded Admin (Emergency/Initial Setup)
    if (username.toLowerCase() === 'admin' && password === 'admin@123') {
      const token = jwt.sign(
        { id: '000000000000000000000001', username: 'admin', role: 'Admin', name: 'Master Admin' },
        process.env.JWT_SECRET || 'supersecretkey123',
        { expiresIn: '1d' }
      );
      return res.json({ 
        success: true, 
        token, 
        user: { username: 'admin', role: 'Admin', name: 'Master Admin' } 
      });
    }

    // 2. Check Database for Employee/Manager/Admin (case-insensitive username)
    const user = await Employee.findOne({
      username: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
    });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'supersecretkey123',
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      token,
      user: {
        username: user.username,
        role: user.role,
        name: user.name
      }
    });

  } catch (err) {
    console.error('Login Failure:', err);
    const errText = String(err?.message || '').toLowerCase();
    const dbUnavailable =
      errText.includes('buffering timed out') ||
      errText.includes('econnrefused') ||
      errText.includes('querysrv');

    res.status(500).json({ 
      message: dbUnavailable
        ? 'Database connection is currently unavailable. Try emergency login: admin / admin@123'
        : 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
});

module.exports = router;

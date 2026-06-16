const express = require('express');
const router = express.Router();
const Advance = require('../models/Advance');

// Get all advances
router.get('/', async (req, res) => {
  try {
    const advances = await Advance.find().sort({ date: -1 });
    res.json(advances);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create advance
router.post('/', async (req, res) => {
  const advance = new Advance(req.body);
  try {
    const newAdvance = await advance.save();
    res.status(201).json(newAdvance);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete advance
router.delete('/:id', async (req, res) => {
  try {
    await Advance.findByIdAndDelete(req.params.id);
    res.json({ message: 'Advance deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

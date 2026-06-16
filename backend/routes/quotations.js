const express = require('express');
const router = express.Router();
const Quotation = require('../models/Quotation');

// Get all quotations
router.get('/', async (req, res) => {
  try {
    const quotations = await Quotation.find().sort({ createdAt: -1 });
    res.json(quotations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create quotation
router.post('/', async (req, res) => {
  try {
    // Auto-generate quotation number if not provided
    if (!req.body.quotationNo) {
      const lastQuo = await Quotation.findOne().sort({ createdAt: -1 });
      let nextNum = 1001;
      if (lastQuo && lastQuo.quotationNo && lastQuo.quotationNo.startsWith('RT-QUO-')) {
        const lastNum = parseInt(lastQuo.quotationNo.split('-')[2]);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
      }
      req.body.quotationNo = `RT-QUO-${nextNum}`;
    }

    const newQuo = new Quotation(req.body);
    const saved = await newQuo.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update quotation
router.put('/:id', async (req, res) => {
  try {
    const updated = await Quotation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete quotation
router.delete('/:id', async (req, res) => {
  try {
    await Quotation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Quotation deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

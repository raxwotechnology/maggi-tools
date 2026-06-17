const express = require('express');
const router = express.Router();
const Quotation = require('../models/Quotation');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

// Get all quotations
router.get('/', authMiddleware, async (req, res) => {
  try {
    const quotations = await Quotation.find().sort({ createdAt: -1 });
    res.json(quotations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create quotation
router.post('/', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    // Auto-generate quotation number if not provided
    if (!req.body.quotationNo) {
      const lastQuo = await Quotation.findOne().sort({ createdAt: -1 });
      let nextNum = 1001;
      if (lastQuo && lastQuo.quotationNo && lastQuo.quotationNo.startsWith('QT-')) {
        const lastNum = parseInt(lastQuo.quotationNo.split('-')[1], 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
      } else if (lastQuo && lastQuo.quotationNo && lastQuo.quotationNo.startsWith('RT-QUO-')) {
        const lastNum = parseInt(lastQuo.quotationNo.split('-')[2], 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
      }
      req.body.quotationNo = `QT-${nextNum.toString().padStart(4, '0')}`;
    }

    if (Array.isArray(req.body.items) && req.body.items.length > 0) {
      req.body.items = req.body.items.map((it) => {
        const qty = Number(it.quantity) || 1;
        const days = Number(it.days) || 1;
        const rate = Number(it.dailyRate) || 0;
        return {
          ...it,
          quantity: qty,
          days,
          dailyRate: rate,
          lineTotal: Number(it.lineTotal) || qty * days * rate
        };
      });
      const itemsTotal = req.body.items.reduce((s, it) => s + (Number(it.lineTotal) || 0), 0);
      const extras =
        Number(req.body.transportCharge || 0) +
        Number(req.body.mandatoryCharge || 0) +
        Number(req.body.extraHourRate || 0) -
        Number(req.body.discount || 0);
      req.body.estimatedTotal = itemsTotal + extras;
    }

    const newQuo = new Quotation(req.body);
    const saved = await newQuo.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update quotation
router.put('/:id', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    if (Array.isArray(req.body.items) && req.body.items.length > 0) {
      req.body.items = req.body.items.map((it) => {
        const qty = Number(it.quantity) || 1;
        const days = Number(it.days) || 1;
        const rate = Number(it.dailyRate) || 0;
        return {
          ...it,
          quantity: qty,
          days,
          dailyRate: rate,
          lineTotal: Number(it.lineTotal) || qty * days * rate
        };
      });
      const itemsTotal = req.body.items.reduce((s, it) => s + (Number(it.lineTotal) || 0), 0);
      const extras =
        Number(req.body.transportCharge || 0) +
        Number(req.body.mandatoryCharge || 0) +
        Number(req.body.extraHourRate || 0) -
        Number(req.body.discount || 0);
      req.body.estimatedTotal = itemsTotal + extras;
    }
    const updated = await Quotation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete quotation
router.delete('/:id', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    await Quotation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Quotation deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

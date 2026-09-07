const express = require('express');
const router = express.Router();
const Quotation = require('../models/Quotation');
const { authMiddleware } = require('../middleware/authMiddleware');

const calculateQuotationTotals = (body) => {
  let itemsTotal = 0;
  if (Array.isArray(body.items) && body.items.length > 0) {
    body.items = body.items.map((it) => {
      const qty = Number(it.quantity) || 1;
      const days = Number(it.days) || 1;
      const rate = Number(it.dailyRate) || 0;
      const lineTotal = Number(it.lineTotal) != null && !isNaN(it.lineTotal) && it.lineTotal > 0
        ? Number(it.lineTotal)
        : qty * days * rate;
      return {
        ...it,
        quantity: qty,
        days,
        dailyRate: rate,
        lineTotal
      };
    });
    itemsTotal = body.items.reduce((s, it) => s + (Number(it.lineTotal) || 0), 0);
  }

  let accTotal = 0;
  if (Array.isArray(body.accessories) && body.accessories.length > 0) {
    const defaultDays = body.items?.[0]?.days || 1;
    body.accessories = body.accessories.map((acc) => {
      const qty = Number(acc.quantity) || 1;
      const price = Number(acc.price) || 0;
      return {
        ...acc,
        quantity: qty,
        price
      };
    });
    accTotal = body.accessories.reduce((s, acc) => s + (Number(acc.price || 0) * Number(acc.quantity || 1) * defaultDays), 0);
  }

  const extras =
    Number(body.transportCharge || 0) +
    Number(body.fuelCharge || 0) +
    Number(body.labourCharge || 0) +
    Number(body.otherCharges || 0) +
    Number(body.mandatoryCharge || 0) +
    Number(body.extraHourRate || 0) -
    Number(body.discount || 0);

  body.estimatedTotal = Math.max(0, itemsTotal + accTotal + extras);
  return body;
};

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
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Auto-generate quotation number if not provided
    if (!req.body.quotationNo || !String(req.body.quotationNo).trim()) {
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

    calculateQuotationTotals(req.body);

    const newQuo = new Quotation(req.body);
    const saved = await newQuo.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update quotation
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    calculateQuotationTotals(req.body);

    const updated = await Quotation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete quotation
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Quotation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Quotation deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

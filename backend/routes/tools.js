const express = require('express');
const router = express.Router();
const Tool = require('../models/Tool');
const Counter = require('../models/Counter');
const Accessory = require('../models/Accessory');
const Expense = require('../models/Expense');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

async function generateToolNumber() {
  for (let attempt = 0; attempt < 25; attempt++) {
    const counter = await Counter.findOneAndUpdate(
      { id: 'toolNumber' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const number = `TL-${String(counter.seq).padStart(4, '0')}`;
    const [toolExists, accExists] = await Promise.all([
      Tool.findOne({ number }),
      Accessory.findOne({ number })
    ]);
    if (!toolExists && !accExists) return number;
  }
  throw new Error('Could not generate a unique tool ID. Please try again.');
}

// Renewal logic for maintenance/warranty
router.patch('/:id/renew', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    const { type, newExpirationDate, cost } = req.body;
    const tool = await Tool.findById(req.params.id);
    if (!tool) return res.status(404).json({ message: 'Tool not found' });

    // Update the relevant date based on type
    if (type === 'warranty') {
      tool.warrantyExpirationDate = newExpirationDate;
    } else if (type === 'service') {
      tool.nextServiceDate = newExpirationDate;
      tool.lastServiceDate = new Date();
    } else {
      return res.status(400).json({ message: 'Invalid renewal type' });
    }

    await tool.save();

    // Create an expense record if cost is provided
    if (cost > 0) {
      const expense = new Expense({
        date: new Date(),
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} Renewal/Service - ${tool.number}`,
        amount: cost,
        category: 'Maintenance',
        toolId: tool._id,
        toolNumber: tool.number,
        note: `Auto-generated from renewal of ${type}`
      });
      await expense.save();
    }

    res.json({ message: 'Renewal successful', tool });
  } catch (err) {
    console.error('Renewal error:', err);
    res.status(400).json({ message: err.message });
  }
});

// Get all tools with dynamic availability check
router.get('/', authMiddleware, async (req, res) => {
  try {
    const tools = await Tool.find().sort({ number: 1 });
    const Booking = require('../models/Booking');
    const now = new Date();

    const updatedTools = await Promise.all(tools.map(async (t) => {
      const activeBooking = await Booking.findOne({
        tool: t._id,
        status: { $in: ['Confirmed', 'Active'] },
        pickupDate: { $lte: now },
        returnDate: { $gte: now }
      });

      const toolObj = t.toObject();
      if (activeBooking) {
        toolObj.status = 'Booked';
        toolObj.currentBooking = activeBooking;
      }
      return toolObj;
    }));

    res.json(updatedTools);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Next auto-generated tool ID (for create form)
router.get('/next-id', authMiddleware, async (req, res) => {
  try {
    const number = await generateToolNumber();
    res.json({ number });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add new tool — ID must not clash with any Accessory ID
router.post('/', authMiddleware, async (req, res) => {
  try {
    const rawNumber = (req.body.number || '').trim();
    const normNum = rawNumber ? rawNumber.toUpperCase() : await generateToolNumber();

    const accExists = await Accessory.findOne({ number: normNum });
    if (accExists) {
      return res.status(400).json({ message: `ID "${normNum}" is already used by an Accessory. Tool and Accessory IDs must be unique across both collections.` });
    }

    // Within-collection check
    const toolExists = await Tool.findOne({ number: normNum });
    if (toolExists) {
      return res.status(400).json({ message: `Tool ID "${normNum}" already exists. Please use a unique ID.` });
    }

    const tool = new Tool({ ...req.body, number: normNum });
    const newTool = await tool.save();
    res.status(201).json(newTool);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update tool
router.put('/:id', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    const updatedTool = await Tool.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedTool);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete tool
router.delete('/:id', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    await Tool.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tool deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark / unmark a monthly lease payment
router.patch('/:id/lease-payment', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    const year  = Number(req.body.year);
    const month = Number(req.body.month);
    const paid  = Boolean(req.body.paid);

    const tool = await Tool.findById(req.params.id);
    if (!tool) return res.status(404).json({ message: 'Tool not found' });

    // Safely initialise the array if missing on older documents
    if (!Array.isArray(tool.leasePayments)) {
      tool.leasePayments = [];
    }

    // Find existing entry for this month/year (use Number coercion to be safe)
    const idx = tool.leasePayments.findIndex(
      lp => Number(lp.year) === year && Number(lp.month) === month
    );

    if (idx >= 0) {
      tool.leasePayments[idx].paid     = paid;
      tool.leasePayments[idx].paidDate = paid ? new Date() : null;
    } else {
      tool.leasePayments.push({ year, month, paid, paidDate: paid ? new Date() : null });
    }

    tool.markModified('leasePayments'); // ensure Mongoose detects nested array change
    await tool.save();
    res.json(tool);
  } catch (err) {
    console.error('Lease payment update error:', err);
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Cheque = require('../models/Cheque');
const Account = require('../models/Account');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

// GET all cheques
router.get('/', authMiddleware, async (req, res) => {
  try {
    const records = await Cheque.find().sort({ dueDate: 1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create cheque
router.post('/', authMiddleware, async (req, res) => {
  const record = new Cheque(req.body);
  try {
    const newRecord = await record.save();
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update cheque (Status changes)
router.put('/:id', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    const oldCheque = await Cheque.findById(req.params.id);
    if (!oldCheque) return res.status(404).json({ message: 'Cheque not found' });

    const updated = await Cheque.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // REAL-TIME BALANCE UPDATE
    // If status changed to 'Accepted' or 'Cleared' and it wasn't before
    if ((updated.status === 'Accepted' || updated.status === 'Cleared') && 
        (oldCheque.status !== 'Accepted' && oldCheque.status !== 'Cleared') && 
        updated.accountId) {
      
      const amount = updated.type === 'Incoming' ? updated.amount : -updated.amount;
      await Account.findByIdAndUpdate(updated.accountId, { $inc: { balance: amount } });
    }
    
    // If status was 'Accepted'/'Cleared' and changed back to Pending/Rejected
    if ((oldCheque.status === 'Accepted' || oldCheque.status === 'Cleared') && 
        (updated.status === 'Pending' || updated.status === 'Rejected') && 
        oldCheque.accountId) {
      
      const amount = oldCheque.type === 'Incoming' ? -oldCheque.amount : oldCheque.amount;
      await Account.findByIdAndUpdate(oldCheque.accountId, { $inc: { balance: amount } });
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE cheque
router.delete('/:id', authMiddleware, authorizeRoles('Admin'), async (req, res) => {
  try {
    await Cheque.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

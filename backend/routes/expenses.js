const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Account = require('../models/Account');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const records = await Expense.find().sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const record = new Expense({ ...req.body, updatedBy: req.user.id, updatedByName: req.user.name });
  try {
    const newRecord = await record.save();
    
    // UPDATE BALANCE IF BANK TRANSFER OR CHEQUE (Subtract for expense)
    const isBankAction = ['Bank Transfer', 'Cheque'].includes(newRecord.paymentMethod);
    if (isBankAction && newRecord.accountId) {
      await Account.findByIdAndUpdate(newRecord.accountId, { $inc: { balance: -newRecord.amount } });
    }
    
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    const oldRecord = await Expense.findById(req.params.id);
    const updatedRecord = await Expense.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user.id, updatedByName: req.user.name }, { new: true });
    
    // ADJUST BALANCE IF AMOUNT OR ACCOUNT CHANGED
    const isOldBank = ['Bank Transfer', 'Cheque'].includes(oldRecord.paymentMethod);
    const isNewBank = ['Bank Transfer', 'Cheque'].includes(updatedRecord.paymentMethod);

    if (isOldBank && oldRecord.accountId) {
      await Account.findByIdAndUpdate(oldRecord.accountId, { $inc: { balance: oldRecord.amount } });
    }
    if (isNewBank && updatedRecord.accountId) {
      await Account.findByIdAndUpdate(updatedRecord.accountId, { $inc: { balance: -updatedRecord.amount } });
    }

    res.json(updatedRecord);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    const record = await Expense.findById(req.params.id);
    if (record && ['Bank Transfer', 'Cheque'].includes(record.paymentMethod) && record.accountId) {
      await Account.findByIdAndUpdate(record.accountId, { $inc: { balance: record.amount } });
    }
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Invoice = require('../models/Invoice');
const Account = require('../models/Account');
const Setting = require('../models/Setting');
const { sendSMS } = require('../utils/smsService');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

// Helper to sync back to source
async function syncBackToSource(payment) {
    if (payment.bookingId) {
        await Booking.findByIdAndUpdate(payment.bookingId, {
            advancePayment: payment.takenAmount,
            balanceAmount: payment.hireAmount - payment.takenAmount
        });
    }
    if (payment.invoiceId) {
        await Invoice.findByIdAndUpdate(payment.invoiceId, {
            advancePayment: payment.takenAmount
        });
    }
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    // Keep this route fast: use `.lean()` and only backfill invoiceNo when missing.
    const records = await Payment.find().sort({ date: -1 }).lean();

    const isMissingInvoiceNo = (v) => {
      if (v === null || v === undefined) return true;
      const s = String(v).trim();
      return s === '' || s === '-' || s === '—';
    };

    const recordsNeedingInvoiceNo = records.filter((p) => isMissingInvoiceNo(p.invoiceNo));
    const invoiceIds = recordsNeedingInvoiceNo.map((p) => p.invoiceId).filter(Boolean);

    let invMap = new Map();
    if (invoiceIds.length) {
      const invoices = await Invoice.find({ _id: { $in: invoiceIds } })
        .select('invoiceNo _id')
        .lean();
      invMap = new Map(invoices.map((inv) => [String(inv._id), inv]));
    }

    const normalized = records.map((p) => {
      if (!isMissingInvoiceNo(p.invoiceNo)) return p;
      const inv = p.invoiceId ? invMap.get(String(p.invoiceId)) : null;
      if (inv) p.invoiceNo = inv.invoiceNo || '';
      return p;
    });

    res.json(normalized);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  const record = new Payment(req.body);
  try {
    const newRecord = await record.save();
    await syncBackToSource(newRecord);

    // UPDATE BALANCE IF BANK TRANSFER OR CHEQUE
    const isBankAction = ['Bank Transfer', 'Cheque'].includes(newRecord.paymentMethod);
    if (isBankAction && newRecord.accountId) {
      await Account.findByIdAndUpdate(newRecord.accountId, { $inc: { balance: newRecord.paidAmount || 0 } });
    }

    // SEND SMS
    try {
      const client = await Booking.findById(newRecord.bookingId);
      if (client && client.clientPhone) {
        const settings = await Setting.findOne();
        const msg = `
--- PAYMENT RECEIPT ---
Customer: ${newRecord.client}
Payment Date: ${new Date(newRecord.date).toLocaleDateString()}
Amount Paid: LKR ${(newRecord.paidAmount || newRecord.takenAmount || 0).toLocaleString()}
Payment Method: ${newRecord.paymentMethod || 'Cash'}
Balance Due: LKR ${(newRecord.balance || 0).toLocaleString()}

Terms: Payments are non-refundable. Late returns incur daily charges.
Thank you for your business! - ${settings?.companyName || 'RAXWO TOOL RENTALS'}`;
        await sendSMS(client.clientPhone, msg.trim());
      }
    } catch (smsErr) { console.error('Payment SMS fail:', smsErr); }

    res.status(201).json(newRecord);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    const oldRecord = await Payment.findById(req.params.id);
    const updated = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (updated) {
      await syncBackToSource(updated);

      // ADJUST BALANCE
      const isOldBank = ['Bank Transfer', 'Cheque'].includes(oldRecord.paymentMethod);
      const isNewBank = ['Bank Transfer', 'Cheque'].includes(updated.paymentMethod);

      if (isOldBank && oldRecord.accountId) {
        await Account.findByIdAndUpdate(oldRecord.accountId, { $inc: { balance: -(oldRecord.paidAmount || 0) } });
      }
      if (isNewBank && updated.accountId) {
        await Account.findByIdAndUpdate(updated.accountId, { $inc: { balance: (updated.paidAmount || 0) } });
      }
    }
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    const record = await Payment.findById(req.params.id);
    if (record && ['Bank Transfer', 'Cheque'].includes(record.paymentMethod) && record.accountId) {
      await Account.findByIdAndUpdate(record.accountId, { $inc: { balance: -(record.paidAmount || 0) } });
    }
    await Payment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

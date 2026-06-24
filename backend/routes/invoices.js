const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Booking = require('../models/Booking');
const Counter = require('../models/Counter');
const Accessory = require('../models/Accessory');
const Payment = require('../models/Payment');
const Account = require('../models/Account');
const Setting = require('../models/Setting');
const { sendSMS } = require('../utils/smsService');
const { buildAdvancePaymentSms } = require('../utils/smsTemplate');
const { authMiddleware } = require('../middleware/authMiddleware');

async function getNextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

// Helper to sync invoice to payment book
async function syncToPaymentBook(invoice) {
    const paymentData = {
        date: invoice.date,
        client: invoice.clientName,
        tool: invoice.items?.[0]?.toolNumber || invoice.toolNo || 'Various',
        city: invoice.site || '',
        hireAmount: invoice.totalAmount,
        takenAmount: invoice.advancePayment || 0,
        balance: invoice.totalAmount - (invoice.advancePayment || 0),
        status: invoice.status === 'Paid' ? 'Paid' : 'Pending',
        paymentMethod: invoice.paymentMethod || 'Cash',
        accountId: invoice.accountId,
        invoiceId: invoice._id,
        invoiceNo: invoice.invoiceNo
    };

    await Payment.findOneAndUpdate(
        { invoiceId: invoice._id },
        paymentData,
        { upsert: true, new: true }
    );
}

async function syncBookingInvoiceFromInvoice(invoice) {
  if (!invoice.bookingId) return;
  const payload = {
    invoiceId: invoice._id,
    invoiceNo: invoice.invoiceNo,
    advancePayment: invoice.advancePayment || 0,
    balanceAmount: invoice.balanceAmount ?? Math.max(0, (invoice.totalAmount || 0) - (invoice.advancePayment || 0))
  };

  if (invoice.status === 'Paid') {
    payload.balanceAmount = 0;
    payload.status = 'Completed';
  }

  await Booking.findByIdAndUpdate(invoice.bookingId, payload, { new: false });
}

// Get all invoices
router.get('/', authMiddleware, async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create invoice
router.post('/', async (req, res) => {
  try {
    // Auto-generate invoice number if not provided
    if (!req.body.invoiceNo || req.body.invoiceNo === '') {
      const seq = await getNextSequence('invoiceNo');
      const year = new Date().getFullYear().toString().slice(-2);
      req.body.invoiceNo = `RT-INV-${year}-${seq.toString().padStart(4, '0')}`;
    }

    if (req.body.accountId === '') req.body.accountId = null;
    const newInvoice = new Invoice({
      ...req.body,
      updatedBy: req.user.id,
      updatedByName: req.user.name
    });
    const saved = await newInvoice.save();

    // Sync to Payment Book
    await syncToPaymentBook(saved);
    await syncBookingInvoiceFromInvoice(saved);

    // Deduct stock for accessories
    if (req.body.accessories && Array.isArray(req.body.accessories)) {
        for (const item of req.body.accessories) {
            await Accessory.findOneAndUpdate(
                { name: item.name },
                { $inc: { stock: -item.quantity } }
            );
        }
    }

    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      updatedBy: req.user.id,
      updatedByName: req.user.name
    };
    if (updateData.accountId === '') updateData.accountId = null;
    const updated = await Invoice.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (updated) {
      await syncToPaymentBook(updated);
      await syncBookingInvoiceFromInvoice(updated);
    }
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Mark invoice as Paid or Add Payment
router.post('/:id/pay', authMiddleware, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const { paymentAmount, paymentMethod, accountId } = req.body;
    
    let amountAdded = 0;
    if (paymentAmount !== undefined) {
      amountAdded = Number(paymentAmount);
      invoice.advancePayment = (invoice.advancePayment || 0) + amountAdded;
    } else {
      amountAdded = invoice.totalAmount - (invoice.advancePayment || 0);
      invoice.advancePayment = invoice.totalAmount;
    }

    if (paymentMethod) invoice.paymentMethod = paymentMethod;
    if (accountId) invoice.accountId = accountId;

    const remaining = invoice.totalAmount - invoice.advancePayment;
    invoice.balanceAmount = remaining > 0 ? remaining : 0;
    if (invoice.balanceAmount <= 0) invoice.status = 'Paid';
    
    invoice.updatedBy = req.user.id;
    invoice.updatedByName = req.user.name;

    const saved = await invoice.save();
    await syncToPaymentBook(saved);
    await syncBookingInvoiceFromInvoice(saved);

    // Update bank balance if Bank Transfer
    if (saved.paymentMethod === 'Bank Transfer' && saved.accountId && amountAdded > 0) {
        await Account.findByIdAndUpdate(saved.accountId, { $inc: { balance: amountAdded } });
    }

    // Send advance payment SMS when linked to a booking
    if (amountAdded > 0 && saved.bookingId) {
      try {
        const booking = await Booking.findById(saved.bookingId).lean();
        if (booking?.clientPhone) {
          const settings = await Setting.findOne();
          const smsData = {
            ...booking,
            invoiceNo: saved.invoiceNo || booking.invoiceNo,
            totalAmount: saved.totalAmount ?? booking.totalAmount,
            advancePayment: saved.advancePayment,
            balanceAmount: saved.balanceAmount
          };
          const msg = buildAdvancePaymentSms(smsData, settings, {
            amountReceived: amountAdded,
            paymentMethod: paymentMethod || saved.paymentMethod || 'Cash'
          });
          if (msg) await sendSMS(booking.clientPhone, msg);
        }
      } catch (smsErr) {
        console.error('Invoice payment SMS failed:', smsErr.message);
      }
    }

    res.json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete invoice
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
      await Invoice.findByIdAndDelete(req.params.id);
      await Payment.findOneAndDelete({ invoiceId: req.params.id });
      res.json({ message: 'Invoice and linked payment deleted' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
});

module.exports = router;

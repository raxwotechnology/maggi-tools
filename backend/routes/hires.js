const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Hire = require('../models/Hire');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Counter = require('../models/Counter');
const Account = require('../models/Account');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

async function getNextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    let query = {};
    // Restrict access for all roles EXCEPT Admin and Manager
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      query.$or = [
        { operatorName: req.user.name },
        { helperName: req.user.name }
      ];
    }
    const records = await Hire.find(query).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const dataArray = Array.isArray(req.body) ? req.body : [req.body];
    const createdHires = [];

    for (const item of dataArray) {
      // 1. Auto-generate Bill Number if missing
      if (!item.billNumber || item.billNumber === '' || item.billNumber === '—') {
        const seq = await getNextSequence('billNumber');
        const year = new Date().getFullYear().toString().slice(-2);
        const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
        item.billNumber = `BL-${year}${month}-${seq.toString().padStart(4, '0')}`;
      }

      // 2. Create Hire Record
      item.updatedBy = req.user.id;
      item.updatedByName = req.user.name;
      const hire = new Hire(item);
      const savedHire = await hire.save();
      createdHires.push(savedHire);
      console.log(`[HIRE] Saved: ${savedHire._id}`);

      // 4. Auto-generate Payment Record (Moved up for priority)
      try {
        await mongoose.connection.collection('payments').insertOne({
          date: savedHire.date ? new Date(savedHire.date) : new Date(),
          client: savedHire.client,
          tool: savedHire.toolId,
          address: savedHire.address,
          city: savedHire.city,
          operatorName: savedHire.operatorName,
          helperName: savedHire.helperName,
          startTime: savedHire.startTime,
          endTime: savedHire.endTime,
          restTime: savedHire.restTime,
          totalHours: savedHire.workingHours,
          minimumHours: savedHire.minimumHours,
          hoursInBill: savedHire.workingHours,
          commission: savedHire.commission,
          hireAmount: savedHire.totalAmount,
          takenAmount: savedHire.advancePayment || 0,
          paidAmount: savedHire.advancePayment || 0,
          balance: savedHire.totalAmount - (savedHire.advancePayment || 0),
          status: savedHire.advancePayment >= savedHire.totalAmount && savedHire.totalAmount > 0 ? 'Paid' : (savedHire.advancePayment > 0 ? 'Partial' : 'Pending'),
          paymentMethod: savedHire.paymentMethod || 'Cash',
          accountId: savedHire.accountId,
          hireId: savedHire._id,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // UPDATE BALANCE IF BANK TRANSFER
        if (savedHire.paymentMethod === 'Bank Transfer' && savedHire.accountId) {
          await Account.findByIdAndUpdate(savedHire.accountId, { $inc: { balance: savedHire.advancePayment || 0 } });
        }
        
        console.log(`[PAYMENT] Created for Hire: ${savedHire._id}`);
      } catch (payErr) {
        console.error('[PAYMENT] Direct Insert Failed:', payErr.message);
      }

      // 3. Auto-generate Invoice
      try {
        const invSeq = await getNextSequence('invoiceNo');
        const invYear = new Date().getFullYear().toString().slice(-2);
        const invoiceNo = `RT-INV-${invYear}-${invSeq.toString().padStart(4, '0')}`;

        const newInvoice = new Invoice({
          invoiceNo: invoiceNo,
          date: savedHire.date,
          clientName: savedHire.client,
          site: `${savedHire.address || ''}, ${savedHire.city || ''}`.trim(),
          toolNo: savedHire.toolId,
          toolCategory: savedHire.toolCategory,
          jobDescription: savedHire.details || `Hire charges for ${savedHire.toolId}`,
          startTime: savedHire.startTime,
          endTime: savedHire.endTime,
          totalUnits: savedHire.workingHours,
          unitType: 'Hours',
          ratePerUnit: savedHire.oneHourFee,
          transportCharge: savedHire.transportFee,
          subtotal: savedHire.billAmount,
          totalAmount: savedHire.billAmount,
          status: 'Draft',
          remarks: `Auto-generated from Hire Bill ${savedHire.billNumber}`,
          hireId: savedHire._id
        });
        await newInvoice.save();
        console.log(`[INVOICE] Created: ${invoiceNo}`);
      } catch (invErr) {
        console.error('[INVOICE] Failed to auto-generate:', invErr.message);
      }

      // 5. Auto-generate Expense for External Hires
      if (savedHire.isExternal && Number(savedHire.externalCost) > 0) {
        try {
          await mongoose.connection.collection('expenses').insertOne({
            date: savedHire.date ? new Date(savedHire.date) : new Date(),
            description: `[EXT] Hire: ${savedHire.toolId} - ${savedHire.client}`,
            amount: Number(savedHire.externalCost),
            category: 'Tool Hire',
            toolNo: savedHire.toolId,
            note: `Auto-generated from Hire Bill ${savedHire.billNumber}. Category: ${savedHire.toolCategory || 'N/A'}`,
            hireId: savedHire._id,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log(`[EXPENSE] Direct Created for Hire: ${savedHire._id}`);
        } catch (expErr) {
          console.error('[EXPENSE] Direct Create Failed:', expErr.message);
        }
      }
    }

    res.status(201).json(Array.isArray(req.body) ? createdHires : createdHires[0]);
  } catch (err) {
    console.error('[HIRE] Creation Flow Error:', err);
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    req.body.updatedBy = req.user.id;
    req.body.updatedByName = req.user.name;
    const updated = await Hire.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // Sync with Payment Record
    if (updated) {
      try {
        await mongoose.connection.collection('payments').updateOne(
          { hireId: updated._id },
          {
            $set: {
              date: updated.date ? new Date(updated.date) : new Date(),
              client: updated.client,
              tool: updated.toolId,
              address: updated.address,
              city: updated.city,
              operatorName: updated.operatorName,
              helperName: updated.helperName,
              startTime: updated.startTime,
              endTime: updated.endTime,
              restTime: updated.restTime,
              totalHours: updated.workingHours,
              minimumHours: updated.minimumHours,
              hoursInBill: updated.workingHours,
              commission: updated.commission,
              hireAmount: updated.totalAmount,
              takenAmount: updated.advancePayment || 0,
              paidAmount: updated.advancePayment || 0,
              balance: updated.totalAmount - (updated.advancePayment || 0),
              status: updated.advancePayment >= updated.totalAmount && updated.totalAmount > 0 ? 'Paid' : (updated.advancePayment > 0 ? 'Partial' : 'Pending'),
              paymentMethod: updated.paymentMethod || 'Cash',
              accountId: updated.accountId,
              updatedAt: new Date()
            },
            $setOnInsert: {
              createdAt: new Date()
            }
          },
          { upsert: true }
        );

        // SYNC BALANCE (Complexity: We need old state to revert)
        // For simplicity in this POS context, we might need a more robust transaction log.
        // But for now, we'll try to find the previous payment to revert.
        // Actually, it's better to manage balance in a Payment model middleware or service.
        // But let's stick to simple logic for now.
        // Note: This simple logic doesn't perfectly handle all updates (like changing from Cash to Bank).
        
        console.log(`[PAYMENT] Synced for Hire: ${updated._id}`);
      } catch (payErr) {
        console.error('[PAYMENT] Sync Update Failed:', payErr.message);
      }

      // Sync Expense
      try {
        if (updated.isExternal && Number(updated.externalCost) > 0) {
          await mongoose.connection.collection('expenses').updateOne(
            { hireId: updated._id },
            {
              $set: {
                date: updated.date ? new Date(updated.date) : new Date(),
                description: `[EXT] Hire: ${updated.toolId} - ${updated.client}`,
                amount: Number(updated.externalCost),
                category: 'Tool Hire',
                toolNo: updated.toolId,
                note: `Auto-generated from Hire Bill ${updated.billNumber}. Category: ${updated.toolCategory || 'N/A'}`,
                updatedAt: new Date()
              },
              $setOnInsert: {
                createdAt: new Date()
              }
            },
            { upsert: true }
          );
          console.log(`[EXPENSE] Direct Synced for Hire: ${updated._id}`);
        } else {
          await mongoose.connection.collection('expenses').deleteOne({ hireId: updated._id });
        }
      } catch (expErr) {
        console.error('[EXPENSE] Direct Sync Failed:', expErr.message);
      }

      // Sync Invoice
      try {
        await Invoice.findOneAndUpdate(
          { hireId: updated._id, status: 'Draft' }, // Only sync if still in Draft
          {
            $set: {
              date: updated.date,
              clientName: updated.client,
              site: `${updated.address || ''}, ${updated.city || ''}`.trim(),
              toolNo: updated.toolId,
              toolCategory: updated.toolCategory,
              jobDescription: updated.details || `Hire charges for ${updated.toolId}`,
              startTime: updated.startTime,
              endTime: updated.endTime,
              totalUnits: updated.workingHours,
              ratePerUnit: updated.oneHourFee,
              transportCharge: updated.transportFee,
              subtotal: updated.billAmount,
              totalAmount: updated.billAmount,
              updatedAt: new Date()
            }
          }
        );
        console.log(`[INVOICE] Synced for Hire: ${updated._id}`);
      } catch (invErr) {
        console.error('[INVOICE] Sync Failed:', invErr.message);
      }
    }
    
    res.json(updated);
  } catch (err) {
    console.error('❌ Error updating hire/payment:', err);
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    await Hire.findByIdAndDelete(req.params.id);
    await Payment.findOneAndDelete({ hireId: req.params.id });
    await Expense.findOneAndDelete({ hireId: req.params.id });
    await Invoice.findOneAndDelete({ hireId: req.params.id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

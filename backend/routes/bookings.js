const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

function isValidObjectId(id) {
  if (id == null || id === '') return false;
  return mongoose.Types.ObjectId.isValid(String(id));
}
const Booking = require('../models/Booking');
const Tool = require('../models/Tool');
const Accessory = require('../models/Accessory');
const Invoice = require('../models/Invoice');
const Counter = require('../models/Counter');
const Payment = require('../models/Payment');
const Client = require('../models/Client');
const Setting = require('../models/Setting');
const { sendSMS } = require('../utils/smsService');
const {
  buildDetailedBillMessage,
  applySmsTemplate,
  resolveBookingTemplate,
  buildAdvancePaymentSms,
  buildItemsBreakdown,
  getCompanyName
} = require('../utils/smsTemplate');
const { verifyBillViewToken } = require('../utils/billLink');
const { renderBillViewHtml } = require('../utils/billViewHtml');
const Account = require('../models/Account');
const { authMiddleware } = require('../middleware/authMiddleware');

async function enrichBookingForSms(bookingData) {
  const data = bookingData?.toObject ? bookingData.toObject() : { ...bookingData };
  const items = Array.isArray(data.items) ? data.items : [];

  for (const item of items) {
    if (!isValidObjectId(item.tool)) continue;
    const tool = await Tool.findById(item.tool).select('model number dailyRate').lean();
    if (!tool) continue;
    item.model = item.model || tool.model || '';
    item.dailyRate = Number(item.dailyRate) || Number(tool.dailyRate) || 0;
    if (!item.model) item.model = tool.model || '';
  }

  data.items = items;
  return data;
}

async function buildSMSMessage(templateField, bookingData) {
  try {
    const settings = await Setting.findOne();
    const enriched = await enrichBookingForSms(bookingData);

    if (templateField === 'smsBookingTemplate') {
      const template = resolveBookingTemplate(settings);
      return applySmsTemplate(template, enriched, settings);
    }

    const template = settings?.[templateField];
    if (typeof template === 'string' && template.trim()) {
      return applySmsTemplate(template.trim(), enriched, settings);
    }

    return buildDetailedBillMessage(enriched, settings);
  } catch (err) {
    console.error('Failed to build SMS from template:', err.message);
    return null;
  }
}

async function sendAdvancePaymentSms(bookingData, amountReceived, paymentMethod = 'Cash') {
  const amt = Number(amountReceived) || 0;
  if (!bookingData?.clientPhone || amt <= 0) {
    return { smsSent: false, smsError: null };
  }
  try {
    const settings = await Setting.findOne();
    const enriched = await enrichBookingForSms(bookingData);
    const msg = buildAdvancePaymentSms(enriched, settings, { amountReceived: amt, paymentMethod });
    if (!msg) return { smsSent: false, smsError: 'Empty SMS message' };
    const result = await sendSMS(bookingData.clientPhone, msg);
    return { smsSent: !!result.success, smsError: result.error || null };
  } catch (err) {
    console.error('Advance payment SMS failed:', err.message);
    return { smsSent: false, smsError: err.message };
  }
}

function calcBookingTotals(body) {
  const pickup = new Date(body.pickupDate);
  const ret = new Date(body.returnDate);
  let totalDays = Number(body.totalDays) || 1;
  if (!isNaN(pickup) && !isNaN(ret)) {
    const diff = Math.floor((ret - pickup) / (1000 * 60 * 60 * 24)) + 1;
    if (diff > 0) totalDays = diff;
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const accessories = Array.isArray(body.accessories) ? body.accessories : [];

  const getCost = (item, rate) => {
    let cost = 0;
    const totalQty = Number(item.quantity) || 1;
    let returnedQty = 0;
    
    if (item.returnDates && Array.isArray(item.returnDates)) {
      item.returnDates.forEach(rd => {
        const qty = Number(rd.quantity) || 0;
        returnedQty += qty;
        
        const rdDate = new Date(rd.date);
        rdDate.setHours(0,0,0,0);
        const pickupDateObj = new Date(pickup);
        pickupDateObj.setHours(0,0,0,0);
        
        let diffDays = Math.round((rdDate - pickupDateObj) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) diffDays = 1; // Same day return = 1 day minimum
        else diffDays += 1; // Align with totalDays calculation (inclusive of start day)
        cost += rate * qty * diffDays;
      });
    }
    
    const unreturned = Math.max(0, totalQty - returnedQty);
    if (unreturned > 0) {
      // Use per-item rental days if set, otherwise fall back to booking-level totalDays
      let daysForUnreturned = (item.rentalDays && Number(item.rentalDays) > 0) ? Number(item.rentalDays) : totalDays;
      if (body.actualReturnDate) {
         const actDate = new Date(body.actualReturnDate);
         actDate.setHours(0,0,0,0);
         const pickupDateObj = new Date(pickup);
         pickupDateObj.setHours(0,0,0,0);
         daysForUnreturned = Math.round((actDate - pickupDateObj) / (1000 * 60 * 60 * 24)) + 1;
         if (daysForUnreturned < 1) daysForUnreturned = 1;
      }
      cost += rate * unreturned * daysForUnreturned;
    }
    return cost;
  };

  const toolsTotal = items.reduce(
    (sum, it) => sum + getCost(it, Number(it.dailyRate) || 0),
    0
  );
  
  const accTotal = accessories.reduce(
    (sum, a) => sum + getCost(a, Number(a.price) || 0),
    0
  );

  const transport = Number(body.transportCharge) || 0;
  const discount = Number(body.discount) || 0;
  const advance = Number(body.advancePayment) || 0;
  const subtotal = toolsTotal + accTotal + transport;
  
  // Apply late return extra charges if not handled via returnDates
  let extra = 0;
  if (body.actualReturnDate && (!body.items || body.items.length === 0 || !body.items[0].returnDates)) {
     const actDate = new Date(body.actualReturnDate);
     if (actDate > ret) {
       const diffTime = Math.abs(actDate - ret);
       const extraDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
       const rate = items.length === 1 ? (Number(items[0].dailyRate) || 0) : 0;
       extra = extraDays * rate;
     }
  }

  // Sum overdue charges from all items and accessories
  const totalOverdueCharges = [...items, ...accessories].reduce(
    (sum, it) => sum + (Number(it.totalOverdueCharge) || 0), 0
  );

  const totalAmount = Math.max(0, subtotal - discount + extra + totalOverdueCharges);
  const balanceAmount = Math.max(0, totalAmount - advance);

  return {
    totalDays,
    baseAmount: subtotal,
    totalAmount,
    balanceAmount,
    extraCharges: extra,
    totalOverdueCharges,
    dailyRate: items.length === 1 ? Number(items[0].dailyRate) || 0 : 0
  };
}

async function getNextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

// Get dashboard insights (Top tools, Top customers)
router.get('/insights', authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find().populate('tool');
    
    // Top Tools
    const toolStats = {};
    bookings.forEach(b => {
      if (b.tool) {
        const id = b.tool._id.toString();
        if (!toolStats[id]) {
          toolStats[id] = { 
            name: `${b.tool.number} - ${b.tool.model}`, 
            count: 0, 
            revenue: 0,
            image: b.tool.images?.[0] || null
          };
        }
        toolStats[id].count += 1;
        toolStats[id].revenue += (b.totalAmount || 0);
      }
    });
    
    const topTools = Object.values(toolStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top Customers
    const customerStats = {};
    bookings.forEach(b => {
      const name = b.clientName || 'Unknown';
      if (!customerStats[name]) {
        customerStats[name] = { 
          name, 
          count: 0, 
          revenue: 0, 
          latestTool: b.tool ? b.tool.model : 'N/A' 
        };
      }
      customerStats[name].count += 1;
      customerStats[name].revenue += (b.totalAmount || 0);
      customerStats[name].latestTool = b.tool ? b.tool.model : customerStats[name].latestTool;
    });

    const topCustomers = Object.values(customerStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    res.json({ topTools, topCustomers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Public bill data (for Netlify frontend /bill/:token page)
router.get('/bill/data/:token', async (req, res) => {
  try {
    const { bookingId } = verifyBillViewToken(req.params.token);
    let booking = await Booking.findById(bookingId).lean();
    if (!booking) return res.status(404).json({ message: 'Bill not found.' });

    booking = await enrichBookingForSms(booking);

    const [invoice, settings] = await Promise.all([
      Invoice.findOne({ bookingId: booking._id }).lean(),
      Setting.findOne().lean()
    ]);

    res.json({
      booking,
      invoice,
      settings,
      companyName: getCompanyName(settings),
      itemsBreakdown: buildItemsBreakdown(booking)
    });
  } catch (err) {
    res.status(400).json({ message: 'This bill link is invalid or has expired.' });
  }
});

// Public bill view HTML fallback (direct API link)
router.get('/bill/view/:token', async (req, res) => {
  try {
    const { bookingId } = verifyBillViewToken(req.params.token);
    let booking = await Booking.findById(bookingId).lean();
    if (!booking) return res.status(404).send('Bill not found.');

    booking = await enrichBookingForSms(booking);

    const [invoice, settings] = await Promise.all([
      Invoice.findOne({ bookingId: booking._id }).lean(),
      Setting.findOne().lean()
    ]);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderBillViewHtml(booking, invoice, settings));
  } catch (err) {
    res.status(400).send('This bill link is invalid or has expired.');
  }
});

// Get all bookings
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Keep this route fast: no heavy populate; use `.lean()` and only backfill invoiceNo when missing.
    const bookings = await Booking.find().sort({ createdAt: -1 }).lean();

    const isMissingInvoiceNo = (v) => {
      if (v === null || v === undefined) return true;
      const s = String(v).trim();
      return s === '' || s === '-' || s === '—';
    };

    const bookingsNeedingInvoice = bookings.filter((b) => isMissingInvoiceNo(b.invoiceNo));
    const bookingIds = bookingsNeedingInvoice.map((b) => b._id).filter(Boolean);

    let invMap = new Map();
    if (bookingIds.length) {
      const invoices = await Invoice.find({ bookingId: { $in: bookingIds } })
        .select('bookingId invoiceNo _id')
        .lean();
      invMap = new Map(invoices.map((inv) => [String(inv.bookingId), inv]));
    }

    const normalized = bookings.map((b) => {
      if (!isMissingInvoiceNo(b.invoiceNo)) return b;
      const inv = invMap.get(String(b._id));
      if (inv) {
        b.invoiceId = inv._id;
        b.invoiceNo = inv.invoiceNo || '';
      }
      return b;
    });

    res.json(normalized);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Check tool availability
router.get('/check-availability', authMiddleware, async (req, res) => {
  const { pickupDate, returnDate, toolId } = req.query;
  try {
    const start = new Date(pickupDate);
    const end = new Date(returnDate);

    const overlapping = await Booking.findOne({
      tool: toolId,
      status: { $ne: 'Cancelled' },
      $or: [
        { pickupDate: { $lt: end }, returnDate: { $gt: start } }
      ]
    });

    res.json({ available: !overlapping });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get available tools for a date range
router.get('/available-tools', authMiddleware, async (req, res) => {
  const { pickupDate, returnDate } = req.query;
  try {
    const unavailableStatuses = ['Maintenance', 'Repair', 'Maintaining', 'Under Repair', 'Unavailable'];
    let bookedIds = [];

    if (pickupDate && returnDate) {
      const start = new Date(pickupDate);
      const end = new Date(returnDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const overlapping = await Booking.find({
          status: { $nin: ['Cancelled', 'Returned'] },
          pickupDate: { $lt: end },
          returnDate: { $gt: start }
        }).select('tool items');

        const idSet = new Set();
        overlapping.forEach((b) => {
          if (b.tool) idSet.add(b.tool.toString());
          (b.items || []).forEach((it) => {
            if (it.tool) idSet.add(it.tool.toString());
          });
        });
        bookedIds = [...idSet];
      }
    }

    const query = {
      status: { $nin: unavailableStatuses },
      ...(bookedIds.length ? { _id: { $nin: bookedIds } } : {})
    };

    let availableTools = await Tool.find(query).sort({ number: 1 });

    // Prefer tools with stock; if none, still return rentable tools (legacy records may lack stock)
    const withStock = availableTools.filter((t) => (t.stock ?? 1) > 0);
    if (withStock.length > 0) {
      availableTools = withStock;
    }

    res.json(availableTools);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new booking
router.post('/', authMiddleware, async (req, res) => {
  const { pickupDate, returnDate } = req.body;
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const accessories = Array.isArray(req.body.accessories) ? req.body.accessories : [];

  try {
    if (items.length === 0 && accessories.length === 0) {
      return res.status(400).json({ message: 'Please select at least one tool or accessory.' });
    }

    const validItems = items.filter((it) => isValidObjectId(it.tool));

    if (validItems.length > 0) {
      const toolId = validItems[0].tool;
      const toolDoc = await Tool.findById(toolId);
      if (!toolDoc) {
        return res.status(404).json({ message: 'Tool not found' });
      }
      const requestedQty = validItems[0].quantity || 1;
      if (toolDoc.stock < requestedQty && toolDoc.status !== 'Available') {
        return res.status(400).json({ message: 'Not enough stock available for this tool.' });
      }
    }

    const bookingSeq = await getNextSequence('bookingId');
    const bookingId = `BK-${bookingSeq.toString().padStart(4, '0')}`;

    const totals = calcBookingTotals({ ...req.body, items: validItems, accessories });
    const bookingPayload = {
      ...req.body,
      items: validItems,
      accessories,
      ...totals,
      securityDeposit: Number(req.body.securityDeposit ?? req.body.deposit) || 0
    };
    if (validItems.length === 0) {
      delete bookingPayload.tool;
    }

    const booking = new Booking(bookingPayload);
    booking.bookingId = bookingId;

    if (validItems.length > 0) {
      const firstTool = validItems[0].tool;
      booking.tool = typeof firstTool === 'object' ? firstTool._id : firstTool;
      booking.items = validItems.map((it) => ({
        ...it,
        tool: typeof it.tool === 'object' ? it.tool._id : it.tool
      }));
    } else {
      booking.tool = undefined;
      booking.items = [];
    }

    booking.updatedBy = req.user.id;
    booking.updatedByName = req.user.name;

    const newBooking = await booking.save();
    console.log(`✅ Booking Saved: ${newBooking._id}`);

    // 1. Update Tool Stock & Status
    if (newBooking.items && newBooking.items.length > 0) {
      for (const item of newBooking.items) {
        try {
          const qty = Number(item.quantity) || 1;
          const updatedTool = await Tool.findByIdAndUpdate(item.tool, { $inc: { stock: -qty } }, { new: true });
          if (updatedTool && updatedTool.stock <= 0) {
            await Tool.findByIdAndUpdate(item.tool, { status: 'Booked' });
          }
        } catch (tErr) { console.error('Tool status update fail:', tErr.message); }
      }
    }

    // 2. Update Accessory Stock (Immediate & Explicit)
    if (req.body.accessories && Array.isArray(req.body.accessories)) {
      for (const accItem of req.body.accessories) {
        try {
          const id = accItem.accessory || accItem.accessoryId;
          if (!id) continue;
          
          const qty = Number(accItem.quantity) || 0;
          if (qty <= 0) continue;

          console.log(`EMERGENCY STOCK FIX: Subtracting ${qty} from Accessory ${id}`);
          const updated = await Accessory.findByIdAndUpdate(
            id,
            { $inc: { stock: -qty } },
            { new: true }
          );
          
          if (updated) {
            let status = 'In Stock';
            if (updated.stock <= 0) status = 'Out of Stock';
            else if (updated.stock < 5) status = 'Low Stock';
            await Accessory.findByIdAndUpdate(id, { status });
          }
        } catch (accErr) {
          console.error('Accessory stock decrement failed in POST:', accErr.message);
        }
      }
    }

    // 3. Handle Other Side Effects (Invoice, SMS, etc)
    
    const sideEffects = await processBookingSideEffects(newBooking.toObject(), { isNew: true });
    const responseObj = newBooking.toObject();
    responseObj.generatedSms = sideEffects?.generatedSms;
    responseObj.smsSent = sideEffects?.smsSent ?? false;
    responseObj.smsError = sideEffects?.smsError ?? null;
    res.status(201).json(responseObj);

  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Helper for booking side effects
async function processBookingSideEffects(newBooking, options = {}) {
    const { isNew = false, oldStatus = null, previousAdvance = 0 } = options;
    // 1. Auto-generate or Update invoice
    try {
      const existingInvoice = await Invoice.findOne({ bookingId: newBooking._id });
      
      const accList = Array.isArray(newBooking.accessories) ? newBooking.accessories : [];
      const accDesc = accList.map(a => `${a.name} (x${a.quantity})`).join(', ');

      const itemsList = Array.isArray(newBooking.items) ? newBooking.items : [];
      const toolsDesc = itemsList.map(it => `${it.toolNumber} (${it.model})`).join(', ');
      const toolsNo = itemsList.map(it => it.toolNumber).join(' / ');
      const accOnlyLabel = accList.map(a => a.name).filter(Boolean).join(' / ') || 'Accessories';
      const tNo = toolsNo || accOnlyLabel;

      const invoiceData = {
        date: new Date(),
        clientName: newBooking.clientName,
        clientPhone: newBooking.clientPhone || '',
        clientNic: newBooking.clientNic || '',
        toolNo: tNo,
        toolType: itemsList.length > 1 ? 'Multiple Tools' : (itemsList[0]?.category || (accList.length ? 'Accessories' : 'Tool')),
        jobDescription: `Rental: ${new Date(newBooking.pickupDate).toLocaleDateString()} - ${new Date(newBooking.returnDate).toLocaleDateString()}${toolsDesc ? `\nTools: ${toolsDesc}` : ''}${accDesc ? `\nAccessories: ${accDesc}` : ''}`,
        totalUnits: newBooking.totalDays || 1,
        unitType: 'Days',
        ratePerUnit: itemsList.length === 1 ? itemsList[0].dailyRate : 0,
        subtotal: newBooking.totalAmount || 0,
        totalAmount: newBooking.totalAmount || 0,
        advancePayment: newBooking.advancePayment || 0,
        balanceAmount: newBooking.balanceAmount || 0,
        bookingId: newBooking._id,
        accessories: accList.map(a => ({ 
          number: a.number,
          name: a.name, 
          quantity: a.quantity, 
          price: a.price 
        })),
        updatedBy: newBooking.updatedBy,
        updatedByName: newBooking.updatedByName,
        remarks: `Auto-updated from booking ${newBooking.bookingId}`
      };

      let linkedInvoiceId = existingInvoice?._id;
      let linkedInvoiceNo = existingInvoice?.invoiceNo;

      if (existingInvoice) {
        await Invoice.findByIdAndUpdate(existingInvoice._id, invoiceData);
        console.log('DEBUG: Existing invoice updated:', existingInvoice.invoiceNo);
      } else {
        const seq = await getNextSequence('invoiceNo');
        const year = new Date().getFullYear().toString().slice(-2);
        invoiceData.invoiceNo = `INV-${year}-${seq.toString().padStart(4, '0')}`;
        invoiceData.status = 'Draft';
        const newInvoice = new Invoice(invoiceData);
        await newInvoice.save();
        linkedInvoiceId = newInvoice._id;
        linkedInvoiceNo = newInvoice.invoiceNo || invoiceData.invoiceNo;
        console.log('DEBUG: New invoice created:', invoiceData.invoiceNo);
      }

      // Keep booking record linked to the invoice number for the UI
      if (linkedInvoiceId && linkedInvoiceNo) {
        await Booking.findByIdAndUpdate(newBooking._id, {
          invoiceId: linkedInvoiceId,
          invoiceNo: linkedInvoiceNo
        });
      }
    } catch (invErr) {
      console.error('Failed to sync invoice:', invErr);
    }

    // 2. Auto-save/update Client
    try {
      const targetName = (newBooking.clientName || '').trim();
      if (targetName) {
        const existingClient = await Client.findOne({
          name: { $regex: new RegExp(`^${targetName}$`, 'i') }
        });
        if (existingClient) {
          existingClient.totalHires = (existingClient.totalHires || 0) + 1;
          if (newBooking.clientPhone) existingClient.contact = newBooking.clientPhone;
          if (newBooking.customerIdFront) existingClient.customerIdFront = newBooking.customerIdFront;
          if (newBooking.customerIdBack) existingClient.customerIdBack = newBooking.customerIdBack;
          await existingClient.save();
        } else {
          const newClient = new Client({
            name: targetName,
            contact: newBooking.clientPhone || '',
            totalHires: 1,
            outstanding: newBooking.balanceAmount || 0,
            customerIdFront: newBooking.customerIdFront || '',
            customerIdBack: newBooking.customerIdBack || '',
            status: 'Active'
          });
          await newClient.save();
        }
      }
    } catch (clientErr) {
      console.error('Failed to auto-sync client:', clientErr.message);
    }

    // 3. Auto-sync to Payment Book
    try {
      const advAmt = parseFloat(newBooking.advancePayment) || 0;
      const totalAmt = parseFloat(newBooking.totalAmount) || 0;
      const balAmt = totalAmt - advAmt;
      const payStatus = advAmt >= totalAmt ? 'Paid' : advAmt > 0 ? 'Partial' : 'Pending';

      const itemsList = Array.isArray(newBooking.items) ? newBooking.items : [];
      const accListPay = Array.isArray(newBooking.accessories) ? newBooking.accessories : [];
      const tNo = itemsList.map(it => it.toolNumber).join(' / ')
        || accListPay.map(a => a.name).filter(Boolean).join(' / ')
        || 'Accessories';

      const paymentData = {
        date: newBooking.pickupDate || new Date(),
        client: newBooking.clientName,
        tool: tNo,
        days: newBooking.totalDays || 1,
        takenAmount: advAmt,
        hireAmount: totalAmt,
        transportCharge: newBooking.transportCharge || 0,
        otherCharges: newBooking.extraCharges || 0,
        balance: balAmt,
        status: payStatus,
        paymentMethod: newBooking.paymentMethod || 'Cash',
        address: newBooking.notes || 'Rental',
        city: newBooking.pickupLocation || 'Rental',
        bookingId: newBooking._id
      };
      await Payment.findOneAndUpdate(
        { bookingId: newBooking._id },
        { ...paymentData, accountId: newBooking.accountId || undefined },
        { upsert: true, new: true }
      );
      
      // UPDATE BALANCE IF BANK TRANSFER
      if (newBooking.paymentMethod === 'Bank Transfer' && newBooking.accountId) {
        await Account.findByIdAndUpdate(newBooking.accountId, { $inc: { balance: advAmt } });
      }
      
      console.log('DEBUG: Payment record synced for booking:', newBooking.bookingId);
      // 4. Accessory Stock update now handled explicitly in routes (POST/PUT)
      // 5. Send Confirmation SMS using customizable template
      
      let generatedSms = '';
      let smsSent = false;
      let smsError = null;

      const shouldSendSms = isNew || (oldStatus !== 'Confirmed' && newBooking.status === 'Confirmed');

      if (shouldSendSms) {
        try {
          if (newBooking.clientPhone) {
            generatedSms = await buildSMSMessage('smsBookingTemplate', newBooking);
            if (generatedSms) {
              const result = await sendSMS(newBooking.clientPhone, generatedSms);
              smsSent = !!result.success;
              if (!result.success) smsError = result.error || 'SMS send failed';
            }
          }
        } catch (smsErr) {
          console.error('❌ SMS dispatch side-effect failed:', smsErr.message);
          smsError = smsErr.message;
        }
      }

      // Send advance receipt when payment increases (not on initial booking confirm SMS)
      const prevAdv = Number(previousAdvance) || 0;
      const newAdv = parseFloat(newBooking.advancePayment) || 0;
      const advanceDelta = newAdv - prevAdv;
      if (advanceDelta > 0 && !isNew) {
        const advResult = await sendAdvancePaymentSms(
          newBooking,
          advanceDelta,
          newBooking.paymentMethod || 'Cash'
        );
        if (advResult.smsSent && !smsSent) smsSent = true;
        if (advResult.smsError && !smsError) smsError = advResult.smsError;
      }

      return { generatedSms, smsSent, smsError };

    } catch (payErr) {
      console.error('Failed to create payment record:', payErr.message);
      return { generatedSms: '', smsSent: false, smsError: payErr.message };
    }
}

// Bulk create bookings (for multiple tools)
router.post('/bulk', authMiddleware, async (req, res) => {
  try {
    const { bookings } = req.body;
    if (!bookings || !Array.isArray(bookings)) {
      console.warn('[BULK BOOKING] Invalid data received:', req.body);
      return res.status(400).json({ message: 'Invalid bulk data' });
    }

    console.log(`[BULK BOOKING] Starting processing for ${bookings.length} items...`);

    const bookingSeq = await getNextSequence('bookingId');
    const commonId = `BK-${bookingSeq.toString().padStart(4, '0')}`;
    
    const results = [];
    for (let i = 0; i < bookings.length; i++) {
      try {
        const bData = bookings[i];
        const toolCode = bookings.length > 1 ? `-${String.fromCharCode(65 + i)}` : '';
        const totals = calcBookingTotals(bData);

        const booking = new Booking({
          ...bData,
          ...totals,
          securityDeposit: Number(bData.securityDeposit ?? bData.deposit) || 0
        });
        booking.bookingId = `${commonId}${toolCode}`;
        
        // Harden IDs and add audit fields
        if (bData.items && bData.items.length > 0) {
          const firstTool = bData.items[0].tool;
          booking.tool = typeof firstTool === 'object' ? firstTool._id : firstTool;
          booking.items = bData.items.map(it => ({
            ...it,
            tool: typeof it.tool === 'object' ? it.tool._id : it.tool
          }));
        }
        
        booking.updatedBy = req.user.id;
        booking.updatedByName = req.user.name;

        const saved = await booking.save();
        console.log(`[BULK] Saved item ${i+1}/${bookings.length}: ${booking.bookingId}`);
        
        // Process side effects (invoice, client, payment, stock)
        // We await this to ensure sequential processing
        
        const sideEffects = await processBookingSideEffects(saved.toObject(), { isNew: true });
        const obj = saved.toObject();
        obj.generatedSms = sideEffects?.generatedSms;
        obj.smsSent = sideEffects?.smsSent ?? false;
        obj.smsError = sideEffects?.smsError ?? null;
        results.push(obj);

      } catch (itemErr) {
        console.error(`[BULK] Failed at item ${i+1}:`, itemErr.message);
        // Continue with other items or throw if critical
      }
    }
    
    if (results.length === 0) {
      throw new Error('All booking items failed to save.');
    }

    res.status(201).json({ 
      message: `Successfully processed ${results.length} tools.`,
      bookings: results 
    });
  } catch (err) {
    console.error('CRITICAL BULK ERROR:', err);
    res.status(500).json({ message: err.message });
  }
});

// Update booking
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const updateItems = Array.isArray(req.body.items) ? req.body.items.filter((it) => isValidObjectId(it.tool)) : null;
    const toolIdForOverlap = updateItems?.length
      ? updateItems[0].tool
      : (isValidObjectId(req.body.tool) ? req.body.tool : null);

    if ((req.body.pickupDate || req.body.returnDate) && toolIdForOverlap) {
        const start = new Date(req.body.pickupDate || booking.pickupDate);
        const end = new Date(req.body.returnDate || booking.returnDate);
        const toolId = toolIdForOverlap;

        const overlapping = await Booking.findOne({
            _id: { $ne: booking._id },
            tool: toolId,
            status: { $ne: 'Cancelled' },
            $or: [
                { pickupDate: { $lt: end }, returnDate: { $gt: start } }
            ]
        });

        if (overlapping) {
            return res.status(400).json({ message: 'Tool is already booked for these dates' });
        }
    }

    if (req.body.items && Array.isArray(req.body.items)) {
      req.body.items = req.body.items
        .map((it) => ({
          ...it,
          tool: typeof it.tool === 'object' ? it.tool._id : it.tool
        }))
        .filter((it) => isValidObjectId(it.tool));

      if (req.body.items.length > 0) {
        req.body.tool = req.body.items[0].tool;
      } else {
        delete req.body.tool;
      }
    } else if (isValidObjectId(req.body.tool)) {
      req.body.tool = typeof req.body.tool === 'object' ? req.body.tool._id : req.body.tool;
    } else {
      delete req.body.tool;
    }

    // Sanitize accountId
    if (req.body.accountId === '') req.body.accountId = null;

    const totals = calcBookingTotals({ ...booking.toObject(), ...req.body });
    const updatePayload = {
      ...req.body,
      ...totals,
      securityDeposit: Number(req.body.securityDeposit ?? req.body.deposit ?? booking.securityDeposit) || 0,
      updatedBy: req.user.id,
      updatedByName: req.user.name
    };

    const hasToolItems = Array.isArray(updatePayload.items) && updatePayload.items.length > 0;
    const updatedBooking = hasToolItems
      ? await Booking.findByIdAndUpdate(req.params.id, updatePayload, { new: true })
      : await Booking.findByIdAndUpdate(
          req.params.id,
          { $set: { ...updatePayload, items: [] }, $unset: { tool: 1 } },
          { new: true }
        );
    
    // Auto-update linked invoice and client
    await processBookingSideEffects(updatedBooking.toObject(), {
      oldStatus: booking.status,
      previousAdvance: booking.advancePayment || 0
    });
    
    res.json(updatedBooking);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Partial Return / Return
router.put('/:id/partial-return', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const { returnDate, returnedItems, returnedAccessories, paidNotReturnedItems, paidNotReturnedAccessories, returnedWithoutPayItems, returnedWithoutPayAccessories, paymentAmount, paymentMethod, accountId } = req.body;
    const returnDateObj = new Date(returnDate || Date.now());

    let allFullyReturned = true;

    // Process items
    if (booking.items && booking.items.length > 0) {
      for (const item of booking.items) {
        const returnedData = (returnedItems || []).find(r => String(r.id) === String(item._id));
        const rwopData = (returnedWithoutPayItems || []).find(r => String(r.id) === String(item._id));
        const pnrData = (paidNotReturnedItems || []).find(r => String(r.id) === String(item._id));
        
        const combinedData = pnrData || returnedData || rwopData;
        if (combinedData && combinedData.amountPaid !== undefined) {
           item.amountPaid = Number(combinedData.amountPaid) || 0;
           const itemRate = Number(item.dailyRate) || 0;
           const qty = Number(item.quantity) || 1;
           const days = Number(item.rentalDays) || Number(booking.totalDays) || 1;
           item.amountDue = Math.max(0, (itemRate * qty * days) - item.amountPaid);
        }

        if (returnedData && returnedData.quantity > 0) {
          const qty = Number(returnedData.quantity);
          const itemDate = returnedData.date ? new Date(returnedData.date) : returnDateObj;
          item.returnDates = item.returnDates || [];
          item.returnDates.push({ quantity: qty, date: itemDate });
          item.returnedQuantity = (item.returnedQuantity || 0) + qty;
          
          // Calculate and store overdue penalties
          const expectedRet = item.expectedReturnDate ? new Date(item.expectedReturnDate) : new Date(booking.returnDate);
          expectedRet.setHours(0, 0, 0, 0);
          const actRet = new Date(itemDate);
          actRet.setHours(0, 0, 0, 0);
          
          if (actRet > expectedRet) {
            const overdueDays = Math.ceil((actRet - expectedRet) / (1000 * 60 * 60 * 24));
            const penaltyRate = Number(item.overdueChargePerDay) || 500;
            const penalty = overdueDays * penaltyRate * qty;
            
            if (overdueDays > (item.overdueDays || 0)) {
              item.overdueDays = overdueDays;
            }
            item.totalOverdueCharge = (item.totalOverdueCharge || 0) + penalty;
            item.returnStatus = 'Overdue';
          }
          
          // Restore Tool Stock
          if (isValidObjectId(item.tool)) {
            const updatedTool = await Tool.findByIdAndUpdate(item.tool, { $inc: { stock: qty } }, { new: true });
            if (updatedTool && updatedTool.stock > 0 && updatedTool.status === 'Booked') {
              await Tool.findByIdAndUpdate(item.tool, { status: 'Available' });
            }
          }
        }
        
        // Returned W/O Pay
        if (rwopData && rwopData.quantity > 0) {
          const qty = Number(rwopData.quantity);
          const itemDate = rwopData.date ? new Date(rwopData.date) : returnDateObj;
          item.returnDates = item.returnDates || [];
          item.returnDates.push({ quantity: qty, date: itemDate });
          item.returnedQuantity = (item.returnedQuantity || 0) + qty;
          
          // Overdue calculation
          const expectedRet = item.expectedReturnDate ? new Date(item.expectedReturnDate) : new Date(booking.returnDate);
          expectedRet.setHours(0, 0, 0, 0);
          const actRet = new Date(itemDate);
          actRet.setHours(0, 0, 0, 0);
          if (actRet > expectedRet) {
            const overdueDays = Math.ceil((actRet - expectedRet) / (1000 * 60 * 60 * 24));
            const penaltyRate = Number(item.overdueChargePerDay) || 500;
            const penalty = overdueDays * penaltyRate * qty;
            if (overdueDays > (item.overdueDays || 0)) item.overdueDays = overdueDays;
            item.totalOverdueCharge = (item.totalOverdueCharge || 0) + penalty;
          }
          
          item.returnStatus = 'Returned W/O Pay';

          // Restore stock
          if (isValidObjectId(item.tool)) {
            const updatedTool = await Tool.findByIdAndUpdate(item.tool, { $inc: { stock: qty } }, { new: true });
            if (updatedTool && updatedTool.stock > 0 && updatedTool.status === 'Booked') {
              await Tool.findByIdAndUpdate(item.tool, { status: 'Available' });
            }
          }
        }
        
        // Paid Not Returned
        if (pnrData && pnrData.quantity > 0) {
          const qty = Number(pnrData.quantity);
          const itemDate = pnrData.date ? new Date(pnrData.date) : returnDateObj;
          item.returnDates = item.returnDates || [];
          item.returnDates.push({ quantity: qty, date: itemDate });
          item.returnedQuantity = (item.returnedQuantity || 0) + qty;
          item.returnStatus = 'Paid Not Returned';
          // DO NOT restore tool stock
        }

        if ((item.returnedQuantity || 0) < (item.quantity || 1)) {
          allFullyReturned = false;
        }
      }
    }

    // Process accessories
    if (booking.accessories && booking.accessories.length > 0) {
      for (const acc of booking.accessories) {
        const returnedData = (returnedAccessories || []).find(r => String(r.id) === String(acc._id));
        const rwopAccData = (returnedWithoutPayAccessories || []).find(r => String(r.id) === String(acc._id));
        const pnrAccData = (paidNotReturnedAccessories || []).find(r => String(r.id) === String(acc._id));
        
        const combinedData = pnrAccData || returnedData || rwopAccData;
        if (combinedData && combinedData.amountPaid !== undefined) {
           acc.amountPaid = Number(combinedData.amountPaid) || 0;
           const accRate = Number(acc.price) || 0;
           const qty = Number(acc.quantity) || 1;
           const days = Number(acc.rentalDays) || Number(booking.totalDays) || 1;
           acc.amountDue = Math.max(0, (accRate * qty * days) - acc.amountPaid);
        }

        if (returnedData && returnedData.quantity > 0) {
          const qty = Number(returnedData.quantity);
          const accDate = returnedData.date ? new Date(returnedData.date) : returnDateObj;
          acc.returnDates = acc.returnDates || [];
          acc.returnDates.push({ quantity: qty, date: accDate });
          acc.returnedQuantity = (acc.returnedQuantity || 0) + qty;
          
          // Calculate and store overdue penalties
          const expectedRet = acc.expectedReturnDate ? new Date(acc.expectedReturnDate) : new Date(booking.returnDate);
          expectedRet.setHours(0, 0, 0, 0);
          const actRet = new Date(accDate);
          actRet.setHours(0, 0, 0, 0);
          
          if (actRet > expectedRet) {
            const overdueDays = Math.ceil((actRet - expectedRet) / (1000 * 60 * 60 * 24));
            const penaltyRate = Number(acc.overdueChargePerDay) || 500;
            const penalty = overdueDays * penaltyRate * qty;
            
            if (overdueDays > (acc.overdueDays || 0)) {
              acc.overdueDays = overdueDays;
            }
            acc.totalOverdueCharge = (acc.totalOverdueCharge || 0) + penalty;
            acc.returnStatus = 'Overdue';
          }
          
          // Restore Accessory Stock
          if (isValidObjectId(acc.accessory)) {
            const updatedAcc = await Accessory.findByIdAndUpdate(acc.accessory, { $inc: { stock: qty } }, { new: true });
            if (updatedAcc) {
              let status = 'In Stock';
              if (updatedAcc.stock <= 0) status = 'Out of Stock';
              else if (updatedAcc.stock < 5) status = 'Low Stock';
              await Accessory.findByIdAndUpdate(acc.accessory, { status });
            }
          }
        }

        // Returned W/O Pay Accessories
        if (rwopAccData && rwopAccData.quantity > 0) {
          const qty = Number(rwopAccData.quantity);
          const accDate = rwopAccData.date ? new Date(rwopAccData.date) : returnDateObj;
          acc.returnDates = acc.returnDates || [];
          acc.returnDates.push({ quantity: qty, date: accDate });
          acc.returnedQuantity = (acc.returnedQuantity || 0) + qty;
          
          const expectedRet = acc.expectedReturnDate ? new Date(acc.expectedReturnDate) : new Date(booking.returnDate);
          expectedRet.setHours(0, 0, 0, 0);
          const actRet = new Date(accDate);
          actRet.setHours(0, 0, 0, 0);
          if (actRet > expectedRet) {
            const overdueDays = Math.ceil((actRet - expectedRet) / (1000 * 60 * 60 * 24));
            const penaltyRate = Number(acc.overdueChargePerDay) || 500;
            const penalty = overdueDays * penaltyRate * qty;
            if (overdueDays > (acc.overdueDays || 0)) acc.overdueDays = overdueDays;
            acc.totalOverdueCharge = (acc.totalOverdueCharge || 0) + penalty;
          }

          acc.returnStatus = 'Returned W/O Pay';

          if (isValidObjectId(acc.accessory)) {
            const updatedAcc = await Accessory.findByIdAndUpdate(acc.accessory, { $inc: { stock: qty } }, { new: true });
            if (updatedAcc) {
              let status = 'In Stock';
              if (updatedAcc.stock <= 0) status = 'Out of Stock';
              else if (updatedAcc.stock < 5) status = 'Low Stock';
              await Accessory.findByIdAndUpdate(acc.accessory, { status });
            }
          }
        }

        // Paid Not Returned
        if (pnrAccData && pnrAccData.quantity > 0) {
          const qty = Number(pnrAccData.quantity);
          const accDate = pnrAccData.date ? new Date(pnrAccData.date) : returnDateObj;
          acc.returnDates = acc.returnDates || [];
          acc.returnDates.push({ quantity: qty, date: accDate });
          acc.returnedQuantity = (acc.returnedQuantity || 0) + qty;
          acc.returnStatus = 'Paid Not Returned';
          // DO NOT restore accessory stock
        }

        if ((acc.returnedQuantity || 0) < (acc.quantity || 1)) {
          allFullyReturned = false;
        }
      }
    }

    booking.actualReturnDate = returnDateObj;
    if (allFullyReturned) {
      booking.status = 'Returned';
      
      const expectedDate = new Date(booking.returnDate);
      if (returnDateObj < expectedDate) {
        const diffTime = Math.abs(expectedDate - returnDateObj);
        booking.earlyReturnDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    const previousAdvance = booking.advancePayment || 0;

    if (paymentAmount !== undefined) {
      booking.advancePayment = (booking.advancePayment || 0) + Number(paymentAmount);
    }
    if (paymentMethod) booking.paymentMethod = paymentMethod;
    if (accountId) booking.accountId = accountId;

    const totals = calcBookingTotals(booking.toObject());
    booking.baseAmount = totals.baseAmount;
    booking.totalAmount = totals.totalAmount;
    booking.balanceAmount = totals.balanceAmount;
    booking.extraCharges = totals.extraCharges;
    booking.updatedBy = req.user.id;
    booking.updatedByName = req.user.name;

    const savedBooking = await booking.save();
    await processBookingSideEffects(savedBooking.toObject(), {
      oldStatus: booking.status,
      previousAdvance
    });

    // Send return confirmation SMS
    try {
      const phone = savedBooking.clientPhone;
      if (phone) {
        const settings = await Setting.findOne();
        const { generateBillViewUrl } = require('../utils/billLink');
        const billUrl = generateBillViewUrl(savedBooking._id);

        let smsText = settings?.smsReturnTemplate;
        const companyName = 'MAGGI TOOLS';
        const pickupDateObj = new Date(savedBooking.pickupDate);
        pickupDateObj.setHours(0, 0, 0, 0);

        // Build per-item rented days breakdown
        const buildRentedDaysBreakdown = () => {
          const lines = [];
          (savedBooking.items || []).forEach(it => {
            const name = `${it.toolNumber || ''} - ${it.model || 'Tool'}`;
            const lastReturn = it.returnDates?.length > 0 ? it.returnDates[it.returnDates.length - 1].date : savedBooking.returnDate;
            const retDate = new Date(lastReturn);
            retDate.setHours(0, 0, 0, 0);
            let rentedDays = Math.round((retDate - pickupDateObj) / (1000 * 60 * 60 * 24));
            if (rentedDays <= 0) rentedDays = 0; else rentedDays += 1;
            const itemDays = it.rentalDays || savedBooking.totalDays || rentedDays || 1;
            lines.push(`• ${name} - ${rentedDays} day${rentedDays !== 1 ? 's' : ''} rented (${itemDays} day${itemDays !== 1 ? 's' : ''} booked)`);
          });
          (savedBooking.accessories || []).forEach(ac => {
            const name = ac.name || 'Accessory';
            const lastReturn = ac.returnDates?.length > 0 ? ac.returnDates[ac.returnDates.length - 1].date : savedBooking.returnDate;
            const retDate = new Date(lastReturn);
            retDate.setHours(0, 0, 0, 0);
            let rentedDays = Math.round((retDate - pickupDateObj) / (1000 * 60 * 60 * 24));
            if (rentedDays <= 0) rentedDays = 0; else rentedDays += 1;
            const itemDays = ac.rentalDays || savedBooking.totalDays || rentedDays || 1;
            lines.push(`• ${name} - ${rentedDays} day${rentedDays !== 1 ? 's' : ''} rented (${itemDays} day${itemDays !== 1 ? 's' : ''} booked)`);
          });
          return lines.join('\n');
        };

        if (!smsText || !smsText.trim()) {
          // Build a default return confirmation message with rented days
          const paid = savedBooking.advancePayment || 0;
          const balance = Math.max(0, (savedBooking.totalAmount || 0) - paid);
          const itemsBreakdown = buildRentedDaysBreakdown();
          smsText = `${companyName}\nReturn Confirmed!\nDear ${savedBooking.clientName || 'Customer'}, your return has been processed.\n${itemsBreakdown}\nTotal: LKR ${(savedBooking.totalAmount || 0).toLocaleString()}\nPaid: LKR ${paid.toLocaleString()}\nBalance: LKR ${balance.toLocaleString()}\nView Bill: ${billUrl}\nThank you!`;
        } else {
          // Replace placeholders
          const paid = savedBooking.advancePayment || 0;
          const balance = Math.max(0, (savedBooking.totalAmount || 0) - paid);
          const itemsBreakdown = buildRentedDaysBreakdown();
          smsText = smsText
            .replace(/{clientName}/g, savedBooking.clientName || '')
            .replace(/{companyName}/g, companyName)
            .replace(/{totalAmount}/g, `LKR ${(savedBooking.totalAmount || 0).toLocaleString()}`)
            .replace(/{advancePayment}/g, `LKR ${paid.toLocaleString()}`)
            .replace(/{balanceAmount}/g, `LKR ${balance.toLocaleString()}`)
            .replace(/{itemsBreakdown}/g, itemsBreakdown)
            .replace(/{billLink}/g, billUrl);
        }

        await sendSMS(phone, smsText);
      }
    } catch (smsErr) {
      console.error('Return SMS failed (non-critical):', smsErr.message);
    }

    res.json(savedBooking);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete booking
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const bookingId = req.params.id;
    
    // 1. Delete associated Invoice
    try {
      await Invoice.deleteMany({ bookingId: bookingId });
      console.log(`[DELETE] Deleted linked invoices for booking: ${bookingId}`);
    } catch (invErr) {
      console.error('Failed to delete linked invoice:', invErr.message);
    }

    // 2. Delete linked Payment
    try {
      await Payment.findOneAndDelete({ bookingId: bookingId });
      console.log(`[DELETE] Deleted linked payment for booking: ${bookingId}`);
    } catch (payErr) {
      console.error('Failed to delete linked payment:', payErr.message);
    }

    // 3. Delete the Booking record
    await Booking.findByIdAndDelete(bookingId);
    
    res.json({ message: 'Booking and linked invoice deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get customer history by NIC
router.get('/customer/:nic', authMiddleware, async (req, res) => {
  try {
    const { nic } = req.params;
    const cleanNic = (nic || '').trim();
    
    const lastBooking = await Booking.findOne({ 
      clientNic: { $regex: new RegExp(`^${cleanNic}`, 'i') } 
    }).populate('tool').sort({ createdAt: -1 });

    // Also check Client collection for ID photos and details
    const clientRecord = await Client.findOne({
      nic: { $regex: new RegExp(`^${cleanNic}`, 'i') }
    });
    
    if (!lastBooking && !clientRecord) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const history = lastBooking ? await Booking.find({ clientNic: lastBooking.clientNic })
      .populate('tool')
      .sort({ createdAt: -1 })
      .limit(5) : [];
    
    res.json({
      details: {
        name: clientRecord?.name || lastBooking?.clientName,
        phone: clientRecord?.contact || lastBooking?.clientPhone,
        nic: clientRecord?.nic || lastBooking?.clientNic,
        customerIdFront: clientRecord?.customerIdFront || lastBooking?.customerIdFront,
        customerIdBack: clientRecord?.customerIdBack || lastBooking?.customerIdBack,
        conditionOnPickup: lastBooking?.conditionOnPickup
      },
      history: history.map(h => ({
        _id: h._id,
        date: h.pickupDate,
        tool: h.tool ? `${h.tool.number} - ${h.tool.model}` : 'Unknown',
        price: h.totalAmount,
        dailyRate: h.dailyRate,
        status: h.status
      }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send manual reminder SMS (supports custom message from UI)
router.post('/:id/remind', authMiddleware, async (req, res) => {
  try {
    const b = await Booking.findById(req.params.id).populate('tool');
    if (!b) return res.status(404).json({ message: 'Booking not found' });
    
    if (b.clientPhone) {
      const bookingObj = b.toObject();
      const custom =
        (req.body.customMessage || req.body.message || req.body.smsText || '').trim();

      let msg = custom;
      if (!msg) {
        msg = await buildSMSMessage('smsBookingTemplate', bookingObj);
      }
      if (!msg) {
        return res.status(400).json({ message: 'SMS message is empty.' });
      }

      console.log(`[SMS] Sending bill (${msg.length} chars) to ${b.clientPhone}`);
      const result = await sendSMS(b.clientPhone, msg);
      if (!result.success) {
        return res.status(500).json({ message: result.error || 'Failed to send SMS', ...result });
      }
      return res.json({ ...result, messageLength: msg.length });
    }
    res.status(400).json({ message: 'No phone number found' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Process automatic follow-up SMS for overdue bookings
router.post('/process-followups', authMiddleware, async (req, res) => {
  try {
    const settings = await Setting.findOne();
    const followupDays = settings?.followupDays || 14;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - followupDays);

    // Find active/confirmed bookings that started more than X days ago and haven't been followed up
    const overdueBookings = await Booking.find({
      status: { $in: ['Active', 'Confirmed'] },
      pickupDate: { $lte: cutoffDate },
      followupSent: { $ne: true },
      clientPhone: { $exists: true, $ne: '' }
    }).populate('tool');

    let sent = 0;
    let failed = 0;

    for (const booking of overdueBookings) {
      try {
        const msg = await buildSMSMessage('smsFollowupTemplate', booking.toObject());
        if (msg && booking.clientPhone) {
          await sendSMS(booking.clientPhone, msg);
          await Booking.findByIdAndUpdate(booking._id, {
            followupSent: true,
            followupSentAt: new Date()
          });
          sent++;
        }
      } catch (smsErr) {
        console.error(`Follow-up SMS failed for ${booking.bookingId}:`, smsErr.message);
        failed++;
      }
    }

    res.json({
      message: `Follow-up processing complete. Sent: ${sent}, Failed: ${failed}, Total eligible: ${overdueBookings.length}`,
      sent,
      failed,
      total: overdueBookings.length
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get full client details with all bookings and payments
router.get('/client-details/:clientName', authMiddleware, async (req, res) => {
  try {
    const { clientName } = req.params;
    const decodedName = decodeURIComponent(clientName).trim();

    // Find client record
    const client = await Client.findOne({
      name: { $regex: new RegExp(`^${decodedName}$`, 'i') }
    });

    // Find all bookings for this client
    const bookings = await Booking.find({
      clientName: { $regex: new RegExp(`^${decodedName}$`, 'i') }
    }).populate('tool').sort({ createdAt: -1 });

    // Find all payments for this client
    const payments = await Payment.find({
      client: { $regex: new RegExp(`^${decodedName}$`, 'i') }
    }).sort({ date: -1 });

    // Calculate totals
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalPaid = payments.reduce((sum, p) => sum + (p.takenAmount || 0), 0);
    const totalOutstanding = bookings.reduce((sum, b) => sum + Math.max(0, b.balanceAmount || 0), 0);
    const paidBookings = bookings.filter(b => (b.balanceAmount || 0) <= 0).length;
    const unpaidBookings = bookings.filter(b => (b.balanceAmount || 0) > 0).length;

    res.json({
      client: client || { name: decodedName },
      bookings: bookings.map(b => ({
        _id: b._id,
        bookingId: b.bookingId,
        tool: b.items?.map(it => it.toolNumber).join(', ') || (b.tool ? b.tool.number : '—'),
        pickupDate: b.pickupDate,
        returnDate: b.returnDate,
        totalAmount: b.totalAmount,
        balanceAmount: b.balanceAmount,
        advancePayment: b.advancePayment,
        status: b.status,
        paymentMethod: b.paymentMethod
      })),
      payments: payments.map(p => ({
        _id: p._id,
        date: p.date,
        tool: p.tool,
        takenAmount: p.takenAmount,
        hireAmount: p.hireAmount,
        balance: p.balance,
        status: p.status,
        paymentMethod: p.paymentMethod
      })),
      summary: {
        totalBookings,
        totalRevenue,
        totalPaid,
        totalOutstanding,
        paidBookings,
        unpaidBookings
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get overdue report (all bookings with overdue items)
router.get('/reports/overdue', authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({
      status: { $in: ['Active', 'Confirmed'] },
      $or: [
        { 'items.returnStatus': 'Overdue' },
        { 'accessories.returnStatus': 'Overdue' },
        { totalOverdueCharges: { $gt: 0 } }
      ]
    }).sort({ totalOverdueCharges: -1 }).lean();

    const report = bookings.map(b => {
      const overdueItems = [
        ...(b.items || []).filter(it => it.returnStatus === 'Overdue').map(it => ({
          type: 'Tool',
          name: `${it.toolNumber || ''} - ${it.model || ''}`,
          expectedReturn: it.expectedReturnDate || b.returnDate,
          overdueDays: it.overdueDays || 0,
          chargePerDay: it.overdueChargePerDay || 0,
          totalCharge: it.totalOverdueCharge || 0,
          quantity: (it.quantity || 1) - (it.returnedQuantity || 0)
        })),
        ...(b.accessories || []).filter(ac => ac.returnStatus === 'Overdue').map(ac => ({
          type: 'Accessory',
          name: ac.name || '',
          expectedReturn: ac.expectedReturnDate || b.returnDate,
          overdueDays: ac.overdueDays || 0,
          chargePerDay: ac.overdueChargePerDay || 0,
          totalCharge: ac.totalOverdueCharge || 0,
          quantity: (ac.quantity || 1) - (ac.returnedQuantity || 0)
        }))
      ];
      return {
        _id: b._id,
        bookingId: b.bookingId,
        clientName: b.clientName,
        clientPhone: b.clientPhone,
        totalOverdueDays: b.totalOverdueDays || 0,
        totalOverdueCharges: b.totalOverdueCharges || 0,
        totalAmount: b.totalAmount || 0,
        balanceAmount: b.balanceAmount || 0,
        status: b.status,
        overdueItems
      };
    });

    const totalOverdueRevenue = report.reduce((s, r) => s + r.totalOverdueCharges, 0);
    const totalOutstanding = report.reduce((s, r) => s + r.balanceAmount, 0);

    res.json({
      report,
      summary: {
        totalOverdueBookings: report.length,
        totalOverdueRevenue,
        totalOutstanding,
        totalOverdueItems: report.reduce((s, r) => s + r.overdueItems.length, 0)
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single booking (MUST be at the end to avoid intercepting other routes)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).lean();
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── OVERDUE MANAGEMENT ROUTES ──────────────────────────────────────────────

// Process overdue charges for all active bookings (call daily via cron or manually)
router.post('/process-overdue-charges', authMiddleware, async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (settings) {
      const oldDefault = 'Dear {clientName}, This is a reminder from {companyName}. Your rental of {itemName} is overdue by {overdueDays} days. Current overdue charge: LKR {overdueCharge}. Please return the item immediately.';
      if (!settings.smsOverdueReminderTemplate || settings.smsOverdueReminderTemplate === oldDefault) {
        settings.smsOverdueReminderTemplate = 'Dear {clientName}, This is a reminder from {companyName}. Your rental of {itemName} is overdue by {overdueDays} days. Added rent: LKR {dailyRate} per day. Total overdue: LKR {overdueCharge}. Please return the item immediately.';
        await settings.save();
      }
    }
    const enableOverdue = settings?.enableOverdueCharges !== false;
    if (!enableOverdue) {
      return res.json({ message: 'Overdue charges are disabled in settings.', processed: 0 });
    }
    const defaultRate = Number(settings?.defaultOverdueChargePerDay) || 500;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeBookings = await Booking.find({
      status: { $in: ['Active', 'Confirmed'] }
    });

    let processed = 0;
    let smsSent = 0;
    let smsFailed = 0;

    for (const booking of activeBookings) {
      let bookingChanged = false;
      let bookingTotalOverdueDays = 0;
      let bookingTotalOverdueCharges = 0;

      // Process tool items
      for (const item of (booking.items || [])) {
        const expectedReturn = item.expectedReturnDate ? new Date(item.expectedReturnDate) : new Date(booking.returnDate);
        expectedReturn.setHours(0, 0, 0, 0);
        const returnedQty = item.returnedQuantity || 0;
        const totalQty = item.quantity || 1;
        if (returnedQty >= totalQty) {
          if (item.returnStatus !== 'Returned') { item.returnStatus = 'Returned'; bookingChanged = true; }
          continue;
        }
        if (today > expectedReturn) {
          const overdueDays = Math.ceil((today - expectedReturn) / (1000 * 60 * 60 * 24));
          // Use daily rent amount (dailyRate) as the charge rate for each late day
          let chargeRate = Number(item.dailyRate) || defaultRate;
          item.overdueDays = overdueDays;
          item.overdueChargePerDay = chargeRate;
          item.totalOverdueCharge = overdueDays * chargeRate * (totalQty - returnedQty);
          item.returnStatus = 'Overdue';
          bookingTotalOverdueDays = Math.max(bookingTotalOverdueDays, overdueDays);
          bookingTotalOverdueCharges += item.totalOverdueCharge;
          bookingChanged = true;
        }
      }

      // Process accessories
      for (const acc of (booking.accessories || [])) {
        const expectedReturn = acc.expectedReturnDate ? new Date(acc.expectedReturnDate) : new Date(booking.returnDate);
        expectedReturn.setHours(0, 0, 0, 0);
        const returnedQty = acc.returnedQuantity || 0;
        const totalQty = acc.quantity || 1;
        if (returnedQty >= totalQty) {
          if (acc.returnStatus !== 'Returned') { acc.returnStatus = 'Returned'; bookingChanged = true; }
          continue;
        }
        if (today > expectedReturn) {
          const overdueDays = Math.ceil((today - expectedReturn) / (1000 * 60 * 60 * 24));
          // Use daily rent amount (price) as the charge rate for each late day
          let chargeRate = Number(acc.price) || defaultRate;
          acc.overdueDays = overdueDays;
          acc.overdueChargePerDay = chargeRate;
          acc.totalOverdueCharge = overdueDays * chargeRate * (totalQty - returnedQty);
          acc.returnStatus = 'Overdue';
          bookingTotalOverdueDays = Math.max(bookingTotalOverdueDays, overdueDays);
          bookingTotalOverdueCharges += acc.totalOverdueCharge;
          bookingChanged = true;
        }
      }

      if (bookingChanged) {
        booking.totalOverdueDays = bookingTotalOverdueDays;
        booking.totalOverdueCharges = bookingTotalOverdueCharges;
        // Recalculate totals with overdue
        const totals = calcBookingTotals(booking.toObject());
        booking.totalAmount = totals.totalAmount;
        booking.balanceAmount = totals.balanceAmount;
        await booking.save();
        processed++;

        // Send overdue SMS for all late days
        if (booking.clientPhone && bookingTotalOverdueDays > 0) {
          const lastSmsSent = booking.followupSentAt ? new Date(booking.followupSentAt) : null;
          const shouldSend = !lastSmsSent || (today - lastSmsSent) > (23 * 60 * 60 * 1000);
          if (shouldSend && bookingTotalOverdueDays > 0) {
            try {
              const overdueItems = [
                ...(booking.items || []).filter(it => it.returnStatus === 'Overdue'),
                ...(booking.accessories || []).filter(ac => ac.returnStatus === 'Overdue')
              ];
              const itemNames = overdueItems.map(it => it.toolNumber || it.name || 'Item').join(', ');
              const dailyOverdueRate = overdueItems.reduce((sum, it) => {
                const rate = Number(it.dailyRate) || Number(it.price) || 0;
                const qty = (it.quantity || 1) - (it.returnedQuantity || 0);
                return sum + (rate * qty);
              }, 0);
              let template = settings?.smsOverdueReminderTemplate || 'Dear {clientName}, your rental of {itemName} is overdue by {overdueDays} days. Added rent: LKR {dailyRate} per day. Total overdue: LKR {overdueCharge}. Please return immediately.';
              const msg = template
                .replace(/\{clientName\}/g, booking.clientName || 'Customer')
                .replace(/\{companyName\}/g, settings?.companyName || 'MAGGI TOOLS')
                .replace(/\{itemName\}/g, itemNames)
                .replace(/\{overdueDays\}/g, String(bookingTotalOverdueDays))
                .replace(/\{dailyRate\}/g, `LKR ${dailyOverdueRate.toLocaleString()}`)
                .replace(/\{overdueCharge\}/g, `LKR ${bookingTotalOverdueCharges.toLocaleString()}`);
              const result = await sendSMS(booking.clientPhone, msg);
              if (result.success) {
                booking.followupSentAt = new Date();
                await booking.save();
                smsSent++;
              } else { smsFailed++; }
            } catch (smsErr) {
              console.error('Overdue SMS failed:', smsErr.message);
              smsFailed++;
            }
          }
        }
      }
    }

    res.json({
      message: `Overdue processing complete. Updated: ${processed}, SMS Sent: ${smsSent}, SMS Failed: ${smsFailed}`,
      processed,
      smsSent,
      smsFailed
    });
  } catch (err) {
    console.error('Overdue processing error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

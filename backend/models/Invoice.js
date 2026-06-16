const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  invoiceNo: { type: String, required: true, unique: true },
  date: { type: Date, default: Date.now },
  clientName: { type: String, required: true },
  clientPhone: { type: String },
  clientNic: { type: String },
  site: { type: String },
  toolNo: { type: String }, // Optional if items array is used
  toolCategory: { type: String },
  jobDescription: { type: String },
  items: [{
    toolNumber: String,
    model: String,
    category: String,
    dailyRate: Number,
    totalUnits: Number,
    unitType: String
  }],
  
  // Time tracking
  startTime: { type: String },
  endTime: { type: String },
  totalUnits: { type: Number, default: 0 }, // Legacy/Single item fallback
  unitType: { type: String, enum: ['Hours', 'Days', 'Lumpsum', 'KM'], default: 'Days' },
  ratePerUnit: { type: Number, default: 0 },
  
  // Additional Charges
  transportCharge: { type: Number, default: 0 },
  otherCharges: { type: Number, default: 0 },
  otherChargesDescription: { type: String },
  discount: { type: Number, default: 0 },
  
  // Totals
  subtotal: { type: Number, default: 0 },
  advancePayment: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  balanceAmount: { type: Number, default: 0 },
  
  status: { type: String, enum: ['Draft', 'Sent', 'Paid', 'Cancelled'], default: 'Draft' },
  remarks: { type: String },
  hireId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hire' },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  accessories: [{
    number: String,
    name: String,
    quantity: Number,
    price: Number
  }],
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  paymentMethod: { type: String, default: 'Cash' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedByName: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', InvoiceSchema);

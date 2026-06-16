const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  // Basic Info
  date:           { type: Date, default: Date.now },
  client:         { type: String, required: true },
  tool:           { type: String },
  address:        { type: String },
  city:           { type: String },
  
  // Usage Information
  days:           { type: Number, default: 1 },
  
  // Billing Breakdown
  takenAmount:    { type: Number, default: 0 },
  transportCharge: { type: Number, default: 0 },
  otherCharges:    { type: Number, default: 0 },
  
  // Computed
  hireAmount:     { type: Number, default: 0 },
  paidAmount:     { type: Number, default: 0 },
  balance:        { type: Number, default: 0 },
  status:         { type: String, enum: ['Pending', 'Paid', 'Partial'], default: 'Pending' },
  paymentMethod:  { type: String, default: 'Cash' },
  accountId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  
  // Linking
  hireId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Hire' },
  bookingId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  invoiceId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }
  ,
  invoiceNo:      { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);

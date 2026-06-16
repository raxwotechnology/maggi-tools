const mongoose = require('mongoose');

const QuotationSchema = new mongoose.Schema({
  quotationNo: { type: String, required: true, unique: true },
  date: { type: Date, default: Date.now },
  clientName: { type: String, required: true },
  clientAddress: { type: String },
  
  // Specifications
  toolCategory: { type: String },
  toolNo: { type: String },
  toolSpec1: { type: String },
  toolSpec2: { type: String },
  
  // Charges
  mandatoryCharge: { type: Number, default: 0 },
  transportCharge: { type: Number, default: 0 },
  extraHourRate: { type: Number, default: 0 },
  
  // Terms
  validityDays: { type: Number, default: 30 },
  termsAndConditions: { type: String },
  
  estimatedTotal: { type: Number, default: 0 },
  status: { type: String, enum: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Cancelled'], default: 'Draft' }
}, { timestamps: true });

module.exports = mongoose.model('Quotation', QuotationSchema);

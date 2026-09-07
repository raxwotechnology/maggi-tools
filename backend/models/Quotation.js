const mongoose = require('mongoose');

const QuotationSchema = new mongoose.Schema({
  quotationNo: { type: String, required: true, unique: true },
  date: { type: Date, default: Date.now },
  clientName: { type: String, required: true },
  clientAddress: { type: String },
  clientPhone: { type: String },
  clientNic: { type: String },
  site: { type: String },
  
  // Specifications
  toolCategory: { type: String },
  toolNo: { type: String },
  toolSpec1: { type: String },
  toolSpec2: { type: String },
  items: [{
    toolNumber: String,
    model: String,
    category: String,
    quantity: { type: Number, default: 1 },
    days: { type: Number, default: 1 },
    dailyRate: { type: Number, default: 0 },
    lineTotal: { type: Number, default: 0 }
  }],
  accessories: [{
    number: String,
    name: String,
    quantity: { type: Number, default: 1 },
    price: { type: Number, default: 0 }
  }],
  refundableDeposit: { type: Number, default: 0 },
  
  // Charges
  mandatoryCharge: { type: Number, default: 0 },
  transportCharge: { type: Number, default: 0 },
  fuelCharge: { type: Number, default: 0 },
  fuelType: { type: String, default: '' },
  labourCharge: { type: Number, default: 0 },
  operatorName: { type: String, default: '' },
  otherCharges: { type: Number, default: 0 },
  extraHourRate: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  
  // Terms
  validityDays: { type: Number, default: 30 },
  termsAndConditions: { type: String },
  
  estimatedTotal: { type: Number, default: 0 },
  status: { type: String, enum: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Cancelled'], default: 'Draft' }
}, { timestamps: true });

module.exports = mongoose.model('Quotation', QuotationSchema);

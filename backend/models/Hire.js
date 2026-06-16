const mongoose = require('mongoose');

const HireSchema = new mongoose.Schema({
  // Basic Info
  date:             { type: Date, default: Date.now },
  client:           { type: String, required: true },
  nic:              { type: String },
  toolId:           { type: String, required: true },
  address:          { type: String },
  city:             { type: String },
  
  // Personnel
  operatorName:       { type: String },
  helperName:       { type: String },
  
  // Time Information
  startTime:        { type: String },
  endTime:          { type: String },
  restTime:         { type: Number, default: 0 },       // in minutes
  workingHours:     { type: Number, default: 0 },
  
  // Billing Info
  minimumHours:     { type: Number, default: 0 },
  oneHourFee:       { type: Number, default: 0 },
  extraHours:       { type: Number, default: 0 },
  extraHourFee:     { type: Number, default: 0 },
  transportFee:     { type: Number, default: 0 },
  consumableCost:       { type: Number, default: 0 },
  billAmount:       { type: Number, default: 0 },
  commission:       { type: Number, default: 0 },
  
  // Reference Numbers
  timeSheetNumber:  { type: String },
  billNumber:       { type: String },
  
  // Total & Notes
  totalAmount:      { type: Number, default: 0 },
  details:          { type: String },
  
  // External Vehicle Info
  isExternal:       { type: Boolean, default: false },
  externalCost:     { type: Number, default: 0 },
  toolCategory:      { type: String },

  status: { type: String, enum: ['Pending', 'Completed', 'Paid'], default: 'Pending' },
  
  // Payment
  advancePayment:   { type: Number, default: 0 },
  paymentMethod:    { type: String, default: 'Cash' },
  accountId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  updatedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedByName:    { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Hire', HireSchema);

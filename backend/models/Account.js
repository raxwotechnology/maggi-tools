const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
  accountName: { type: String, required: true },
  bankName:    { type: String },
  accountNumber: { type: String },
  branch:      { type: String },
  balance:     { type: Number, default: 0 },
  status:      { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Account', AccountSchema);

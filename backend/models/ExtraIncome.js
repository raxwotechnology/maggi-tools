const mongoose = require('mongoose');

const ExtraIncomeSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String },
  client: { type: String },
  paymentMethod: { type: String, default: 'Cash' },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  note: { type: String },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedByName: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('ExtraIncome', ExtraIncomeSchema);

const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String },
  note: { type: String },
  paymentMethod: { type: String, default: 'Cash' },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  hireId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hire' },
  toolId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tool' },
  toolNo: { type: String },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedByName: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Expense', ExpenseSchema);

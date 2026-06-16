const mongoose = require('mongoose');

const AdvanceSchema = new mongoose.Schema({
  employee: { type: String, required: true },
  date: { type: Date, default: Date.now },
  amount: { type: Number, required: true },
  month: { type: String, required: true }, // e.g. "April 2026"
  remarks: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Advance', AdvanceSchema);

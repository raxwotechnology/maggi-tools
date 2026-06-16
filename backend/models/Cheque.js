const mongoose = require('mongoose');

const ChequeSchema = new mongoose.Schema({
  date:         { type: Date, default: Date.now },
  dueDate:      { type: Date },
  chequeNumber: { type: String, required: true },
  bank:         { type: String },
  amount:       { type: Number, required: true },
  client:       { type: String },
  type:         { type: String, enum: ['Incoming', 'Outgoing'], default: 'Incoming' },
  status:       { type: String, enum: ['Pending', 'Accepted', 'Rejected', 'Cleared'], default: 'Pending' },
  accountId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Account' }, // Linked account when cleared/accepted
  note:         { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Cheque', ChequeSchema);

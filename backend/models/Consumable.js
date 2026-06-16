const mongoose = require('mongoose');

const ConsumableSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  employee: { type: String }, // staff who handled/bought consumable
  toolId: { type: String, required: true },
  consumableType: { type: String, enum: ['Diesel', 'Petrol', 'Electricity', 'Service Parts', 'Lubricants', 'Other'], default: 'Diesel' },
  quantity: { type: Number, required: true },
  pricePerUnit: { type: Number, required: true },
  total: { type: Number, required: true },
  meterReading: { type: Number },
  note: { type: String },
  status: { type: String, enum: ['Logged', 'Verified'], default: 'Logged' }
}, { timestamps: true });

module.exports = mongoose.model('Consumable', ConsumableSchema);

const mongoose = require('mongoose');

const DieselSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  employee: { type: String }, // driver who filled diesel
  vehicle: { type: String, required: true },
  fuelType: { type: String, enum: ['Diesel', 'Petrol'], default: 'Diesel' },
  liters: { type: Number, required: true },
  pricePerLiter: { type: Number, required: true },
  total: { type: Number, required: true },
  odometer: { type: Number },
  note: { type: String },
  status: { type: String, enum: ['Logged', 'Verified'], default: 'Logged' }
}, { timestamps: true });

module.exports = mongoose.model('Diesel', DieselSchema);

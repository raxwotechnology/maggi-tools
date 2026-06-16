const mongoose = require('mongoose');

const accessorySchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true }, // Accessory ID — must not overlap with Tool IDs
  name: { type: String, required: true },
  category: { type: String }, // e.g. "Drill Bits", "Saw Blades"
  price: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  unit: { type: String, default: 'pcs' },
  description: { type: String },
  status: { type: String, enum: ['In Stock', 'Low Stock', 'Out of Stock'], default: 'In Stock' },
  customOverdueChargePerDay: { type: Number, default: null } // Optional override for default overdue charge
}, { timestamps: true });

module.exports = mongoose.model('Accessory', accessorySchema);

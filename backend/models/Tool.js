const mongoose = require('mongoose');

const toolSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true }, // Tool ID / Serial Number
  model: { type: String },
  category: { type: String, default: 'General' }, 
  powerSource: { type: String, enum: ['Electric', 'Battery', 'Petrol', 'Manual'], default: 'Electric' },
  status: { type: String, enum: ['Available', 'Booked', 'Maintenance', 'Repair', 'Maintaining', 'Under Repair', 'Unavailable'], default: 'Available' },
  dailyRate: { type: Number, default: 0 },
  stock: { type: Number, default: 1 },
  customOverdueChargePerDay: { type: Number, default: null }, // Optional override for default overdue charge
  
  // Maintenance & Warranty
  warrantyExpirationDate: { type: Date },
  lastServiceDate: { type: Date },
  nextServiceDate: { type: Date },
  warrantyEmiNumber: { type: String },

  // Ownership/Leasing (if applicable)
  hasLeasing: { type: Boolean, default: false },
  leasingCompany: { type: String },
  monthlyPremium: { type: Number, default: 0 },
  leaseDueDate: { type: Number }, // Day of month (1-31)
  leaseFinalDate: { type: Date },
  financeEmiNumber: { type: String },
  leasePayments: [{
    year: Number,
    month: Number,
    paid: { type: Boolean, default: false },
    paidDate: Date
  }],

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tool', toolSchema);

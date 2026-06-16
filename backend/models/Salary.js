const mongoose = require('mongoose');

const SalarySchema = new mongoose.Schema({
  month: { type: String, required: true }, // e.g. "2024-04"
  employee: { type: String, required: true },
  basic: { type: Number, default: 0 },
  workingDays: { type: Number, default: 0 },
  dailyAllowance: { type: Number, default: 0 }, // workingDays * 500
  hourlyEarnings: { type: Number, default: 0 }, // totalHours * hourlyRate
  incentive: { type: Number, default: 0 },
  advance: { type: Number, default: 0 },
  totalHours: { type: Number, default: 0 },
  jobsCount: { type: Number, default: 0 },
  attendanceBonus: { type: Number, default: 0 },
  attendancePenalty: { type: Number, default: 0 },
  netPay: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
  paymentMethod: { type: String, enum: ['Cash', 'Bank Transfer', 'Cheque', 'Other'], default: 'Cash' },
  paymentDate: { type: Date },
  details: { type: Array, default: [] } // list of job IDs or summaries
}, { timestamps: true });

module.exports = mongoose.model('Salary', SalarySchema);

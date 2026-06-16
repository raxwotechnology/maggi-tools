const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  employee: { type: String, required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['Present', 'Absent', 'Leave'], default: 'Present' },
  note: { type: String }
}, { timestamps: true });

// Ensure one entry per employee per day
AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);

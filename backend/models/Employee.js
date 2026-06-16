const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const EmployeeSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  nic:        { type: String },
  role:       { type: String, enum: ['Operator', 'Helper', 'Mechanic', 'Admin', 'Manager', 'Technician', 'Other'], default: 'Operator' },
  contact:    { type: String },
  joinedDate: { type: Date, default: Date.now },
  status:     { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  basicSalary: { type: Number, default: 0 },
  hourlyRate:  { type: Number, default: 0 },
  salaryCategory: { type: String, enum: ['Monthly', 'Weekly', 'Day Payment'], default: 'Monthly' },
  username:   { type: String, unique: true, sparse: true },
  password:   { type: String }
}, { timestamps: true });

// Hash password before saving
EmployeeSchema.pre('save', async function() {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
EmployeeSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Employee', EmployeeSchema);

const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  companyName: { type: String, default: 'RAXWO TOOL RENTALS' },
  address: { type: String, default: 'No. 241, Rajamaha Vihara Rd, Mirihana, Kotte.' },
  phones: [{ type: String }],
  email: { type: String, default: 'info@raxwo.com' },
  regNo: { type: String, default: '73330' },
  logo: { type: String }, // Base64 or URL
  currency: { type: String, default: 'LKR' },
  // Full bill SMS sent on booking confirm — editable in Settings
  smsBookingTemplate: { type: String, default: '' },
  smsFollowupTemplate: {
    type: String,
    default: 'Dear {clientName}, This is a reminder from {companyName}. Your rental of {toolNo} was due on {returnDate}. Outstanding balance: LKR {balanceAmount}. Please arrange return/payment at your earliest convenience.'
  },
  smsReturnTemplate: {
    type: String,
    default: ''
  },
  followupDays: { type: Number, default: 14 }, // Days after booking to send follow-up
  privacyPolicy: { type: String, default: 'We value your privacy. Your personal information is securely stored and only used for rental purposes.' },
  termsConditions: { type: String, default: '1. Tools must be returned in the same condition.\n2. Late returns will incur extra charges.\n3. The renter is responsible for any damage or loss.' },
  
  // Overdue Charge Settings
  enableOverdueCharges: { type: Boolean, default: true },
  defaultOverdueChargePerDay: { type: Number, default: 500 },
  smsOverdueReminderTemplate: {
    type: String,
    default: 'Dear {clientName}, This is a reminder from {companyName}. Your rental of {itemName} is overdue by {overdueDays} days. Current overdue charge: LKR {overdueCharge}. Please return the item immediately.'
  }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);

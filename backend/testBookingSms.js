require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./models/Booking');
const { sendSMS } = require('./utils/smsService');
const { buildDetailedBillMessage, resolveBookingTemplate, applySmsTemplate } = require('./utils/smsTemplate');
const Setting = require('./models/Setting');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  const booking = await Booking.findOne().sort({ createdAt: -1 }).lean();
  if (!booking) {
    console.log('No bookings found');
    process.exit(1);
  }
  
  console.log('Testing SMS for Booking:', booking.bookingId);
  const settings = await Setting.findOne();
  
  // mock enriched booking
  booking.items = booking.items || [];
  
  const template = resolveBookingTemplate(settings);
  const msg = applySmsTemplate(template, booking, settings);
  console.log('--- GENERATED SMS ---');
  console.log(msg);
  console.log('---------------------');
  
  if (booking.clientPhone) {
    console.log('Attempting to send SMS to:', booking.clientPhone);
    const result = await sendSMS(booking.clientPhone, msg);
    console.log('SMS Result:', result);
  } else {
    console.log('No clientPhone on latest booking. Skipping send.');
  }
  
  process.exit(0);
}

test();

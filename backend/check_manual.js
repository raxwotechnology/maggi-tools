const mongoose = require('mongoose');
const Booking = require('./models/Booking');
const Client = require('./models/Client');
const Payment = require('./models/Payment');
const Invoice = require('./models/Invoice');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const clients = await Client.find({ name: 'MANUAL_TEST_CLIENT' });
  console.log('Found manual client:', clients.length);
  const payments = await Payment.find({ client: 'MANUAL_TEST_CLIENT' });
  console.log('Found manual payment:', payments.length);
  await mongoose.disconnect();
}
check();

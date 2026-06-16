const mongoose = require('mongoose');
const Client = require('./models/Client');
const Payment = require('./models/Payment');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  const c = new Client({ name: 'MANUAL_TEST_CLIENT', contact: '123' });
  await c.save();
  console.log('Client saved');

  const p = new Payment({ client: 'MANUAL_TEST_CLIENT', takenAmount: 100 });
  await p.save();
  console.log('Payment saved');

  await mongoose.disconnect();
}
test();

require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./models/Booking');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const booking = await Booking.findOne().sort({ createdAt: -1 }).lean();
  console.log(booking);
  process.exit(0);
}
test();

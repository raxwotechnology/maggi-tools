const mongoose = require('mongoose');
require('dotenv').config();
const Booking = require('./models/Booking');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const bookings = await Booking.find().sort({ createdAt: -1 }).limit(5);
    bookings.forEach(b => {
        console.log(`Booking ${b.bookingId}: Total=${b.totalAmount}, NetTotal=${b.totalAfterExtra}, Balance=${b.balanceAmount}`);
    });
    await mongoose.disconnect();
}
check();

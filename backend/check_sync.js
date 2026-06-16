const mongoose = require('mongoose');
require('dotenv').config();
const Booking = require('./models/Booking');
const Invoice = require('./models/Invoice');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const bookings = await Booking.find({ bookingId: 'BK-0001' });
    console.log('Bookings Found:', bookings.length);
    for (const b of bookings) {
        console.log(`Booking ${b.bookingId} (${b._id}): Total=${b.totalAmount}, Balance=${b.balanceAmount}`);
        const inv = await Invoice.findOne({ bookingId: b._id });
        if (inv) {
            console.log(`- Linked Invoice ${inv.invoiceNo}: Total=${inv.totalAmount}, Balance=${inv.balanceAmount}`);
        } else {
            console.log('- No linked invoice found');
        }
    }
    await mongoose.disconnect();
}
check();

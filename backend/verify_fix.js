const mongoose = require('mongoose');
require('dotenv').config();
const Booking = require('./models/Booking');
const Invoice = require('./models/Invoice');
const Client = require('./models/Client');

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected');

    const lastBooking = await Booking.findOne().sort({ createdAt: -1 });
    console.log('Last Booking:', lastBooking ? {
        id: lastBooking.bookingId,
        accessories: lastBooking.accessories,
        front: lastBooking.customerIdFront ? 'Present' : 'Missing',
        back: lastBooking.customerIdBack ? 'Present' : 'Missing'
    } : 'None');

    if (lastBooking) {
        const linkedInvoice = await Invoice.findOne({ bookingId: lastBooking._id });
        console.log('Linked Invoice:', linkedInvoice ? {
            no: linkedInvoice.invoiceNo,
            accessories: linkedInvoice.accessories,
            total: linkedInvoice.totalAmount
        } : 'None');

        const linkedClient = await Client.findOne({ name: lastBooking.clientName });
        console.log('Linked Client:', linkedClient ? {
            name: linkedClient.name,
            front: linkedClient.customerIdFront ? 'Present' : 'Missing'
        } : 'None');
    }

    await mongoose.disconnect();
}

test();

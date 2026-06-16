const mongoose = require('mongoose');
require('dotenv').config();
const Booking = require('./models/Booking');
const Invoice = require('./models/Invoice');

async function patch() {
    await mongoose.connect(process.env.MONGODB_URI);
    const invoices = await Invoice.find();
    console.log(`Found ${invoices.length} invoices to sync...`);
    
    for (const inv of invoices) {
        if (inv.bookingId) {
            const b = await Booking.findById(inv.bookingId);
            if (b) {
                inv.advancePayment = b.advancePayment || 0;
                inv.balanceAmount = b.balanceAmount || 0;
                await inv.save();
                console.log(`- Fixed INV ${inv.invoiceNo}: Adv=${inv.advancePayment}, Bal=${inv.balanceAmount}`);
            }
        }
    }
    console.log('Patch complete!');
    await mongoose.disconnect();
}
patch();

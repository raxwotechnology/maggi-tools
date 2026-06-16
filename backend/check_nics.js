const mongoose = require('mongoose');
require('dotenv').config();
const Booking = require('./models/Booking');

const MONGODB_URI = process.env.MONGODB_URI;

async function check() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const nics = await Booking.distinct('clientNic', { clientNic: { $exists: true, $ne: '' } });
        console.log('Existing NICs in DB:', nics);
        
        const count = nics.length;
        console.log(`Distinct NICs found: ${count}`);
        
        if (count > 0) {
            const sample = await Booking.findOne({ clientNic: '9900-' }).sort({ createdAt: -1 });
            console.log('Latest Booking for 9900-:', {
                nic: sample.clientNic,
                name: sample.clientName,
                hasFront: !!sample.customerIdFront,
                hasBack: !!sample.customerIdBack
            });
        } else {
            console.log('No bookings found with NIC field populated.');
        }
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

check();

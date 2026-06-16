const mongoose = require('mongoose');
require('dotenv').config();

async function repair() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/krishan_transport');
  
  const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({ number: String }));
  const Payment = mongoose.model('Payment', new mongoose.Schema({ vehicle: String, client: String, createdAt: Date }, { strict: false }));
  const Booking = mongoose.model('Booking', new mongoose.Schema({ clientName: String, vehicle: mongoose.Schema.Types.ObjectId, createdAt: Date }, { strict: false }));

  const payments = await Payment.find({ vehicle: { $exists: false } });
  console.log(`Found ${payments.length} payments missing vehicle.`);

  for (const p of payments) {
    // Find a booking created within 5 seconds of the payment with same client
    const pTime = p.createdAt.getTime();
    const b = await Booking.findOne({
      clientName: p.client,
      createdAt: { 
        $gte: new Date(pTime - 10000), 
        $lte: new Date(pTime + 10000) 
      }
    });

    if (b && b.vehicle) {
      const v = await Vehicle.findById(b.vehicle);
      if (v) {
        p.vehicle = v.number;
        await p.save();
        console.log(`Fixed payment ${p._id} with vehicle ${v.number}`);
      }
    } else {
        // Fallback: search for any vehicle if it's a test record
        const anyV = await Vehicle.findOne();
        if (anyV) {
            p.vehicle = anyV.number;
            await p.save();
            console.log(`Fallback fixed payment ${p._id} with vehicle ${anyV.number}`);
        }
    }
  }

  await mongoose.disconnect();
}

repair();

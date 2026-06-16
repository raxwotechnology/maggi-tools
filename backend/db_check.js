const mongoose = require('mongoose');
const Booking = require('./models/Booking');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/raxwo_tool_rent');
  console.log('Connected to DB');
  
  const latest = await Booking.find().sort({ createdAt: -1 }).limit(5);
  console.log('--- LATEST 5 BOOKINGS ---');
  latest.forEach(b => {
    console.log(`ID: ${b.bookingId} | Client: ${b.clientName} | Items: ${b.items?.length || 0} | Status: ${b.status} | CreatedAt: ${b.createdAt}`);
    if (b.items) {
      b.items.forEach(it => console.log(`  - Tool: ${it.toolNumber} (${it.tool})`));
    }
  });
  
  process.exit();
}

check();

const { MongoClient, ObjectId } = require('mongodb');

async function check() {
  const uri = "mongodb+srv://admin:RGG5NPRSQUcmbL3w@cluster0.hvutzoy.mongodb.net/raxwo_tool_rent";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('raxwo_tool_rent');
    
    // Find the booking BK-0012
    const booking = await db.collection('bookings').findOne({ bookingId: 'BK-0012' });
    if (!booking) {
      console.log('Booking BK-0012 not found');
      return;
    }
    
    console.log(`Found Booking: ${booking._id} | ID: ${booking.bookingId}`);
    
    // Find payment for this booking
    const payment = await db.collection('payments').findOne({ bookingId: booking._id });
    if (payment) {
      console.log('✅ PAYMENT RECORD FOUND:');
      console.log(payment);
    } else {
      console.log('❌ NO PAYMENT RECORD FOUND for this booking');
      
      // Check if it's stored as a string instead of ObjectId
      const paymentStr = await db.collection('payments').findOne({ bookingId: booking._id.toString() });
      if (paymentStr) {
        console.log('✅ PAYMENT RECORD FOUND (but bookingId is a string):');
        console.log(paymentStr);
      }
    }
    
  } finally {
    await client.close();
  }
}

check();

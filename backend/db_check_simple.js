const { MongoClient } = require('mongodb');

async function check() {
  const client = new MongoClient('mongodb://localhost:27017');
  try {
    await client.connect();
    const db = client.db('raxwo_tool_rent');
    const latest = await db.collection('bookings').find().sort({ createdAt: -1 }).limit(5).toArray();
    
    console.log('--- LATEST 5 BOOKINGS ---');
    latest.forEach(b => {
      console.log(`ID: ${b.bookingId} | Client: ${b.clientName} | Items: ${b.items?.length || 0} | Status: ${b.status}`);
      if (b.items) {
        b.items.forEach(it => console.log(`  - Tool: ${it.toolNumber}`));
      }
    });
  } finally {
    await client.close();
  }
}

check();

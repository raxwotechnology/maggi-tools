const { MongoClient } = require('mongodb');

async function check() {
  const uri = "mongodb+srv://admin:RGG5NPRSQUcmbL3w@cluster0.hvutzoy.mongodb.net/raxwo_tool_rent";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('raxwo_tool_rent');
    
    console.log('--- ALL ACCOUNTS ---');
    const accounts = await db.collection('accounts').find().toArray();
    accounts.forEach(a => {
      console.log(`ID: ${a._id} | Name: ${a.accountName} | Bank: ${a.bankName} | No: ${a.accountNumber}`);
    });
    
    console.log('\n--- RECENT PAYMENTS WITH ACCOUNT ---');
    const payments = await db.collection('payments').find({ accountId: { $exists: true } }).sort({ createdAt: -1 }).limit(10).toArray();
    payments.forEach(p => {
      console.log(`Payment: ${p._id} | Client: ${p.client} | AccountId: ${p.accountId}`);
    });
    
  } finally {
    await client.close();
  }
}

check();

const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

async function checkEmployees() {
  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const employees = await db.collection('employees').find({}).toArray();
    
    console.log('Employees found:', employees.length);
    employees.forEach(e => {
      console.log(`- ${e.name} (${e.username}) [${e.role}] Status: ${e.status}`);
    });

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkEmployees();

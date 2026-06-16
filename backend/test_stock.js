const mongoose = require('mongoose');
const Accessory = require('./models/Accessory');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/raxwo_rentals');
  console.log('Connected to DB');

  const acc = await Accessory.findOne();
  if (!acc) {
    console.log('No accessories found to test.');
    process.exit();
  }

  console.log(`Testing with: ${acc.name}, Current Stock: ${acc.stock}`);
  
  const updated = await Accessory.findByIdAndUpdate(
    acc._id,
    { $inc: { stock: -1 } },
    { new: true }
  );

  console.log(`Updated Stock: ${updated.stock}`);
  process.exit();
}

test();

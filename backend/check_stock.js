const mongoose = require('mongoose');
require('dotenv').config();
const Accessory = require('./models/Accessory');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const accs = await Accessory.find();
    console.log('Current Accessories Stock:');
    accs.forEach(a => {
        console.log(`- ${a.name}: Stock=${a.stock}, Status=${a.status}`);
    });
    await mongoose.disconnect();
}
check();

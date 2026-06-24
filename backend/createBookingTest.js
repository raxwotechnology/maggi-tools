require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');

async function test() {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: '6a11a992fde100266f96a910', name: 'theekshana' }, process.env.JWT_SECRET || 'supersecretkey123');

  try {
    const payload = {
      pickupDate: new Date().toISOString(),
      returnDate: new Date(Date.now() + 86400000).toISOString(),
      clientName: 'theeksh',
      clientPhone: '0776995285',
      clientNic: '2002',
      pickupLocation: 'Maggi Tools Weliweriya',
      items: [],
      accessories: [{
        accessoryId: '6a25536fbb8b2bd8f7f2c6ee',
        name: 'TEST ACC',
        quantity: 1,
        price: 100,
        rentalDays: 1,
        rentalDate: new Date().toISOString(),
        expectedReturnDate: new Date(Date.now() + 86400000).toISOString()
      }],
      baseAmount: 100,
      totalAmount: 100,
      balanceAmount: 100,
      totalDays: 1,
      securityDeposit: 0,
      extraCharges: 0,
      paymentMethod: 'Cash',
      status: 'Confirmed'
    };

    const res = await axios.post('http://localhost:5001/api/bookings/', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Response:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.log('API Error Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.log('Network/Other Error:', err.message);
    }
  }
  process.exit(0);
}
test();

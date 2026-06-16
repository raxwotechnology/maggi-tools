require('dotenv').config();
const { sendSMS } = require('./utils/smsService');

const testSenderID = async () => {
    const phone = '+94777778845';
    const message = 'Hello from Maggi Tools! This is a test message to verify the new sender ID integration.';
    
    console.log(`Starting SMS test to ${phone} with Sender ID: ${process.env.SMS_SENDER_ID}`);
    const result = await sendSMS(phone, message);
    
    if (result.success) {
        console.log('✅ Test SMS Sent Successfully!', result.data);
    } else {
        console.error('❌ Test SMS Failed!', result.error);
    }
};

testSenderID();

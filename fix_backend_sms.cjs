const fs = require('fs');

let content = fs.readFileSync('backend/routes/bookings.js', 'utf8');

// 1. Modify processBookingSideEffects to return generatedSms
const processStart = "async function processBookingSideEffects(newBooking) {";
const processSmsBlock = /if \(newBooking\.clientPhone\) \{\s*\/\/ Just build it, do not send it automatically! The frontend will handle sending\.\s*newBooking\.generatedSms = await buildSMSMessage\('smsBookingTemplate', newBooking\);\s*\}/;

content = content.replace(processSmsBlock, `
      let generatedSms = '';
      if (newBooking.clientPhone) {
        generatedSms = await buildSMSMessage('smsBookingTemplate', newBooking);
      }
      return { generatedSms };
`);

// If it hasn't successfully added the return due to regex failing, fallback:
if (!content.includes('return { generatedSms };')) {
    // We already replaced it in the previous step, so it looks like:
    const altTarget = /if \(newBooking\.clientPhone\) \{\s*\/\/ Just build it, do not send it automatically! The frontend will handle sending\.\s*newBooking\.generatedSms = await buildSMSMessage\('smsBookingTemplate', newBooking\);\s*\}/;
    content = content.replace(altTarget, `
      let generatedSms = '';
      if (newBooking.clientPhone) {
        generatedSms = await buildSMSMessage('smsBookingTemplate', newBooking);
      }
      return { generatedSms };
    `);
}

// 2. Modify POST /
const postBlock = /await processBookingSideEffects\(newBooking\.toObject\(\)\);\s*res\.status\(201\)\.json\(newBooking\);/;
content = content.replace(postBlock, `
    const sideEffects = await processBookingSideEffects(newBooking.toObject());
    const responseObj = newBooking.toObject();
    responseObj.generatedSms = sideEffects?.generatedSms;
    res.status(201).json(responseObj);
`);

// 3. Modify POST /bulk
const bulkBlock = /await processBookingSideEffects\(saved\.toObject\(\)\);\s*results\.push\(saved\);/;
content = content.replace(bulkBlock, `
        const sideEffects = await processBookingSideEffects(saved.toObject());
        const obj = saved.toObject();
        obj.generatedSms = sideEffects?.generatedSms;
        results.push(obj);
`);

fs.writeFileSync('backend/routes/bookings.js', content);
console.log('Fixed backend SMS returning');

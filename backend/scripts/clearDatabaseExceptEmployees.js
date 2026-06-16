/**
 * Clears all MongoDB collections except `employees` (login credentials).
 * Usage: node scripts/clearDatabaseExceptEmployees.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const KEEP_COLLECTIONS = new Set(['employees']);

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set in backend/.env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  const employeeCount = await db.collection('employees').countDocuments();
  console.log(`Keeping employees collection (${employeeCount} login account(s)).\n`);

  const results = [];
  for (const { name } of collections) {
    if (KEEP_COLLECTIONS.has(name)) {
      results.push({ name, action: 'kept', deleted: 0 });
      continue;
    }
    const res = await db.collection(name).deleteMany({});
    results.push({ name, action: 'cleared', deleted: res.deletedCount });
  }

  console.log('Collection cleanup results:');
  for (const r of results.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`  ${r.name.padEnd(22)} ${r.action === 'kept' ? 'KEPT' : `deleted ${r.deleted}`}`);
  }

  const totalDeleted = results.reduce((sum, r) => sum + (r.deleted || 0), 0);
  console.log(`\nDone. Deleted ${totalDeleted} document(s). Employees preserved: ${employeeCount}.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});

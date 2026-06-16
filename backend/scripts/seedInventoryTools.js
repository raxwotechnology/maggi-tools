/**
 * Seeds the tool inventory with the provided list.
 * Auto-generates unique Tool IDs (TL-0001, TL-0002, ...).
 * Usage: node scripts/seedInventoryTools.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Tool = require('../models/Tool');
const Counter = require('../models/Counter');
const Accessory = require('../models/Accessory');

const INVENTORY = [
  { model: 'Drill Machine', dailyRate: 400, stock: 3 },
  { model: 'Hammer Drill', dailyRate: 500, stock: 3 },
  { model: 'Hammer', dailyRate: 1800, stock: 3 },
  { model: 'Normal Backer', dailyRate: 3000, stock: 3 },
  { model: 'Backer', dailyRate: 5500, stock: 6 },
  { model: 'Max Hilty', dailyRate: 4500, stock: 1 },
  { model: 'Gainder 4"', dailyRate: 550, stock: 2 },
  { model: 'Gainder 4.5"', dailyRate: 650, stock: 6 },
  { model: 'Angal Gainder', dailyRate: 1800, stock: 9 },
  { model: 'Router Machine', dailyRate: 1800, stock: 1 },
  { model: 'Water Pump 2"', dailyRate: 1600, stock: 2 },
  { model: 'Water Pump 4"', dailyRate: 5500, stock: 1 },
  { model: 'Feet 13 Length Plate', dailyRate: 150, stock: 20 },
  { model: '10 Ft Length Plate', dailyRate: 120, stock: 2 },
  { model: 'Japan Plate 6 Ft', dailyRate: 100, stock: 4 }
];

async function generateToolNumber() {
  for (let attempt = 0; attempt < 25; attempt++) {
    const counter = await Counter.findOneAndUpdate(
      { id: 'toolNumber' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const number = `TL-${String(counter.seq).padStart(4, '0')}`;
    const [toolExists, accExists] = await Promise.all([
      Tool.findOne({ number }),
      Accessory.findOne({ number })
    ]);
    if (!toolExists && !accExists) return number;
  }
  throw new Error('Could not generate unique tool ID');
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const existingByName = new Map(
    (await Tool.find().select('model number')).map((t) => [t.model.trim().toLowerCase(), t])
  );

  let created = 0;
  let skipped = 0;

  for (const item of INVENTORY) {
    const key = item.model.trim().toLowerCase();
    if (existingByName.has(key)) {
      console.log(`Skip (exists): ${existingByName.get(key).number} — ${item.model}`);
      skipped++;
      continue;
    }

    const number = await generateToolNumber();
    const tool = await Tool.create({
      number,
      model: item.model,
      category: 'General',
      powerSource: 'Electric',
      status: 'Available',
      dailyRate: item.dailyRate,
      stock: item.stock
    });
    existingByName.set(key, tool);
    console.log(`Added: ${number} — ${item.model} | LKR ${item.dailyRate} | qty ${item.stock}`);
    created++;
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped}. Total tools: ${await Tool.countDocuments()}.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

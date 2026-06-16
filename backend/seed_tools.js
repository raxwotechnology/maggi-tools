const mongoose = require('mongoose');
const Tool = require('./models/Tool');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI);

const defaultTools = [
  {
    number: 'EDM-001',
    model: 'Electric Drill Machine - Heavy Duty',
    category: 'Power Tools',
    powerSource: 'Electric',
    status: 'Available',
    dailyRate: 1500,
    stock: 5,
    hasLeasing: false,
    warrantyExpirationDate: new Date('2027-12-31')
  },
  {
    number: 'AM-002',
    model: 'Angle Grinder - 4 inch',
    category: 'Power Tools',
    powerSource: 'Electric',
    status: 'Available',
    dailyRate: 800,
    stock: 10,
    hasLeasing: false,
    warrantyExpirationDate: new Date('2026-11-15')
  },
  {
    number: 'CP-003',
    model: 'Concrete Mixer - Portable',
    category: 'Construction',
    powerSource: 'Petrol',
    status: 'Available',
    dailyRate: 3500,
    stock: 2,
    hasLeasing: true,
    leasingCompany: 'Lanka Orix',
    monthlyPremium: 15000,
    financeEmiNumber: 'EMI-LO-001',
    nextServiceDate: new Date('2026-08-01')
  },
  {
    number: 'SC-004',
    model: 'Scaffolding Set - 5ft',
    category: 'Access Equipment',
    powerSource: 'Manual',
    status: 'Available',
    dailyRate: 200,
    stock: 100,
    hasLeasing: false
  },
  {
    number: 'WB-005',
    model: 'Wheelbarrow - Heavy Duty',
    category: 'Manual Tools',
    powerSource: 'Manual',
    status: 'Available',
    dailyRate: 300,
    stock: 15,
    hasLeasing: false
  },
  {
    number: 'HP-006',
    model: 'High Pressure Washer',
    category: 'Cleaning',
    powerSource: 'Electric',
    status: 'Available',
    dailyRate: 1200,
    stock: 4,
    hasLeasing: true,
    leasingCompany: 'Commercial Bank Leasing',
    monthlyPremium: 5000,
    financeEmiNumber: 'EMI-CB-002',
    warrantyExpirationDate: new Date('2028-05-20')
  }
];

async function seed() {
  try {
    for (let tool of defaultTools) {
      const existing = await Tool.findOne({ number: tool.number });
      if (!existing) {
        await Tool.create(tool);
        console.log(`Added tool: ${tool.model}`);
      }
    }
    console.log('Seeding complete.');
  } catch (err) {
    console.error('Error seeding:', err);
  } finally {
    process.exit(0);
  }
}

seed();

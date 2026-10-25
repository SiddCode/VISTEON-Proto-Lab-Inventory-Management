require('dotenv').config();
const connectDB = require('../config/db');
const seedDatabase = require('./seedData');

const run = async () => {
  try {
    const forceReset = process.argv.includes('--reset');
    await connectDB();
    await seedDatabase({ forceReset });
    console.log(`[Seed CLI] Seeding completed (forceReset: ${forceReset}).`);
    process.exit(0);
  } catch (err) {
    console.error('[Seed CLI] Seeding failed:', err);
    process.exit(1);
  }
};

run();

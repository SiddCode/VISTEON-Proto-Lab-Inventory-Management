require('dotenv').config();
const connectDB = require('../config/db');
const seedDatabase = require('./seedData');

const run = async () => {
  try {
    await connectDB();
    await seedDatabase();
    console.log('[Seed CLI] Seeding completed.');
    process.exit(0);
  } catch (err) {
    console.error('[Seed CLI] Seeding failed:', err);
    process.exit(1);
  }
};

run();

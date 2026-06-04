require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('./models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lunchbox_db';

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  const defaultUsers = [
    { username: 'user', display_name: 'Demo Customer', email: 'user@lunchbox.com', mobile: '9999900001', password: 'user123', role: 'customer' },
    { username: 'admin', display_name: 'Admin User', email: 'admin@lunchbox.com', mobile: '9999900002', password: 'admin123', role: 'admin' },
    { username: 'captain1', display_name: 'Captain Ravi', email: 'ravi@lunchbox.com', mobile: '9999900003', password: 'captain123', role: 'captain', captain_vehicle: 'bike' },
    { username: 'captain2', display_name: 'Captain Priya', email: 'priya@lunchbox.com', mobile: '9999900004', password: 'captain123', role: 'captain', captain_vehicle: 'auto' },
    { username: 'captain3', display_name: 'Captain Arjun', email: 'arjun@lunchbox.com', mobile: '9999900005', password: 'captain123', role: 'captain', captain_vehicle: 'car' }
  ];

  for (const u of defaultUsers) {
    const exists = await User.findOne({ username: u.username });
    if (exists) {
      console.log(`  ✓ ${u.username} already exists, skipping`);
      continue;
    }
    const hash = await bcrypt.hash(u.password, 10);
    await User.create({
      username: u.username,
      display_name: u.display_name,
      email: u.email,
      mobile: u.mobile,
      password: hash,
      role: u.role,
      captain_vehicle: u.captain_vehicle || null,
      created_at: new Date().toISOString()
    });
    console.log(`  + Created ${u.username} (${u.role})`);
  }

  console.log('\nSeed complete.');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});

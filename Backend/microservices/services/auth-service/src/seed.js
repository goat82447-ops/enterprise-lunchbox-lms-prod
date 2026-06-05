require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('./models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lunchbox_db';

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  const users = await User.find({});
  for (const user of users) {
    const password = String(user.password || '');
    const isBcrypt = password.startsWith('$2a$') || password.startsWith('$2b$') || password.startsWith('$2y$');
    if (!isBcrypt) {
      user.password = await bcrypt.hash(password, 10);
      await user.save();
      console.log(`  + Migrated password hash for ${user.username}`);
    }

    if (String(user.role || '').toLowerCase() === 'user') {
      user.role = 'customer';
      await user.save();
      console.log(`  + Migrated role user->customer for ${user.username}`);
    }
  }

  console.log('\nDynamic migration complete. No static users inserted.');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});

/* global use, db */
// LunchBox MongoDB bootstrap script
// Run this in a MongoDB Playground connected to your Atlas cluster.
// It creates only the collections used by the auth service and, if permitted, a database user.

use('lunchbox_db');

const collections = [
  'users',
  'otp_codes',
  'auth_sessions',
  'voice_challenges',
  'user_actions',
  'captain_feedback',
  'bookings'
];

for (const collectionName of collections) {
  if (!db.getCollectionNames().includes(collectionName)) {
    db.createCollection(collectionName);
    console.log(`Created collection: ${collectionName}`);
  } else {
    console.log(`Collection already exists: ${collectionName}`);
  }
}

try {
  db.users.createIndex({ username: 1 }, { unique: true });
  db.users.createIndex({ email: 1 }, { unique: true });
  db.users.createIndex({ mobile: 1 }, { unique: true });
  db.otp_codes.createIndex({ user_id: 1 });
  db.otp_codes.createIndex({ session_token: 1 });
  db.auth_sessions.createIndex({ token: 1 }, { unique: true });
  db.voice_challenges.createIndex({ session_token: 1 });
  db.user_actions.createIndex({ user_id: 1 });
  db.captain_feedback.createIndex({ booking_id: 1 }, { unique: true });
  db.bookings.createIndex({ user_id: 1 });
  db.bookings.createIndex({ status: 1 });
  console.log('Indexes created or already present.');
} catch (error) {
  console.log(`Index creation skipped: ${error.message}`);
}

try {
  const existingUsers = db.getUsers().users || [];
  const userExists = existingUsers.some((entry) => entry.user === 'lunchbox_admin');

  if (!userExists) {
    db.createUser({
      user: 'lunchbox_admin',
      pwd: 'CHANGE_THIS_PASSWORD',
      roles: [{ role: 'readWrite', db: 'lunchbox_db' }]
    });
    console.log('Created Atlas database user: lunchbox_admin');
  } else {
    console.log('Atlas database user already exists: lunchbox_admin');
  }
} catch (error) {
  console.log(`Database user creation skipped: ${error.message}`);
}

console.log('LunchBox bootstrap complete.');
console.log('Replace CHANGE_THIS_PASSWORD with a real password before using the user.');
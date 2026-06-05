require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

/** Generate a deterministic unique avatar URL for a user */
function avatarUrl(displayName, role) {
  const roleColors = { admin: 'f59e0b', captain: '22c55e', customer: '38bdf8' };
  const bg = roleColors[role] || '6366f1';
  const name = encodeURIComponent(displayName || 'User');
  return `https://ui-avatars.com/api/?name=${name}&background=${bg}&color=fff&size=128&bold=true`;
}

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const now = new Date().toISOString();

  // 1. Reset admin
  const adminHash = bcrypt.hashSync('admin123', 10);
  await db.collection('users').updateOne(
    { role: 'admin' },
    {
      $set: {
        username: 'admin',
        email: 'admin@lunchbox.com',
        password: adminHash,
        display_name: 'Admin User',
        mobile: '9000000000',
        customer_otp_completed: 1,
        profile_image: avatarUrl('Admin User', 'admin')
      }
    }
  );
  console.log('Admin done -> username=admin password=admin123');

  // 2. Reset captains: unique display names + avatars + passwords
  const capHash = bcrypt.hashSync('captain123', 10);
  const captainNames = [
    'Ravi Kumar', 'Suresh Babu', 'Arjun Singh', 'Mohammed Ali', 'Kiran Reddy',
    'Vijay Sharma', 'Santhosh Nair', 'Deepak Yadav', 'Pradeep Joshi', 'Anil Verma'
  ];
  const captains = await db.collection('users').find({ role: 'captain' }).sort({ username: 1 }).toArray();
  for (let i = 0; i < captains.length; i++) {
    const name = captainNames[i] || ('Captain ' + (i + 1));
    await db.collection('users').updateOne(
      { _id: captains[i]._id },
      { $set: { password: capHash, display_name: name, profile_image: avatarUrl(name, 'captain') } }
    );
  }
  console.log('Captains updated:', captains.length, '-> unique names + avatars + password=captain123');

  // 3. Upsert 2 test customers with unique avatars
  const custHash = bcrypt.hashSync('customer123', 10);
  const custNames = ['Anita Sharma', 'Ramesh Gupta'];
  for (let i = 1; i <= 2; i++) {
    const name = custNames[i - 1];
    await db.collection('users').updateOne(
      { username: 'customer' + i },
      {
        $setOnInsert: { _id: uuidv4(), created_at: now },
        $set: {
          username: 'customer' + i,
          display_name: name,
          email: 'customer' + i + '@lunchbox.com',
          mobile: '900000000' + i,
          password: custHash,
          role: 'customer',
          customer_otp_completed: 1,
          profile_image: avatarUrl(name, 'customer')
        }
      },
      { upsert: true }
    );
  }
  console.log('Customers done -> Anita Sharma, Ramesh Gupta  password=customer123');

  // 4. Verify
  const all = await db.collection('users').find({}).toArray();
  console.log('\nAll users:');
  all.forEach(u => console.log(' ', u.role.padEnd(8), u.username.padEnd(12), u.display_name, '|', u.profile_image ? 'has avatar' : 'NO avatar'));

  await mongoose.disconnect();
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });

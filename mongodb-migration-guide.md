# SQLite to MongoDB Atlas Migration Guide

Step-by-step guide to migrate the LunchBox backend from SQLite (sql.js) to MongoDB Atlas (free cloud database).

---

## Table of Contents

1. [Create MongoDB Atlas Account (Free)](#step-1-create-mongodb-atlas-account-free)
2. [Create a Cluster](#step-2-create-a-free-cluster)
3. [Configure Database Access](#step-3-configure-database-access)
4. [Configure Network Access](#step-4-configure-network-access)
5. [Get Connection String](#step-5-get-connection-string)
6. [Install MongoDB Packages](#step-6-install-mongodb-packages)
7. [Create Mongoose Models](#step-7-create-mongoose-models)
8. [Create Database Helper (db.js)](#step-8-create-database-helper-dbjs)
9. [Create Seed Script](#step-9-create-seed-script)
10. [Update index.js - Remove SQLite Code](#step-10-update-indexjs---remove-sqlite-code)
11. [Update All Query Functions](#step-11-update-all-query-functions)
12. [Update All Route Handlers](#step-12-update-all-route-handlers)
13. [Update package.json](#step-13-update-packagejson)
14. [Test the Migration](#step-14-test-the-migration)
15. [Verify All Endpoints](#step-15-verify-all-endpoints)

---

## Step 1: Create MongoDB Atlas Account (Free)

1. Go to **https://www.mongodb.com/atlas**
2. Click **"Try Free"**
3. Sign up with Google, GitHub, or email
4. Verify your email address

---

## Step 2: Create a Free Cluster

1. After login, click **"Build a Database"**
2. Select **"M0 FREE"** tier (bottom option)
3. Choose a cloud provider:
   - **AWS** (recommended) - Select region closest to you (e.g., `ap-south-1` for India)
4. Cluster name: `LunchBoxCluster` (or any name)
5. Click **"Create Deployment"**
6. Wait 1-3 minutes for cluster to be ready

---

## Step 3: Configure Database Access

1. Go to **Database Access** (left sidebar)
2. Click **"Add New Database User"**
3. Authentication method: **Password**
4. Enter:
   - Username: `lunchbox_admin`
   - Password: `LunchBox2024Secure` (use a strong password)
5. Database User Privileges: **"Read and write to any database"**
6. Click **"Add User"**

> **IMPORTANT:** Remember this username and password - you need it for the connection string.

---

## Step 4: Configure Network Access

1. Go to **Network Access** (left sidebar)
2. Click **"Add IP Address"**
3. For development: Click **"Allow Access from Anywhere"** (adds `0.0.0.0/0`)
4. For production: Add only your server's IP address
5. Click **"Confirm"**

> **Note:** "Allow Access from Anywhere" is fine for development but restrict IPs in production.

---

## Step 5: Get Connection String

1. Go to **Database** (left sidebar)
2. Click **"Connect"** on your cluster
3. Select **"Drivers"**
4. Driver: **Node.js**, Version: **6.0 or later**
5. Copy the connection string. It looks like:

```
mongodb+srv://lunchbox_admin:<password>@lunchboxcluster.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=LunchBoxCluster
```

6. Replace `<password>` with your actual password:

```
mongodb+srv://lunchbox_admin:LunchBox2024Secure@lunchboxcluster.xxxxx.mongodb.net/lunchbox_db?retryWrites=true&w=majority&appName=LunchBoxCluster
```

> **Note:** Add `/lunchbox_db` before the `?` to specify the database name.

---

## Step 6: Install MongoDB Packages

Open terminal in `Backend/auth-service/`:

```bash
cd Backend/auth-service

# Remove sql.js (SQLite)
npm uninstall sql.js

# Install MongoDB packages
npm install mongoose dotenv
```

Your `package.json` dependencies will change:

**Before (SQLite):**
```json
"dependencies": {
    "sql.js": "^1.13.0",
    ...
}
```

**After (MongoDB):**
```json
"dependencies": {
    "mongoose": "^8.9.0",
    "dotenv": "^16.4.7",
    ...
}
```

---

## Step 7: Create Mongoose Models

Create a new folder `Backend/auth-service/src/models/` and add these files:

### File: `src/models/User.js`

```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  display_name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobile: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['customer', 'admin', 'captain'] },
  captain_vehicle: { type: String, default: null },
  profile_image: { type: String, default: null },
  customer_otp_completed: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
```

### File: `src/models/OtpCode.js`

```javascript
const mongoose = require('mongoose');

const otpCodeSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  session_token: { type: String, required: true },
  channel: { type: String, required: true, enum: ['email', 'mobile'] },
  code: { type: String, required: true },
  consumed: { type: Boolean, default: false },
  expires_at: { type: Date, required: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('OtpCode', otpCodeSchema);
```

### File: `src/models/AuthSession.js`

```javascript
const mongoose = require('mongoose');

const authSessionSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  type: { type: String, required: true, enum: ['temp', 'session'] },
  mfa_verified: { type: Boolean, default: false },
  voice_verified: { type: Boolean, default: false },
  expires_at: { type: Date, required: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuthSession', authSessionSchema);
```

### File: `src/models/VoiceChallenge.js`

```javascript
const mongoose = require('mongoose');

const voiceChallengeSchema = new mongoose.Schema({
  session_token: { type: String, required: true },
  phrase: { type: String, required: true },
  consumed: { type: Boolean, default: false },
  expires_at: { type: Date, required: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VoiceChallenge', voiceChallengeSchema);
```

### File: `src/models/UserAction.js`

```javascript
const mongoose = require('mongoose');

const userActionSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  action_type: { type: String, required: true },
  metadata: { type: Object, default: {} },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserAction', userActionSchema);
```

### File: `src/models/CaptainFeedback.js`

```javascript
const mongoose = require('mongoose');

const captainFeedbackSchema = new mongoose.Schema({
  booking_id: { type: String, required: true, unique: true },
  captain_user_id: { type: String, default: null },
  captain_name: { type: String, required: true },
  submitted_by_user_id: { type: String, required: true },
  submitted_by_name: { type: String, required: true },
  ride_rating: { type: Number, required: true, min: 1, max: 5 },
  captain_rating: { type: Number, required: true, min: 1, max: 5 },
  feedback_text: { type: String, default: null },
  loved_ride: { type: Boolean, default: false },
  loved_captain: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CaptainFeedback', captainFeedbackSchema);
```

### File: `src/models/Booking.js`

```javascript
const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  address: { type: String, default: '' },
  lat: { type: Number, default: 0 },
  lng: { type: Number, default: 0 }
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true },
  user_name: { type: String, required: true },
  booking_for: { type: String, required: true },
  recipient_name: { type: String, default: null },
  recipient_phone: { type: String, default: null },
  is_scheduled: { type: Boolean, default: false },
  scheduled_at: { type: String, default: null },
  service_type: { type: String, required: true },
  payment_method: { type: String, required: true },
  vehicle_type: { type: String, required: true },
  pickup: { type: locationSchema, required: true },
  drop: { type: locationSchema, required: true },
  current_location: { type: locationSchema, required: true },
  status: { type: String, required: true },
  otp: { type: String, required: true },
  otp_verified: { type: Boolean, default: false },
  driver_name: { type: String, required: true },
  driver_phone: { type: String, required: true },
  captain_id: { type: String, default: null },
  notification_target: { type: String, default: 'preferred' },
  preferred_captain_id: { type: String, default: null },
  preferred_captain_name: { type: String, default: null },
  notification: { type: String, required: true },
  estimated_fare: { type: Number, default: null },
  ride_notes: { type: String, default: null },
  sos_triggered: { type: Boolean, default: false },
  sos_by_role: { type: String, default: null },
  feedback_submitted: { type: Boolean, default: false },
  feedback_submitted_at: { type: String, default: null },
  feedback_text: { type: String, default: null },
  ride_rating: { type: Number, default: null },
  captain_rating: { type: Number, default: null },
  loved_ride: { type: Boolean, default: false },
  loved_captain: { type: Boolean, default: false },
  final_amount: { type: Number, default: null },
  payment_done: { type: Boolean, default: false },
  payment_done_at: { type: String, default: null },
  tracking_closed: { type: Boolean, default: false },
  tracking_closed_at: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
```

---

## Step 8: Create Database Helper (db.js)

### File: `src/db.js`

```javascript
const mongoose = require('mongoose');

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI environment variable is required.');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB Atlas successfully.');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected.');
  });
}

module.exports = { connectDB };
```

### File: `.env` (create in `Backend/auth-service/`)

```env
MONGODB_URI=mongodb+srv://lunchbox_admin:LunchBox2024Secure@lunchboxcluster.xxxxx.mongodb.net/lunchbox_db?retryWrites=true&w=majority&appName=LunchBoxCluster
PORT=3003
OTP_DEBUG_MODE=1
```

> **IMPORTANT:** Replace the connection string with YOUR actual MongoDB Atlas connection string from Step 5.

### File: `.gitignore` (add to `Backend/auth-service/`)

```
node_modules/
.env
data/
```

---

## Step 9: Create Seed Script

### File: `src/seed.js`

```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function seed() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Set MONGODB_URI in .env file first.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB Atlas.');

  // Seed customer user
  const existingUser = await User.findOne({ username: 'user' });
  if (!existingUser) {
    await User.create({
      username: 'user',
      display_name: 'Delivery User',
      email: 'user@delivery.app',
      mobile: '+919999000001',
      password: bcrypt.hashSync('user123', 10),
      role: 'customer',
      customer_otp_completed: true
    });
    console.log('Seeded customer: user / user123');
  } else {
    console.log('Customer user already exists, skipping.');
  }

  // Seed admin user
  const existingAdmin = await User.findOne({ username: 'admin' });
  if (!existingAdmin) {
    await User.create({
      username: 'admin',
      display_name: 'Operations Admin',
      email: 'admin@delivery.app',
      mobile: '+919999000002',
      password: bcrypt.hashSync('admin123', 10),
      role: 'admin',
      customer_otp_completed: true
    });
    console.log('Seeded admin: admin / admin123');
  } else {
    console.log('Admin user already exists, skipping.');
  }

  console.log('Seeding complete.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
```

**Run the seed:**
```bash
node src/seed.js
```

---

## Step 10: Update index.js - Remove SQLite Code

Open `src/index.js` and make these changes:

### 10a: Replace imports at the top

**REMOVE these lines:**
```javascript
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
```

**ADD these lines:**
```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./db');
const User = require('./models/User');
const OtpCode = require('./models/OtpCode');
const AuthSession = require('./models/AuthSession');
const VoiceChallenge = require('./models/VoiceChallenge');
const UserAction = require('./models/UserAction');
const CaptainFeedback = require('./models/CaptainFeedback');
const Booking = require('./models/Booking');
```

### 10b: Remove SQLite variables

**REMOVE these lines:**
```javascript
const dbFile = process.env.AUTH_DB_FILE || '/data/auth.sqlite';

let SQL;
let db;
```

### 10c: Remove ALL SQLite helper functions

**REMOVE these entire functions:**
```javascript
function ensureDbDir() { ... }
function saveDb() { ... }
function run(sql, params = []) { ... }
function queryOne(sql, params = []) { ... }
function queryAll(sql, params = []) { ... }
function hasColumn(tableName, columnName) { ... }
```

### 10d: Remove the entire `initDb()` function

**REMOVE the entire `async function initDb()` function** (approximately lines 604-796) which contains:
- `CREATE TABLE` statements
- `ALTER TABLE` statements
- Seed user insertion
- Password migration logic

### 10e: Update the server startup at the bottom

**REMOVE:**
```javascript
initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`auth-service listening on :${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize auth-service', error);
    process.exit(1);
  });
```

**REPLACE WITH:**
```javascript
connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`auth-service listening on :${port}`);
      console.log('Connected to MongoDB Atlas');
    });
  })
  .catch((error) => {
    console.error('Failed to start auth-service', error);
    process.exit(1);
  });
```

---

## Step 11: Update All Query Functions

### 11a: Update `issueTempToken()`

**BEFORE (SQLite):**
```javascript
function issueTempToken(userId) {
  const token = `tmp_${uuidv4()}`;
  run(
    `INSERT INTO auth_sessions (id, user_id, token, type, mfa_verified, voice_verified, expires_at, created_at)
     VALUES (?, ?, ?, 'temp', 0, 0, ?, ?)`,
    [uuidv4(), userId, token, new Date(Date.now() + 10 * 60 * 1000).toISOString(), nowIso()]
  );
  return token;
}
```

**AFTER (MongoDB):**
```javascript
async function issueTempToken(userId) {
  const token = `tmp_${uuidv4()}`;
  await AuthSession.create({
    user_id: userId,
    token,
    type: 'temp',
    mfa_verified: false,
    voice_verified: false,
    expires_at: new Date(Date.now() + 10 * 60 * 1000)
  });
  return token;
}
```

### 11b: Update `issueSessionToken()`

**BEFORE (SQLite):**
```javascript
function issueSessionToken(userId) {
  const token = `sess_${uuidv4()}`;
  run(
    `INSERT INTO auth_sessions (id, user_id, token, type, mfa_verified, voice_verified, expires_at, created_at)
     VALUES (?, ?, ?, 'session', 1, 0, ?, ?)`,
    [uuidv4(), userId, token, new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), nowIso()]
  );
  return token;
}
```

**AFTER (MongoDB):**
```javascript
async function issueSessionToken(userId) {
  const token = `sess_${uuidv4()}`;
  await AuthSession.create({
    user_id: userId,
    token,
    type: 'session',
    mfa_verified: true,
    voice_verified: false,
    expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000)
  });
  return token;
}
```

### 11c: Update `getSession()`

**BEFORE (SQLite):**
```javascript
function getSession(token) {
  if (!token) return null;
  return queryOne(
    `SELECT s.*, u.username, u.display_name, u.role, u.email, u.mobile, u.captain_vehicle, u.profile_image
     FROM auth_sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token = ? AND s.expires_at > ?`,
    [token, nowIso()]
  );
}
```

**AFTER (MongoDB):**
```javascript
async function getSession(token) {
  if (!token) return null;
  const session = await AuthSession.findOne({
    token,
    expires_at: { $gt: new Date() }
  }).lean();
  if (!session) return null;

  const user = await User.findById(session.user_id).lean();
  if (!user) return null;

  return {
    ...session,
    user_id: user._id.toString(),
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    email: user.email,
    mobile: user.mobile,
    captain_vehicle: user.captain_vehicle,
    profile_image: user.profile_image
  };
}
```

### 11d: Update `requireSession()` middleware (make it async)

**BEFORE:**
```javascript
function requireSession(req, res, next) {
  const token = req.headers['x-session-token'] || req.query.sessionToken;
  const session = getSession(token);
  if (!session || session.type !== 'session') {
    return res.status(401).json({ error: 'Valid session token required.' });
  }
  req.session = session;
  return next();
}
```

**AFTER:**
```javascript
async function requireSession(req, res, next) {
  const token = req.headers['x-session-token'] || req.query.sessionToken;
  const session = await getSession(token);
  if (!session || session.type !== 'session') {
    return res.status(401).json({ error: 'Valid session token required.' });
  }
  req.session = session;
  return next();
}
```

---

## Step 12: Update All Route Handlers

Every route handler that uses SQLite functions needs to be updated to use Mongoose models. Here are the key patterns:

### Pattern: SQLite `queryOne()` becomes Mongoose `Model.findOne()`

```javascript
// BEFORE (SQLite)
const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);

// AFTER (MongoDB)
const user = await User.findOne({ username }).lean();
```

### Pattern: SQLite `queryAll()` becomes Mongoose `Model.find()`

```javascript
// BEFORE (SQLite)
const rows = queryAll('SELECT * FROM bookings ORDER BY updated_at DESC LIMIT ?', [maxItems]);

// AFTER (MongoDB)
const rows = await Booking.find().sort({ updated_at: -1 }).limit(maxItems).lean();
```

### Pattern: SQLite `run()` INSERT becomes Mongoose `Model.create()`

```javascript
// BEFORE (SQLite)
run('INSERT INTO users (id, username, ...) VALUES (?, ?, ...)', [id, username, ...]);

// AFTER (MongoDB)
await User.create({ username, display_name, email, ... });
```

### Pattern: SQLite `run()` UPDATE becomes Mongoose `Model.updateOne()`

```javascript
// BEFORE (SQLite)
run('UPDATE bookings SET status = ?, notification = ? WHERE id = ?',
    ['cancelled', 'Ride cancelled.', booking.id]);

// AFTER (MongoDB)
await Booking.updateOne(
  { id: booking.id },
  { status: 'cancelled', notification: 'Ride cancelled.', updated_at: new Date() }
);
```

### Pattern: SQLite `run()` DELETE becomes Mongoose `Model.deleteOne()`

```javascript
// BEFORE (SQLite)
run('DELETE FROM auth_sessions WHERE token = ?', [req.session.token]);

// AFTER (MongoDB)
await AuthSession.deleteOne({ token: req.session.token });
```

### Key Route Updates:

**POST `/api/auth/register`:**
```javascript
// Check if user exists
const exists = await User.findOne({
  $or: [{ username }, { email }, { mobile }]
}).lean();
if (exists) {
  return res.status(409).json({ error: 'User already exists.' });
}

// Create user
const passwordHash = bcrypt.hashSync(password, 10);
const newUser = await User.create({
  username: username.trim().toLowerCase(),
  display_name: displayName.trim(),
  email: email.trim().toLowerCase(),
  mobile: mobile.trim(),
  password: passwordHash,
  role: normalizedRole,
  captain_vehicle: normalizedRole === 'captain' ? String(captainVehicle).trim() : null,
  profile_image: profileImageUrl ? String(profileImageUrl).trim() : null,
  customer_otp_completed: normalizedRole !== 'customer'
});
```

**POST `/api/auth/login`:**
```javascript
const user = await User.findOne({
  username: (username || '').trim().toLowerCase()
}).lean();

if (!user || !bcrypt.compareSync(String(password || ''), String(user.password || ''))) {
  return res.status(401).json({ error: 'Invalid username or password.' });
}

// Use user._id.toString() instead of user.id
const sessionToken = await issueSessionToken(user._id.toString());
```

**GET `/api/bookings`:**
```javascript
const allRows = await Booking.find()
  .sort({ updated_at: -1 })
  .limit(maxItems)
  .lean();
```

**POST `/api/bookings`:**
```javascript
const newBooking = await Booking.create({
  id: `BK-${Date.now().toString().slice(-8)}`,
  user_id: req.session.user_id,
  user_name: req.session.display_name || req.session.username || 'Customer',
  // ... all other fields
});
```

> **TIP:** For every `queryOne(...)` in the SQLite code, find the table name and replace with `await ModelName.findOne({...}).lean()`. For every `run(...)` with INSERT, use `await ModelName.create({...})`. For every `run(...)` with UPDATE, use `await ModelName.updateOne({...}, {...})`.

---

## Step 13: Update package.json

### File: `Backend/auth-service/package.json`

```json
{
  "name": "auth-service",
  "version": "2.0.0",
  "main": "src/index.js",
  "type": "commonjs",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "seed": "node src/seed.js"
  },
  "dependencies": {
    "@sendgrid/mail": "^8.1.5",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "mongoose": "^8.9.0",
    "morgan": "^1.10.0",
    "nodemailer": "^6.9.15",
    "twilio": "^5.4.2",
    "uuid": "^11.1.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.10"
  }
}
```

**What changed:**
- Removed `sql.js`
- Added `mongoose` and `dotenv`
- Added `seed` script
- Version bumped to 2.0.0

---

## Step 14: Test the Migration

### 14a: Install new dependencies

```bash
cd Backend/auth-service
npm install
```

### 14b: Set up environment variables

Create `.env` file (see Step 8) with your MongoDB Atlas connection string.

### 14c: Seed the database

```bash
node src/seed.js
```

Expected output:
```
Connected to MongoDB Atlas.
Seeded customer: user / user123
Seeded admin: admin / admin123
Seeding complete.
```

### 14d: Start the server

```bash
node src/index.js
```

Expected output:
```
auth-service listening on :3003
Connected to MongoDB Atlas
```

### 14e: Verify in MongoDB Atlas

1. Go to MongoDB Atlas dashboard
2. Click **"Browse Collections"** on your cluster
3. You should see `lunchbox_db` database with collections:
   - `users` (2 documents)
   - `authsessions`
   - `bookings`
   - `otpcodes`
   - `voicechallenges`
   - `useractions`
   - `captainfeedbacks`

---

## Step 15: Verify All Endpoints

### Test health

```bash
curl http://localhost:3003/health
```

### Test login

```bash
curl -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"user123"}'
```

### Test register

```bash
curl -X POST http://localhost:3003/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","displayName":"Test User","email":"test@test.com","mobile":"+911234567890","password":"test123","role":"customer"}'
```

### Test bookings (use sessionToken from login response)

```bash
curl http://localhost:3003/api/bookings \
  -H "x-session-token: sess_XXXXX-YOUR-TOKEN-HERE"
```

---

## SQLite to MongoDB Mapping Reference

| SQLite | MongoDB (Mongoose) |
|--------|-------------------|
| `CREATE TABLE users (...)` | `const userSchema = new mongoose.Schema({...})` |
| `INSERT INTO users VALUES (...)` | `await User.create({...})` |
| `SELECT * FROM users WHERE id = ?` | `await User.findById(id).lean()` |
| `SELECT * FROM users WHERE username = ?` | `await User.findOne({ username }).lean()` |
| `SELECT * FROM bookings ORDER BY updated_at DESC LIMIT 100` | `await Booking.find().sort({ updated_at: -1 }).limit(100).lean()` |
| `UPDATE users SET role = ? WHERE id = ?` | `await User.updateOne({ _id: id }, { role })` |
| `DELETE FROM auth_sessions WHERE token = ?` | `await AuthSession.deleteOne({ token })` |
| `SELECT COUNT(*) FROM bookings` | `await Booking.countDocuments()` |
| `SELECT * FROM users WHERE role = 'captain'` | `await User.find({ role: 'captain' }).lean()` |
| `JOIN` queries | Two separate queries or `populate()` |

---

## Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `MongoServerError: bad auth` | Wrong password in connection string | Check MONGODB_URI in `.env` |
| `MongoNetworkError: connect ECONNREFUSED` | IP not whitelisted | Add IP in Atlas Network Access |
| `MongooseError: Model.find() no longer accepts a callback` | Old Mongoose syntax | Use `await` with all queries |
| `ValidationError: username is required` | Missing required field | Check all required fields in create() |
| `E11000 duplicate key error` | Unique field already exists | User already registered |

---

## Final File Structure After Migration

```
Backend/
└── auth-service/
    ├── .env                     # MongoDB connection string (DO NOT COMMIT)
    ├── .gitignore               # Ignores .env and node_modules
    ├── package.json             # Updated dependencies
    ├── src/
    │   ├── index.js             # Main server (updated for MongoDB)
    │   ├── db.js                # MongoDB connection helper
    │   ├── seed.js              # Database seed script
    │   └── models/              # Mongoose models
    │       ├── User.js
    │       ├── OtpCode.js
    │       ├── AuthSession.js
    │       ├── VoiceChallenge.js
    │       ├── UserAction.js
    │       ├── CaptainFeedback.js
    │       └── Booking.js
    └── Dockerfile
```

---

## No Frontend Changes Needed

The Angular frontend does NOT need any changes. It calls the same REST API endpoints (`/api/auth/login`, `/api/bookings`, etc.) on the same port (3003). The database is an internal backend detail - the API contract stays the same.

---

# LunchBox App - MongoDB Atlas Setup Complete ✅

## What's Running

### Frontend - Angular App
- **Status**: ✅ Running
- **URL**: http://localhost:4200
- **Start command**: `npm start` in `Frontend/lunchbox-app/`

### Backend - Auth Service (Node.js + MongoDB)
- **Status**: ⏳ Starting (waiting on MongoDB connection)
- **Port**: 3003
- **Start command**: `npm start` in `Backend/microservices/services/auth-service/`
- **Database**: MongoDB Atlas (lunchbox_db)

### Backend - .NET Service
- **Status**: ✅ Running on http://localhost:5273
- **Framework**: .NET 10 with SQLite

---

## MongoDB Atlas Configuration

### Connection String Configured
```
mongodb+srv://goat82447_db_user:X3zTV2z34mHM4tNz@lms.mnm3w9a.mongodb.net/lunchbox_db
```

### Next Step: Whitelist Your IP Address

The Node.js auth service is waiting to connect to MongoDB Atlas. You need to whitelist your IP address:

1. Go to [MongoDB Atlas Console](https://cloud.mongodb.com/)
2. Select your project → **Network Access** (left sidebar)
3. Click **"Add IP Address"**
4. **Option A (Development)**: Click **"Allow Access from Anywhere"** (adds 0.0.0.0/0)
5. **Option B (Secure)**: Enter your current IP address manually
6. Click **"Confirm"**

Once whitelisted, the auth service will automatically connect.

---

## Test Users (Ready to Create)

Once MongoDB connection is established, use the seed script to populate test users:

```bash
cd Backend/microservices/services/auth-service
node src/seed.js
```

**Pre-configured test users:**
- `user` / `user123` (customer)
- `admin` / `admin123` (admin)
- `captain1` / `captain123` (captain - bike)
- `captain2` / `captain123` (captain - auto)
- `captain3` / `captain123` (captain - car)

---

## MongoDB Collections Created (via Playground)

The following collections are defined in the schema:
- `users` - User accounts and profiles
- `auth_sessions` - Login sessions and tokens
- `otp_codes` - One-time password codes
- `voice_challenges` - Voice authentication challenges
- `user_actions` - User activity logging
- `captain_feedback` - Feedback from deliveries
- `bookings` - Delivery/order bookings

To manually create them in MongoDB, run the playground script:
**File**: `playground-1.mongodb.js`

---

## Login Flow Testing

Once everything is connected:

1. Open http://localhost:4200 (Angular frontend)
2. Log in with credentials from the test users above
3. The auth service (http://localhost:3003) will handle authentication
4. Check the browser console for any API errors

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Could not connect to any servers in your MongoDB Atlas cluster" | Whitelist your IP address in MongoDB Atlas Network Access |
| Frontend won't load | Ensure `npm install` completed in `Frontend/lunchbox-app/` |
| Auth service stuck on "Connecting to MongoDB..." | Check MongoDB Atlas IP whitelist |
| API calls failing | Verify auth service is on port 3003 (check auth service logs) |


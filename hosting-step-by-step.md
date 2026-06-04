# Ekart Free Hosting Complete Deployment Guide

This is the full production checklist for your project.

Hosting plan:

- Frontend: Vercel (free)
- Backend API (Node auth-service): Render (free)
- Database: MongoDB Atlas M0 (free)

## 1. Pre-Deploy Checklist

1. Push latest code to GitHub.
2. Verify these folders exist:
   - Frontend/lunchbox-app
   - Backend/microservices/services/auth-service
3. Ensure no secret keys are committed.
4. Keep local .env for local only and use Render Environment Variables for production.

## 2. MongoDB Atlas Setup

1. Sign in to Atlas.
2. Create or reuse an M0 cluster.
3. Create database user with readWrite access.
4. In Network Access add:
   - Temporary for testing: 0.0.0.0/0
   - Later restrict to known IPs.
5. Use connection string in this format:

mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/lunchbox_db?retryWrites=true&w=majority

## 3. Deploy Node Backend on Render

Create a new Render Web Service:

1. Repository: your GitHub repo
2. Root Directory: Backend/microservices/services/auth-service
3. Runtime: Node
4. Build Command: npm install
5. Start Command: npm start

Add these environment variables in Render:

1. MONGODB_URI = atlas connection string
2. PORT = 3003
3. OTP_DEBUG_MODE = 1
4. REQUIRE_CUSTOMER_REGISTRATION_OTP = 0
5. ENABLE_INMEMORY_FALLBACK = 0
6. Optional keys if used:
   - GOOGLE_MAPS_API_KEY
   - OPENWEATHER_API_KEY
   - SENDGRID_API_KEY
   - SENDGRID_FROM_EMAIL
   - TWILIO_ACCOUNT_SID
   - TWILIO_AUTH_TOKEN
   - TWILIO_FROM_NUMBER

After deploy verify:

1. Open https://your-auth-service.onrender.com/health
2. Expected response includes database connected.

## 4. Required Frontend Code Changes Before Vercel Deploy

Replace all localhost API URLs with your Render backend URL.

Use this value:

AUTH_BASE = https://your-auth-service.onrender.com

Update these files:

1. Frontend/lunchbox-app/src/app/core/services/auth.service.ts
   - Change authApi from http://localhost:3003/api/auth
   - To https://your-auth-service.onrender.com/api/auth

2. Frontend/lunchbox-app/src/app/core/services/booking.service.ts
   - Change BOOKINGS_API from http://localhost:3003/api/bookings
   - To https://your-auth-service.onrender.com/api/bookings

3. Frontend/lunchbox-app/src/app/core/services/integration-health.service.ts
   - Change integration API from http://localhost:3003/api/integrations
   - To https://your-auth-service.onrender.com/api/integrations

4. Frontend/lunchbox-app/src/app/core/services/pricing.service.ts
   - Change pricing API from http://localhost:3003/api/pricing
   - To https://your-auth-service.onrender.com/api/pricing

5. Frontend/lunchbox-app/src/app/features/tracking/tracking.component.ts
   - Replace localhost fallback origin with your Vercel URL or dynamic window location only.

6. If these are used in UI, update API gateway URLs too:
   - Frontend/lunchbox-app/src/app/services/order.service.ts
   - Frontend/lunchbox-app/src/app/services/user.service.ts
   - They currently point to localhost:3000 and need a deployed gateway URL.

## 5. Recommended Frontend Improvement (Strongly Suggested)

Instead of hardcoded URLs, move API base URLs to Angular environment files.

Create:

1. Frontend/lunchbox-app/src/environments/environment.ts
2. Frontend/lunchbox-app/src/environments/environment.prod.ts

Set API URL once and use environment.apiBaseUrl across services.

## 6. Deploy Frontend on Vercel

Create Vercel project:

1. Framework: Angular
2. Root Directory: Frontend/lunchbox-app
3. Build Command: npm run build
4. Output Directory:
   - dist/lunchbox-app/browser
   - If not found, use dist/lunchbox-app

Deploy and open the Vercel URL.

## 7. Backend CORS for Production

Your backend currently uses open CORS in Node service.

File:

- Backend/microservices/services/auth-service/src/index.js

Current:

- app.use(cors());

Production recommendation:

1. Allow only:
   - your Vercel frontend domain
   - localhost for development
2. Redeploy Render service after CORS restriction.

## 8. Full Validation After Deploy

Test in order:

1. Open frontend URL.
2. Register a customer.
3. Login as:
   - user user123
   - admin admin123
   - captain1 captain123
4. Confirm captain list loads.
5. Confirm bookings endpoints work.
6. Confirm no CORS errors in browser console.
7. Check Render logs for 500 or Mongo errors.

## 9. Known Free Tier Behavior

1. Render free service sleeps when idle.
2. First request can be slow.
3. Atlas M0 has limits but is enough for demo/testing.

## 10. Troubleshooting Quick Fixes

### Backend fails to start with Mongo error

1. Verify Render MONGODB_URI value.
2. Verify Atlas Network Access has allowed traffic.
3. Verify Atlas DB user/password.

### Frontend login fails

1. Confirm auth.service.ts points to Render URL.
2. Confirm Render service is awake.
3. Check browser network tab for exact failing endpoint.

### Captains or bookings not loading

1. Confirm booking.service.ts and integration-health.service.ts URLs were updated.
2. Confirm login session token is being sent.

You are now ready for a full free deployment with MongoDB Atlas + Render + Vercel.

# Free Hosting & Deployment Guide

Step-by-step guide to deploy the LunchBox Delivery Platform for **FREE** using cloud services.

---

## Hosting Overview

| Component | Service | Free Tier | URL After Deploy |
|-----------|---------|-----------|-----------------|
| Angular Frontend | **Vercel** | Unlimited deploys, 100GB bandwidth | `https://your-app.vercel.app` |
| Node.js Backend | **Render** | 750 hours/month, auto-sleep after 15min idle | `https://your-api.onrender.com` |
| Database | **MongoDB Atlas** | 512MB storage, shared cluster | Cloud-hosted |

**Other Free Options:**

| Component | Alternative Services |
|-----------|---------------------|
| Frontend | Netlify, Firebase Hosting, GitHub Pages, Cloudflare Pages |
| Backend | Railway (500 hours/month), Cyclic, Fly.io (3 shared VMs) |
| Database | MongoDB Atlas (free M0), Supabase (PostgreSQL), PlanetScale |

---

## Part 1: Deploy Frontend to Vercel

### Step 1: Create Vercel Account

1. Go to **https://vercel.com**
2. Click **"Sign Up"**
3. Sign up with **GitHub** (recommended) or email
4. Verify your account

### Step 2: Push Frontend Code to GitHub

If not already on GitHub:

```bash
# Navigate to frontend folder
cd Frontend/lunchbox-app

# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit - LunchBox frontend"

# Create a new repository on GitHub (https://github.com/new)
# Then push:
git remote add origin https://github.com/YOUR_USERNAME/lunchbox-frontend.git
git branch -M main
git push -u origin main
```

### Step 3: Update API URL for Production

Before deploying, update the API URL in the frontend to point to your deployed backend.

**File: `src/app/core/services/auth.service.ts`**

Find:
```typescript
private readonly authApi = 'http://localhost:3003/api/auth';
```

Replace with:
```typescript
private readonly authApi = 'https://YOUR-BACKEND-URL.onrender.com/api/auth';
```

**Do the same in ALL service files:**
- `booking.service.ts` - change `http://localhost:3003` to `https://YOUR-BACKEND-URL.onrender.com`
- `pricing.service.ts` - same change
- `integration-health.service.ts` - same change

> **Better approach:** Use Angular environment files:

**File: `src/environments/environment.ts`** (create if not exists)
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3003'
};
```

**File: `src/environments/environment.prod.ts`** (create if not exists)
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://YOUR-BACKEND-URL.onrender.com'
};
```

Then in services:
```typescript
import { environment } from '../../../environments/environment';

private readonly authApi = `${environment.apiUrl}/api/auth`;
```

### Step 4: Deploy to Vercel

**Option A: Via Vercel Dashboard (Easiest)**

1. Go to **https://vercel.com/dashboard**
2. Click **"Add New" > "Project"**
3. Import your GitHub repository (`lunchbox-frontend`)
4. Configure Build Settings:
   - **Framework Preset:** Angular
   - **Build Command:** `ng build --configuration production`
   - **Output Directory:** `dist/lunchbox-app/browser`
   - **Install Command:** `npm install`
5. Click **"Deploy"**
6. Wait 1-2 minutes
7. Your app is live at `https://lunchbox-frontend.vercel.app`

**Option B: Via Vercel CLI**

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to frontend
cd Frontend/lunchbox-app

# Build the project first
ng build --configuration production

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? lunchbox-frontend
# - Directory? ./dist/lunchbox-app/browser
# - Override settings? No
```

### Step 5: Configure Vercel for Angular Routing

Angular uses client-side routing, so you need to handle 404s. Create this file:

**File: `vercel.json`** (in frontend root `Frontend/lunchbox-app/`)

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

Commit and push:
```bash
git add vercel.json
git commit -m "Add Vercel routing config"
git push
```

Vercel auto-redeploys on every push.

### Step 6: Verify Frontend Deployment

1. Open your Vercel URL: `https://your-app.vercel.app`
2. You should see the login page
3. Check browser console for any errors
4. Test login (will fail until backend is deployed)

---

## Part 2: Deploy Backend to Render

### Step 1: Create Render Account

1. Go to **https://render.com**
2. Click **"Get Started for Free"**
3. Sign up with **GitHub** (recommended)
4. Verify your email

### Step 2: Push Backend Code to GitHub

```bash
# Navigate to backend folder
cd Backend/auth-service

# Initialize git
git init

# Create .gitignore
echo "node_modules/" > .gitignore
echo ".env" >> .gitignore
echo "data/" >> .gitignore

git add .
git commit -m "Initial commit - LunchBox backend"

# Create a new repository on GitHub
git remote add origin https://github.com/YOUR_USERNAME/lunchbox-backend.git
git branch -M main
git push -u origin main
```

### Step 3: Create Web Service on Render

1. Go to **https://dashboard.render.com**
2. Click **"New" > "Web Service"**
3. Connect your GitHub repository (`lunchbox-backend`)
4. Configure:
   - **Name:** `lunchbox-backend`
   - **Region:** Choose closest (e.g., Singapore for India)
   - **Branch:** `main`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node src/index.js`
   - **Instance Type:** **Free**

5. Click **"Create Web Service"**

### Step 4: Add Environment Variables on Render

1. In your Render web service, go to **"Environment"** tab
2. Add these variables:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | `mongodb+srv://lunchbox_admin:YOUR_PASSWORD@cluster.mongodb.net/lunchbox_db?retryWrites=true&w=majority` |
| `PORT` | `3003` |
| `OTP_DEBUG_MODE` | `1` |
| `NODE_ENV` | `production` |

> **Note:** Use your actual MongoDB Atlas connection string from the migration guide.

3. Click **"Save Changes"**
4. Render will auto-redeploy

### Step 5: Update CORS in Backend

Update your `src/index.js` to allow your Vercel frontend:

```javascript
app.use(cors({
  origin: [
    'http://localhost:4200',
    'http://localhost:4300',
    'https://your-app.vercel.app',    // Add your Vercel URL
    'https://lunchbox-frontend.vercel.app'
  ],
  credentials: true
}));
```

Or allow all origins (simpler for demo):
```javascript
app.use(cors());
```

### Step 6: Verify Backend Deployment

After Render finishes deploying (2-3 minutes):

1. Your backend URL will be: `https://lunchbox-backend.onrender.com`
2. Test health:
   ```bash
   curl https://lunchbox-backend.onrender.com/health
   ```
3. Test login:
   ```bash
   curl -X POST https://lunchbox-backend.onrender.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"user","password":"user123"}'
   ```

> **Note:** Free Render services "sleep" after 15 minutes of inactivity. First request after sleep takes 30-50 seconds to wake up.

---

## Part 3: Deploy Database to MongoDB Atlas

If you already completed the MongoDB migration guide, your database is already on Atlas. If not:

1. Follow Steps 1-5 of `mongodb-migration-guide.md`
2. Run the seed script: `node src/seed.js`
3. Copy the connection string to Render environment variables

---

## Part 4: Connect Everything

### Update Frontend API URL

After backend is deployed on Render, update the frontend:

**In all service files, replace:**
```typescript
'http://localhost:3003'
```

**With your Render URL:**
```typescript
'https://lunchbox-backend.onrender.com'
```

**Files to update:**
1. `src/app/core/services/auth.service.ts`
2. `src/app/core/services/booking.service.ts`
3. `src/app/core/services/pricing.service.ts`
4. `src/app/core/services/integration-health.service.ts`

Then push to GitHub:
```bash
git add .
git commit -m "Update API URL for production"
git push
```

Vercel auto-redeploys within 30 seconds.

### Verify Full Stack

1. Open `https://your-app.vercel.app`
2. Login with `user` / `user123`
3. Create a booking
4. Check MongoDB Atlas collections for new data

---

## Part 5: Alternative - Deploy to Netlify (Frontend)

If you prefer Netlify over Vercel:

### Step 1: Create Netlify Account

1. Go to **https://www.netlify.com**
2. Sign up with GitHub

### Step 2: Build the Frontend

```bash
cd Frontend/lunchbox-app
ng build --configuration production
```

### Step 3: Deploy

**Option A: Drag and Drop**
1. Go to Netlify dashboard
2. Drag the `dist/lunchbox-app/browser` folder onto the page
3. Done!

**Option B: CLI**
```bash
npm install -g netlify-cli
netlify deploy --dir=dist/lunchbox-app/browser --prod
```

### Step 4: Handle Angular Routing

Create **`Frontend/lunchbox-app/src/_redirects`** (in the `src` folder):
```
/*    /index.html   200
```

Add it to `angular.json` assets:
```json
"assets": [
  "src/favicon.ico",
  "src/assets",
  "src/_redirects"
]
```

Rebuild and redeploy.

---

## Part 6: Alternative - Deploy to Railway (Backend)

If you prefer Railway over Render:

### Step 1: Create Railway Account

1. Go to **https://railway.app**
2. Sign up with GitHub

### Step 2: Create Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your `lunchbox-backend` repo
4. Railway auto-detects Node.js

### Step 3: Add Environment Variables

Same variables as Render (Step 4 of Part 2).

### Step 4: Generate Domain

1. Go to **Settings > Networking**
2. Click **"Generate Domain"**
3. You get: `https://lunchbox-backend-production.up.railway.app`

> **Railway Free Tier:** 500 hours/month, 512MB RAM, no sleep (better than Render's 15-min sleep).

---

## Part 7: Alternative - Deploy to Firebase Hosting (Frontend)

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### Step 2: Initialize Firebase

```bash
cd Frontend/lunchbox-app
firebase init hosting
```

Configure:
- Public directory: `dist/lunchbox-app/browser`
- Single-page app: **Yes**
- GitHub auto deploys: Optional

### Step 3: Build and Deploy

```bash
ng build --configuration production
firebase deploy
```

Your URL: `https://your-project.web.app`

---

## Free Tier Comparison Table

| Service | Free Tier | Sleep? | Custom Domain | SSL |
|---------|-----------|--------|--------------|-----|
| **Vercel** | Unlimited deploys, 100GB bandwidth | No | Yes | Yes |
| **Netlify** | 300 build min/month, 100GB bandwidth | No | Yes | Yes |
| **Render** | 750 hours/month | Yes (15 min) | Yes | Yes |
| **Railway** | 500 hours/month, $5 credit | No | Yes | Yes |
| **Firebase** | 10GB storage, 360MB/day bandwidth | No | Yes | Yes |
| **MongoDB Atlas** | 512MB storage, shared | No | N/A | Yes |
| **Cloudflare Pages** | Unlimited requests, 500 builds/month | No | Yes | Yes |

---

## Recommended Free Stack (Best Combination)

| Component | Recommended | Why |
|-----------|------------|-----|
| Frontend | **Vercel** | Fastest CDN, auto-deploys from GitHub, perfect Angular support |
| Backend | **Render** | Easy setup, free SSL, auto-deploy from GitHub |
| Database | **MongoDB Atlas** | 512MB free forever, no credit card needed |

### Total Cost: $0/month

---

## Deployment Checklist

- [ ] MongoDB Atlas cluster created and seeded
- [ ] Backend code pushed to GitHub
- [ ] Backend deployed to Render with env variables
- [ ] Backend health check returns OK
- [ ] Frontend API URLs updated to Render URL
- [ ] Frontend code pushed to GitHub
- [ ] Frontend deployed to Vercel
- [ ] `vercel.json` added for routing
- [ ] Login tested on production URL
- [ ] Booking creation tested
- [ ] CORS configured correctly

---

## Troubleshooting Deployment Issues

### Frontend shows blank page on Vercel
**Fix:** Add `vercel.json` with rewrites (Step 5 of Part 1).

### Backend returns 503 on Render
**Fix:** Check Render logs. Usually means MongoDB connection string is wrong.

### CORS error in browser console
**Fix:** Add your Vercel URL to the CORS origin list in backend `index.js`.

### First request to Render takes 30+ seconds
**Expected:** Free Render services sleep after 15 min. First request wakes them up. Use a service like [UptimeRobot](https://uptimerobot.com/) to ping your backend every 14 minutes to keep it awake (free plan: 50 monitors).

### MongoDB connection timeout on Render
**Fix:** In MongoDB Atlas > Network Access, add `0.0.0.0/0` (allow all IPs) since Render's IP changes.

### Angular build fails on Vercel
**Fix:** Make sure `Output Directory` is set to `dist/lunchbox-app/browser` (not just `dist/`).

### Environment variables not working
**Fix:** On Render, after adding env vars, click "Manual Deploy" > "Deploy latest commit" to restart with new variables.

---

## Quick Deploy Commands Summary

```bash
# === BACKEND (Render) ===
cd Backend/auth-service
git init && git add . && git commit -m "Deploy backend"
git remote add origin https://github.com/YOU/lunchbox-backend.git
git push -u origin main
# Then connect on render.com dashboard

# === FRONTEND (Vercel) ===
cd Frontend/lunchbox-app
# Update API URLs to Render URL first!
git init && git add . && git commit -m "Deploy frontend"
git remote add origin https://github.com/YOU/lunchbox-frontend.git
git push -u origin main
# Then connect on vercel.com dashboard

# === DATABASE (MongoDB Atlas) ===
# Create cluster on mongodb.com/atlas
# Run: node src/seed.js
```

---

## Live URLs After Deployment

| Service | URL |
|---------|-----|
| Frontend | `https://lunchbox-frontend.vercel.app` |
| Backend API | `https://lunchbox-backend.onrender.com` |
| Backend Health | `https://lunchbox-backend.onrender.com/health` |
| MongoDB Atlas | `https://cloud.mongodb.com` (dashboard) |

---

## Author

**Krishna Kumar Bandoju**

---

# LunchBox Delivery Platform - Complete Project Setup Guide

Full setup documentation from scratch — development environment, tools, configuration, running, testing, and deployment.

---

## Table of Contents

1. [System Requirements](#1-system-requirements)
2. [Install Development Tools](#2-install-development-tools)
3. [Project Download & Setup](#3-project-download--setup)
4. [Backend Setup (Node.js Auth Service)](#4-backend-setup-nodejs-auth-service)
5. [Frontend Setup (Angular 20)](#5-frontend-setup-angular-20)
6. [Running the Full Application](#6-running-the-full-application)
7. [Application Walkthrough](#7-application-walkthrough)
8. [User Roles & Permissions](#8-user-roles--permissions)
9. [API Testing with Postman/curl](#9-api-testing-with-postmancurl)
10. [Development Workflow](#10-development-workflow)
11. [Project Architecture](#11-project-architecture)
12. [Configuration Reference](#12-configuration-reference)
13. [Common Issues & Solutions](#13-common-issues--solutions)
14. [VS Code Setup (Recommended)](#14-vs-code-setup-recommended)
15. [Git Setup & Version Control](#15-git-setup--version-control)

---

## 1. System Requirements

### Minimum Hardware
| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 4 GB | 8 GB |
| Disk Space | 2 GB | 5 GB |
| CPU | Dual Core | Quad Core |
| OS | Windows 10 / macOS 12 / Ubuntu 20 | Latest |

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20.x or higher | JavaScript runtime |
| npm | 10.x or higher | Package manager (comes with Node.js) |
| Angular CLI | 20.x | Frontend build tool |
| Git | Any | Version control |
| VS Code | Latest | Code editor (recommended) |
| Browser | Chrome/Edge/Firefox | Testing |

---

## 2. Install Development Tools

### 2.1 Install Node.js

**Windows:**
1. Go to https://nodejs.org
2. Download **LTS version** (v20.x or higher)
3. Run installer, check "Add to PATH"
4. Click Next > Next > Install

**macOS:**
```bash
# Option 1: Direct download from nodejs.org
# Option 2: Using Homebrew
brew install node
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Verify installation:**
```bash
node --version    # Should show v20.x.x or higher
npm --version     # Should show 10.x.x or higher
```

### 2.2 Install Angular CLI

```bash
npm install -g @angular/cli
```

**Verify:**
```bash
ng version
# Should show Angular CLI: 20.x.x
```

### 2.3 Install Git

**Windows:**
1. Go to https://git-scm.com/download/win
2. Download and install
3. During install, select "Git from the command line and also from 3rd-party software"

**macOS:**
```bash
# Usually pre-installed. If not:
brew install git
```

**Linux:**
```bash
sudo apt install git
```

**Verify:**
```bash
git --version    # Should show git version 2.x.x
```

### 2.4 Install VS Code (Recommended)

1. Go to https://code.visualstudio.com
2. Download for your OS
3. Install with default settings

**Recommended VS Code Extensions:**
- Angular Language Service
- ESLint
- Prettier
- Thunder Client (API testing)
- GitLens

---

## 3. Project Download & Setup

### 3.1 From Zip File

1. Extract the zip to a folder:
   ```
   C:\Ekart\           (Windows)
   ~/Projects/Ekart/   (Mac/Linux)
   ```

2. Verify folder structure:
   ```
   Ekart/
   ├── Frontend/
   │   └── lunchbox-app/
   ├── Backend/
   │   └── auth-service/
   ├── krishnaproject.md
   ├── mongodb-migration-guide.md
   ├── free-hosting-guide.md
   └── complete-project-setup.md    (this file)
   ```

### 3.2 From GitHub (if pushed to repo)

```bash
git clone https://github.com/YOUR_USERNAME/lunchbox-delivery.git
cd lunchbox-delivery
```

---

## 4. Backend Setup (Node.js Auth Service)

### 4.1 Navigate to Backend

```bash
cd Backend/auth-service
```

### 4.2 Install Dependencies

```bash
npm install
```

This installs:
- `express` - Web framework
- `cors` - Cross-origin support
- `morgan` - HTTP request logging
- `sql.js` - SQLite database (runs in-memory + file)
- `bcryptjs` - Password hashing
- `uuid` - Unique ID generation
- `@sendgrid/mail` - Email OTP (optional)
- `nodemailer` - Gmail OTP (optional)
- `twilio` - SMS OTP (optional)

### 4.3 Create Data Directory

```bash
mkdir data
```

### 4.4 Start the Backend

**Windows (Command Prompt):**
```cmd
set AUTH_DB_FILE=./data/auth.sqlite
set OTP_DEBUG_MODE=1
node src/index.js
```

**Windows (PowerShell):**
```powershell
$env:AUTH_DB_FILE="./data/auth.sqlite"
$env:OTP_DEBUG_MODE="1"
node src/index.js
```

**Mac/Linux:**
```bash
AUTH_DB_FILE=./data/auth.sqlite OTP_DEBUG_MODE=1 node src/index.js
```

### 4.5 Verify Backend is Running

You should see:
```
auth-service listening on :3003
```

Test with browser or curl:
```bash
curl http://localhost:3003/health
```

Response:
```json
{"service":"auth-service","status":"ok"}
```

### 4.6 What Happens on First Start

1. SQLite database is created at `./data/auth.sqlite`
2. All tables are auto-created (users, bookings, sessions, etc.)
3. Two default users are seeded:
   - Customer: `user` / `user123`
   - Admin: `admin` / `admin123`
4. Server starts listening on port 3003

---

## 5. Frontend Setup (Angular 20)

### 5.1 Navigate to Frontend

Open a **NEW terminal** (keep backend running in the first one):

```bash
cd Frontend/lunchbox-app
```

### 5.2 Install Dependencies

```bash
npm install
```

This downloads ~300MB of Angular packages. Wait for it to complete (2-5 minutes depending on internet speed).

### 5.3 Start the Frontend

```bash
ng serve --port 4300
```

Or with auto-open browser:
```bash
ng serve --port 4300 --open
```

You should see:
```
✔ Compiled successfully.
Watch mode enabled. Watching for file changes...
  ➜  Local: http://localhost:4300/
```

### 5.4 Open the Application

Open your browser and go to:
```
http://localhost:4300
```

You should see the **Login page**.

---

## 6. Running the Full Application

### 6.1 Quick Start (Two Terminals)

**Terminal 1 — Backend:**
```bash
cd Backend/auth-service
AUTH_DB_FILE=./data/auth.sqlite OTP_DEBUG_MODE=1 node src/index.js
```

**Terminal 2 — Frontend:**
```bash
cd Frontend/lunchbox-app
ng serve --port 4300
```

**Browser:**
```
http://localhost:4300
```

### 6.2 Port Reference

| Service | Port | URL |
|---------|------|-----|
| Backend API | 3003 | http://localhost:3003 |
| Frontend App | 4300 | http://localhost:4300 |
| Health Check | 3003 | http://localhost:3003/health |

### 6.3 Stopping the Application

- Press `Ctrl + C` in each terminal to stop
- Or close the terminal windows

---

## 7. Application Walkthrough

### 7.1 Login Page

1. Open `http://localhost:4300`
2. Enter credentials:
   - Username: `user`
   - Password: `user123`
3. Click **Login**
4. You'll be redirected to the Home page

### 7.2 Home Page (Customer)

- View available delivery options
- Quick booking buttons
- Recent booking history

### 7.3 Create a Booking

1. Click **"Book Now"** or navigate to Booking page
2. Fill in:
   - Pickup address
   - Drop address
   - Service type (food/parcel/document)
   - Vehicle type (bike/auto/car)
   - Payment method
3. Optionally select a preferred captain
4. Click **"Confirm Booking"**
5. You'll receive an OTP for verification

### 7.4 Tracking Page

- View active bookings
- Real-time status updates
- OTP verification with captain
- SOS emergency button
- Cancel booking option

### 7.5 Admin Panel

1. Logout and login as `admin` / `admin123`
2. Access admin features:
   - View all bookings across users
   - Monitor system health
   - View audit logs
   - Manage captains

### 7.6 Captain Flow

1. Register a new account with role "Captain"
2. Login as captain
3. View assigned bookings
4. Approve/start rides
5. View earnings and ratings

---

## 8. User Roles & Permissions

| Feature | Customer | Captain | Admin |
|---------|----------|---------|-------|
| Login/Register | Yes | Yes | Yes |
| Create Booking | Yes | No | No |
| View Own Bookings | Yes | Assigned Only | All |
| Verify OTP | Yes | Yes | No |
| Approve Ride | No | Yes | No |
| Cancel Booking | Yes | Yes | Yes |
| Trigger SOS | Yes | Yes | No |
| Submit Feedback | Yes | No | No |
| Process Payment | Yes | No | No |
| View All Bookings | No | No | Yes |
| View Audit Logs | No | No | Yes |
| Integration Health | No | No | Yes |
| Captain Profile | No | Yes | No |

### Default Accounts

| Username | Password | Role | Features |
|----------|----------|------|----------|
| `user` | `user123` | Customer | Book, track, pay, rate |
| `admin` | `admin123` | Admin | Full access, audit, health |

### Register New Users

Go to the Register page and create accounts with:
- **Customer** — for ordering deliveries
- **Captain** — for accepting and fulfilling deliveries (requires vehicle type)
- **Admin** — for system management

---

## 9. API Testing with Postman/curl

### 9.1 Test Login

```bash
curl -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"user123"}'
```

**Response:**
```json
{
  "requiresOtp": false,
  "sessionToken": "sess_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "user": {
    "id": "...",
    "username": "user",
    "displayName": "Delivery User",
    "role": "customer",
    "email": "user@delivery.app",
    "mobile": "+919999000001"
  },
  "message": "Login successful."
}
```

### 9.2 Test Protected Endpoints

Use the `sessionToken` from login response:

```bash
# Get bookings (pass session token in header)
curl http://localhost:3003/api/bookings \
  -H "x-session-token: sess_YOUR_TOKEN_HERE"
```

### 9.3 Create a Booking

```bash
curl -X POST http://localhost:3003/api/bookings \
  -H "Content-Type: application/json" \
  -H "x-session-token: sess_YOUR_TOKEN_HERE" \
  -d '{
    "pickup": {"address": "MG Road, Bangalore", "lat": 12.9716, "lng": 77.5946},
    "drop": {"address": "Indiranagar, Bangalore", "lat": 12.9784, "lng": 77.6408},
    "serviceType": "food",
    "vehicleType": "bike",
    "paymentMethod": "cash"
  }'
```

### 9.4 Register New User

```bash
curl -X POST http://localhost:3003/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "captain1",
    "displayName": "Ravi Kumar",
    "email": "ravi@delivery.app",
    "mobile": "+919876543210",
    "password": "captain123",
    "role": "captain",
    "captainVehicle": "bike"
  }'
```

### 9.5 Postman Collection

Import these endpoints into Postman:
1. Create a new Collection: "LunchBox API"
2. Set base URL variable: `{{baseUrl}}` = `http://localhost:3003`
3. Add endpoints from the API list in `krishnaproject.md`
4. Set `x-session-token` header as a collection variable

---

## 10. Development Workflow

### 10.1 Making Frontend Changes

1. Edit files in `Frontend/lunchbox-app/src/`
2. Angular auto-reloads in browser (hot reload)
3. No need to restart `ng serve`

### 10.2 Making Backend Changes

1. Edit `Backend/auth-service/src/index.js`
2. **Stop** the server (`Ctrl+C`)
3. **Restart:** `node src/index.js`

**For auto-restart on changes (development):**
```bash
npm run dev
```
This uses `nodemon` to watch for file changes.

### 10.3 Resetting the Database

If data gets corrupted or you want a fresh start:

```bash
# Delete the SQLite database file
rm Backend/auth-service/data/auth.sqlite

# Restart the backend — it auto-creates fresh DB with seed data
node src/index.js
```

### 10.4 Adding New Features

**Frontend (Angular):**
```bash
cd Frontend/lunchbox-app

# Generate a new component
ng generate component features/my-new-page

# Generate a new service
ng generate service core/services/my-new-service
```

**Backend (Node.js):**
- Add new routes in `src/index.js`
- Follow the existing pattern: define route → validate input → query DB → return JSON

---

## 11. Project Architecture

### 11.1 High-Level Architecture

```
┌────────────────────┐         ┌─────────────────────┐
│   Angular Frontend │  HTTP   │   Node.js Backend   │
│   (Port 4300)      │────────>│   (Port 3003)       │
│                    │         │                     │
│  - Login Page      │         │  - Express Server   │
│  - Booking Page    │         │  - REST API         │
│  - Tracking Page   │         │  - SQLite Database  │
│  - Admin Panel     │         │  - Session Auth     │
│  - Captain View    │         │  - OTP Service      │
└────────────────────┘         └─────────────────────┘
```

### 11.2 Frontend Architecture

```
src/app/
├── app.ts                    # Root component (layout, navigation)
├── app.routes.ts             # All route definitions
├── app.config.ts             # App-level providers
│
├── features/                 # Page-level components (smart components)
│   ├── login/                # Login page
│   ├── register/             # Registration page
│   ├── home/                 # Home dashboard
│   ├── booking/              # Create booking flow
│   ├── tracking/             # Live tracking
│   ├── admin/                # Admin dashboard
│   ├── audit/                # Audit trail viewer
│   └── captain-profile/      # Captain dashboard
│
├── core/                     # Core services and guards
│   ├── services/             # HTTP services (API calls)
│   │   ├── auth.service.ts   # Login, register, logout, OTP
│   │   ├── booking.service.ts# CRUD bookings
│   │   ├── pricing.service.ts# Fare calculation
│   │   └── integration-health.service.ts
│   ├── guards/               # Route guards
│   │   ├── auth.guard.ts     # Must be logged in
│   │   ├── admin.guard.ts    # Must be admin
│   │   ├── captain.guard.ts  # Must be captain
│   │   └── customer.guard.ts # Must be customer
│   └── models/               # TypeScript interfaces
│
├── components/               # Reusable dumb components
│   ├── cart/
│   ├── home/
│   ├── order/
│   └── tracking/
│
└── shared/                   # Shared utilities
    ├── components/           # Shared UI (chatbot, dialogs)
    └── pipes/                # Custom Angular pipes
```

### 11.3 Backend Architecture

```
src/
└── index.js                  # Single file containing:
    ├── Configuration         # Port, DB path, API keys
    ├── Database Layer        # SQLite init, queries, helpers
    ├── Auth Middleware       # Session validation
    ├── Utility Functions     # OTP generation, distance calc
    ├── Auth Routes           # /api/auth/*
    ├── Booking Routes        # /api/bookings/*
    ├── Pricing Routes        # /api/pricing/*
    ├── Integration Routes    # /api/integrations/*
    └── Server Startup        # DB init + listen
```

### 11.4 Data Flow

```
User Action → Angular Component → Service (HTTP call) → Express Route → SQLite → Response → UI Update
```

Example: Login flow:
```
1. User enters username/password
2. login.component.ts calls authService.login()
3. authService sends POST /api/auth/login
4. Backend validates credentials against SQLite
5. Backend creates session token, returns user data
6. Frontend stores session token
7. Frontend redirects to home page
```

---

## 12. Configuration Reference

### 12.1 Frontend Configuration

**File: `angular.json`**
- Project name: `lunchbox-app`
- Source root: `src/`
- Output path: `dist/lunchbox-app`
- Default port: 4200 (use `--port 4300` to override)

**File: `tsconfig.json`**
- TypeScript version: 5.9.x
- Strict mode: enabled
- Target: ES2022

### 12.2 Backend Configuration (Environment Variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3003` | Server port |
| `AUTH_DB_FILE` | `/data/auth.sqlite` | SQLite database file path |
| `OTP_DEBUG_MODE` | `0` | Set to `1` to print OTP in console |
| `GMAIL_USER` | _(empty)_ | Gmail address for sending OTP |
| `GMAIL_APP_PASSWORD` | _(empty)_ | Gmail app password |
| `SENDGRID_API_KEY` | _(empty)_ | SendGrid API key for email |
| `SENDGRID_FROM_EMAIL` | _(empty)_ | SendGrid sender email |
| `TWILIO_ACCOUNT_SID` | _(empty)_ | Twilio SID for SMS |
| `TWILIO_AUTH_TOKEN` | _(empty)_ | Twilio auth token |
| `TWILIO_FROM_NUMBER` | _(empty)_ | Twilio sender number |
| `GOOGLE_MAPS_API_KEY` | _(empty)_ | Google Maps for distance/traffic |
| `OPENWEATHER_API_KEY` | _(empty)_ | OpenWeather for surge pricing |

> **Note:** All external service keys are OPTIONAL. The app works without them using fallback/mock data.

### 12.3 API Port Mapping

| Frontend Service | API Base URL | Backend Handler |
|-----------------|-------------|-----------------|
| `auth.service.ts` | `http://localhost:3003/api/auth` | Auth routes in index.js |
| `booking.service.ts` | `http://localhost:3003/api/bookings` | Booking routes in index.js |
| `pricing.service.ts` | `http://localhost:3003/api/pricing` | Pricing routes in index.js |
| `integration-health.service.ts` | `http://localhost:3003/api/integrations` | Integration routes in index.js |

---

## 13. Common Issues & Solutions

### Issue: `ng: command not found`

**Cause:** Angular CLI not installed globally.

**Fix:**
```bash
npm install -g @angular/cli
```

If still fails on Windows, close and reopen terminal.

---

### Issue: `ERR_CONNECTION_REFUSED` on localhost:3003

**Cause:** Backend server is not running.

**Fix:** Start the backend first:
```bash
cd Backend/auth-service
AUTH_DB_FILE=./data/auth.sqlite OTP_DEBUG_MODE=1 node src/index.js
```

---

### Issue: `npm install` fails with permission errors

**Fix (Windows):** Run terminal as Administrator.

**Fix (Mac/Linux):**
```bash
sudo npm install -g @angular/cli
# or fix npm permissions:
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

---

### Issue: Port 4300 already in use

**Fix:** Use a different port or kill the process:
```bash
# Use different port
ng serve --port 4400

# Or kill existing process (Windows)
netstat -ano | findstr :4300
taskkill /PID <PID_NUMBER> /F

# Or kill existing process (Mac/Linux)
lsof -i :4300
kill -9 <PID>
```

---

### Issue: Port 3003 already in use

**Fix:**
```bash
# Windows
netstat -ano | findstr :3003
taskkill /PID <PID_NUMBER> /F

# Mac/Linux
lsof -i :3003
kill -9 <PID>
```

---

### Issue: `Module not found` errors in frontend

**Fix:** Reinstall node_modules:
```bash
cd Frontend/lunchbox-app
rm -rf node_modules package-lock.json
npm install
```

---

### Issue: Login returns "Invalid username or password"

**Causes:**
1. Wrong credentials (use `user`/`user123` or `admin`/`admin123`)
2. Database was corrupted

**Fix:**
```bash
# Reset database
rm Backend/auth-service/data/auth.sqlite
# Restart backend - it re-seeds automatically
```

---

### Issue: CORS errors in browser console

**Cause:** Backend not allowing frontend origin.

**Fix:** The backend uses `app.use(cors())` which allows all origins. If you changed it, make sure your frontend URL is included:
```javascript
app.use(cors({
  origin: ['http://localhost:4200', 'http://localhost:4300']
}));
```

---

### Issue: Angular build warnings about CommonJS

**Cause:** Some npm packages use CommonJS format.

**Fix:** These are warnings, not errors. The app still works. To suppress:
Add to `angular.json` under `architect > build > options`:
```json
"allowedCommonJsDependencies": ["uuid"]
```

---

### Issue: `npm WARN deprecated` messages during install

**Cause:** Some dependencies have newer versions available.

**Fix:** These are warnings only. The app works fine. To fix later:
```bash
npm audit fix
```

---

## 14. VS Code Setup (Recommended)

### 14.1 Open Project

```bash
# Open entire project in VS Code
code C:\Ekart
```

Or: File > Open Folder > Select `C:\Ekart`

### 14.2 Recommended Extensions

Install these from VS Code Extensions panel (`Ctrl+Shift+X`):

| Extension | ID | Purpose |
|-----------|-----|---------|
| Angular Language Service | `angular.ng-template` | Angular IntelliSense |
| ESLint | `dbaeumer.vscode-eslint` | Code linting |
| Prettier | `esbenp.prettier-vscode` | Code formatting |
| Thunder Client | `rangav.vscode-thunder-client` | API testing (like Postman) |
| GitLens | `eamodio.gitlens` | Git integration |
| Material Icon Theme | `pkief.material-icon-theme` | Better file icons |

### 14.3 Workspace Settings

Create `.vscode/settings.json` in project root:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.tabSize": 2,
  "files.autoSave": "onFocusChange",
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

### 14.4 Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Backend (Node.js)",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/Backend/auth-service/src/index.js",
      "env": {
        "AUTH_DB_FILE": "./data/auth.sqlite",
        "OTP_DEBUG_MODE": "1"
      },
      "cwd": "${workspaceFolder}/Backend/auth-service"
    },
    {
      "name": "Frontend (Chrome)",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:4300",
      "webRoot": "${workspaceFolder}/Frontend/lunchbox-app/src"
    }
  ]
}
```

Press `F5` to start debugging.

---

## 15. Git Setup & Version Control

### 15.1 Initialize Git Repository

```bash
cd C:\Ekart    # or your project root

git init
git add .
git commit -m "Initial commit - LunchBox Delivery Platform"
```

### 15.2 Create .gitignore

**File: `.gitignore`** (in project root)

```
# Dependencies
node_modules/

# Build output
dist/
.angular/

# Environment files
.env
.env.local
.env.production

# Database
*.sqlite
data/

# IDE
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
```

### 15.3 Push to GitHub

1. Create a new repository on https://github.com/new
2. Push your code:

```bash
git remote add origin https://github.com/YOUR_USERNAME/lunchbox-delivery.git
git branch -M main
git push -u origin main
```

### 15.4 Branching Strategy (for teams)

```bash
# Create feature branch
git checkout -b feature/add-payment-gateway

# Make changes...
git add .
git commit -m "Add Razorpay payment integration"

# Push feature branch
git push -u origin feature/add-payment-gateway

# Create Pull Request on GitHub
# After review, merge to main
```

---

## Summary - Complete Setup in 5 Minutes

```bash
# Step 1: Extract zip to C:\Ekart (or any folder)

# Step 2: Terminal 1 - Start Backend
cd C:\Ekart\Backend\auth-service
npm install
set AUTH_DB_FILE=./data/auth.sqlite && set OTP_DEBUG_MODE=1 && node src/index.js

# Step 3: Terminal 2 - Start Frontend
cd C:\Ekart\Frontend\lunchbox-app
npm install
ng serve --port 4300

# Step 4: Open browser
# http://localhost:4300
# Login: user / user123

# Done!
```

---

## Related Documentation

| File | Description |
|------|-------------|
| `krishnaproject.md` | Project overview, features, API reference |
| `mongodb-migration-guide.md` | Migrate from SQLite to MongoDB Atlas |
| `free-hosting-guide.md` | Deploy for free (Vercel + Render + Atlas) |
| `complete-project-setup.md` | This file - full setup from scratch |

---

## Author

**Krishna Kumar Bandoju**

---

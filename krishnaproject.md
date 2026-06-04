# Krishna Project - LunchBox Delivery Platform

A full-stack delivery booking application with Angular 20 frontend, Node.js microservices backend, and an alternative C# .NET 10 backend.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Angular | 20.x |
| Frontend Language | TypeScript | 5.9.x |
| Backend (Primary) | Node.js + Express | 24.x / 4.x |
| Backend (Alternative) | C# .NET | 10.0 |
| Database (Node.js) | MongoDB (Mongoose) | MongoDB Atlas / local |
| Database (.NET) | SQLite (EF Core) | File-based |
| Auth | bcryptjs + session tokens | - |
| OTP | SendGrid / Gmail / Twilio (optional) | - |
| Queue (Order Service) | BullMQ + Redis (optional) | - |
| Package Manager | npm | 11.x |
| Container | Docker Compose | - |

---

## Project Structure

```
Ekart/
├── krishnaproject.md                    # This file
├── complete-project-setup.md            # Full setup guide
├── free-hosting-guide.md                # Free deployment guide
├── mongodb-migration-guide.md           # SQLite to MongoDB migration
│
├── Frontend/
│   └── lunchbox-app/                    # Angular 20 SPA
│       ├── src/
│       │   └── app/
│       │       ├── app.ts               # Root component
│       │       ├── app.routes.ts        # Route definitions
│       │       ├── app.config.ts        # App configuration
│       │       ├── features/            # Page components
│       │       │   ├── login/           # Login page
│       │       │   ├── register/        # Registration page
│       │       │   ├── home/            # Home dashboard
│       │       │   ├── booking/         # Create booking
│       │       │   ├── tracking/        # Live tracking
│       │       │   ├── admin/           # Admin panel
│       │       │   ├── audit/           # Audit logs
│       │       │   └── captain-profile/ # Captain dashboard
│       │       ├── core/
│       │       │   └── services/        # API services
│       │       │       ├── auth.service.ts
│       │       │       ├── booking.service.ts
│       │       │       ├── pricing.service.ts
│       │       │       └── integration-health.service.ts
│       │       ├── models/              # TypeScript interfaces
│       │       ├── components/          # Shared UI components
│       │       └── shared/              # Shared utilities
│       ├── package.json
│       └── angular.json
│
└── Backend/
    ├── microservices/                   # Node.js Microservices (PRIMARY)
    │   ├── docker-compose.yml           # Run all services together
    │   ├── package.json                 # Root workspace package
    │   ├── README.md
    │   └── services/
    │       ├── api-gateway/             # Reverse proxy (Port 3000)
    │       │   ├── src/index.js
    │       │   └── package.json
    │       ├── auth-service/            # Auth + Bookings + Pricing (Port 3003)
    │       │   ├── src/index.js
    │       │   ├── src/models.js        # Mongoose schemas (7 collections)
    │       │   ├── src/seed.js          # Seed default users
    │       │   ├── .env                 # MongoDB URI + config
    │       │   └── package.json
    │       ├── menu-service/            # Menu/catalog data (Port 3001)
    │       │   ├── src/index.js
    │       │   └── package.json
    │       ├── order-service/           # Order management (Port 3002)
    │       │   ├── src/index.js
    │       │   └── package.json
    │       └── worker-service/          # Background job processor
    │           ├── src/index.js
    │           └── package.json
    │
    └── dotnet/                          # C# .NET 10 Backend (ALTERNATIVE)
        ├── LunchBox.slnx                # Solution file
        ├── AuthService/                 # Auth API (Port 5273)
        │   ├── Program.cs
        │   ├── AuthService.csproj
        │   ├── Data/
        │   │   ├── AuthDbContext.cs
        │   │   └── AuthSeeder.cs
        │   ├── Models/
        │   │   ├── LoginRequest.cs
        │   │   ├── LoginResponse.cs
        │   │   ├── UserAccount.cs
        │   │   └── ...
        │   └── Properties/launchSettings.json
        └── ParcelService/               # Parcel/Booking API (Port 5156)
            ├── Program.cs
            ├── ParcelService.csproj
            ├── Data/
            │   ├── ParcelDbContext.cs
            │   └── ParcelSeeder.cs
            ├── Models/
            │   ├── ParcelBooking.cs
            │   ├── CreateBookingRequest.cs
            │   ├── TrackingEvent.cs
            │   └── ...
            └── Properties/launchSettings.json
```

---

## Service Ports

| Service | Port | Description |
|---------|------|-------------|
| **API Gateway** | 3000 | Reverse proxy - routes to all services |
| **Menu Service** | 3001 | Menu/catalog data |
| **Order Service** | 3002 | Order management + BullMQ |
| **Auth Service** | 3003 | Authentication, bookings, pricing |
| **.NET AuthService** | 5273 | Alternative C# auth backend |
| **.NET ParcelService** | 5156 | Alternative C# parcel backend |
| **Angular Frontend** | 4200/4300 | UI application |

---

## Prerequisites

Install these before running the project:

| Software | Version | Download |
|----------|---------|----------|
| Node.js | 20.x or higher | https://nodejs.org |
| npm | 10.x or higher | Comes with Node.js |
| Angular CLI | 20.x | `npm install -g @angular/cli` |
| Git | Any | https://git-scm.com |
| .NET SDK (optional) | 10.0 | https://dotnet.microsoft.com |
| Docker (optional) | Latest | https://docker.com |

### Verify Installation

```bash
node -v      # Should show v20.x or higher
npm -v       # Should show 10.x or higher
ng version   # Should show Angular CLI 20.x
dotnet --version  # (Optional) Should show 10.x
```

---

## Quick Start (Simplest Setup)

The **auth-service alone** handles ALL the frontend's API calls (login, bookings, pricing, etc.). You don't need all microservices for basic usage.

```bash
# Terminal 1 - Backend (auth-service only)
cd Backend/microservices/services/auth-service
npm install
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/lunchbox_db OTP_DEBUG_MODE=1 node src/index.js

# Seed default users (run once)
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/lunchbox_db node src/seed.js

# Terminal 2 - Frontend
cd Frontend/lunchbox-app
npm install
ng serve --port 4300

# Open browser: http://localhost:4300
# Login: user / user123
```

---

## Full Microservices Setup (Docker Compose)

To run ALL Node.js services together:

```bash
cd Backend/microservices
docker-compose up --build
```

Or manually start each service:

```bash
# Terminal 1 - API Gateway (Port 3000)
cd Backend/microservices/services/api-gateway
npm install && node src/index.js

# Terminal 2 - Auth Service (Port 3003)
cd Backend/microservices/services/auth-service
npm install && AUTH_DB_FILE=./data/auth.sqlite OTP_DEBUG_MODE=1 node src/index.js

# Terminal 3 - Menu Service (Port 3001)
cd Backend/microservices/services/menu-service
npm install && node src/index.js

# Terminal 4 - Order Service (Port 3002)
cd Backend/microservices/services/order-service
npm install && node src/index.js

# Terminal 5 - Worker Service
cd Backend/microservices/services/worker-service
npm install && node src/index.js
```

---

## Alternative: .NET Backend Setup

If you prefer C# .NET:

```bash
cd Backend/dotnet

# Restore and run AuthService
dotnet run --project AuthService
# Runs on http://localhost:5273

# In another terminal - run ParcelService
dotnet run --project ParcelService
# Runs on http://localhost:5156
```

> **Note:** The Angular frontend currently points to Node.js ports (3003). To use the .NET backend, update the service URLs in `Frontend/lunchbox-app/src/app/core/services/`.

---

## Step-by-Step Setup (From Zip File)

### Step 1: Extract the Zip

```bash
# Extract the zip file to any folder
# Example: C:\Projects\LunchBox\
```

### Step 2: Install Backend Dependencies

```bash
cd Backend/microservices/services/auth-service
npm install
```

### Step 3: Start the Backend Server

**Windows (Command Prompt):**
```cmd
cd Backend\microservices\services\auth-service
set MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/lunchbox_db
set OTP_DEBUG_MODE=1
node src/index.js
```

**Windows (PowerShell):**
```powershell
cd Backend/microservices/services/auth-service
$env:MONGODB_URI="mongodb+srv://<user>:<pass>@<cluster>/lunchbox_db"
$env:OTP_DEBUG_MODE="1"
node src/index.js
```

**Mac / Linux (Terminal):**
```bash
cd Backend/microservices/services/auth-service
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/lunchbox_db OTP_DEBUG_MODE=1 node src/index.js
```

You should see:
```
auth-service listening on :3003
```

### Step 4: Verify Backend is Running

Open a new terminal and run:
```bash
curl http://localhost:3003/health
```

Expected response:
```json
{"service":"auth-service","status":"ok"}
```

### Step 5: Install Frontend Dependencies

Open a **new terminal** (keep backend running):
```bash
cd Frontend/lunchbox-app
npm install
```

### Step 6: Start the Frontend

```bash
ng serve --port 4300
```

Or simply:
```bash
npm start
```
> Note: Default `ng serve` runs on port 4200. Use `--port 4300` if you want port 4300.

### Step 7: Open the Application

Open your browser and go to:
```
http://localhost:4200
```
or
```
http://localhost:4300
```
(depending on which port you used)

---

## Default Login Credentials

| Role | Username | Password | Access |
|------|----------|----------|--------|
| Customer | `user` | `user123` | Book deliveries, track orders |
| Admin | `admin` | `admin123` | Admin panel, all bookings, audit logs |

You can also register new users from the registration page.

---

## API Endpoints

### Auth Service (Port 3003) — Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with username/password |
| POST | `/api/auth/verify-otp` | Verify OTP after registration |
| POST | `/api/auth/voice-challenge` | Get voice verification phrase |
| POST | `/api/auth/voice-verify` | Verify voice input |
| GET | `/api/auth/me` | Get current user profile |
| GET | `/api/auth/captains` | List available captains |
| POST | `/api/auth/profile-image` | Update profile image |
| POST | `/api/auth/logout` | Logout |

### Auth Service (Port 3003) — Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings` | List all bookings |
| GET | `/api/bookings/:id` | Get booking details |
| POST | `/api/bookings` | Create new booking |
| POST | `/api/bookings/:id/verify-otp` | Verify booking OTP |
| POST | `/api/bookings/:id/approve` | Captain approves booking |
| POST | `/api/bookings/:id/cancel` | Cancel booking |
| POST | `/api/bookings/:id/sos` | Trigger SOS alert |
| POST | `/api/bookings/:id/feedback` | Submit ride feedback |
| POST | `/api/bookings/:id/pay` | Process payment |
| POST | `/api/bookings/:id/close-tracking` | Close tracking |

### Auth Service (Port 3003) — Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/pricing/live-fare` | Calculate delivery fare |
| GET | `/api/integrations/health` | Check integration status |
| POST | `/api/auth/user-action` | Record user action |
| GET | `/api/auth/actions` | Get audit action logs |
| POST | `/api/auth/captain-feedback` | Submit captain feedback |
| GET | `/api/auth/captain-feedback/stats` | Get captain stats |

### Menu Service (Port 3001)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/menu` | Get menu items |
| GET | `/api/menu/:id` | Get menu item details |

### Order Service (Port 3002)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Create order |
| GET | `/api/orders` | List orders |
| GET | `/api/orders/:id` | Get order details |
| PATCH | `/api/orders/:id/status` | Update order status |

### API Gateway (Port 3000)
Routes all requests to the appropriate service:
- `/api/auth/*` → Auth Service (3003)
- `/api/menu/*` → Menu Service (3001)
- `/api/orders/*` → Order Service (3002)
- `/api/bookings/*` → Auth Service (3003)
- `/api/pricing/*` → Auth Service (3003)

---

## Major Features

### 1. Multi-Role Authentication
- **Customer** - Book deliveries, track orders, rate captains
- **Captain** - Accept/reject rides, OTP verification, manage profile
- **Admin** - View all bookings, audit logs, manage users

### 2. OTP Verification
- Email OTP via Gmail SMTP or SendGrid
- SMS OTP via Twilio
- Debug mode (`OTP_DEBUG_MODE=1`) prints OTP to console for local testing

### 3. Voice Step-Up Authentication
- Random security phrase generation
- Voice verification for sensitive admin actions

### 4. Booking Lifecycle
```
Created → Assigned (OTP verified) → In Progress → Completed → Payment → Feedback → Tracking Closed
```
- Real-time OTP verification between customer and captain
- SOS emergency alert system
- Cancel at any stage before completion

### 5. Live Fare Calculation
- Distance-based pricing using Haversine formula
- Google Maps Distance Matrix API integration (optional)
- OpenWeather API for weather-based surge pricing (optional)
- Vehicle type multipliers (bike, auto, car, van, truck)

### 6. Captain Management
- Captain profile with vehicle type
- Customer can choose preferred captain
- Broadcast booking to all captains
- Captain feedback and rating system

### 7. Audit Trail
- All user actions logged with timestamps
- Admin can view all actions across users
- Action metadata stored as JSON

### 8. Integration Health Dashboard
- Real-time status of all external services
- Google Maps, OpenWeather, OTP providers
- Green/Red status indicators

### 9. Microservices Architecture
- **API Gateway** - Single entry point, reverse proxy
- **Auth Service** - Authentication, authorization, bookings
- **Menu Service** - Food/item catalog
- **Order Service** - Order lifecycle with BullMQ queue
- **Worker Service** - Background job processing

---

## Environment Variables (Optional)

These are optional. The app works without them using fallback/debug mode.

| Variable | Purpose | Required |
|----------|---------|----------|
| `MONGODB_URI` | MongoDB connection string | No (default: `mongodb://localhost:27017/lunchbox_db`) |
| `PORT` | Backend port | No (default: `3003`) |
| `OTP_DEBUG_MODE` | Set to `1` to print OTP in console | No |
| `GMAIL_USER` | Gmail address for OTP emails | No |
| `GMAIL_APP_PASSWORD` | Gmail app password | No |
| `SENDGRID_API_KEY` | SendGrid API key | No |
| `SENDGRID_FROM_EMAIL` | SendGrid sender email | No |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | No |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | No |
| `TWILIO_FROM_NUMBER` | Twilio sender number | No |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key | No |
| `OPENWEATHER_API_KEY` | OpenWeather API key | No |
| `REDIS_URL` | Redis connection for Order Service | No (default: `redis://localhost:6379`) |

---

## Troubleshooting

### Error: `ERR_CONNECTION_REFUSED` on localhost:3003
**Cause:** Backend is not running.
**Fix:** Start the auth-service first (Step 3 above).

### Error: `npm install` fails
**Fix:** Delete `node_modules` folder and `package-lock.json`, then run `npm install` again.
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: `ng: command not found`
**Fix:** Install Angular CLI globally:
```bash
npm install -g @angular/cli
```

### Error: Port 3003 already in use
**Fix (Windows):**
```cmd
netstat -ano | findstr :3003
taskkill /PID <PID> /F
```

**Fix (Mac/Linux):**
```bash
lsof -i :3003
kill -9 <PID>
```

### Database issues / connection errors
**Fix:** Check your MongoDB connection string in the `.env` file or environment variable:
```bash
# Verify MongoDB Atlas is reachable
node -e "const mongoose = require('mongoose'); mongoose.connect('your-connection-string').then(() => console.log('OK')).catch(e => console.error(e))"
```

### Re-seed default users
```bash
cd Backend/microservices/services/auth-service
MONGODB_URI=your-connection-string node src/seed.js
```

### .NET Backend: `dotnet run` fails
**Fix:** Make sure .NET 10 SDK is installed:
```bash
dotnet --version   # Should show 10.x
dotnet restore     # Restore NuGet packages first
dotnet run --project AuthService
```

---

## Documentation Files

| File | Description |
|------|-------------|
| `krishnaproject.md` | This file - Project overview and setup |
| `complete-project-setup.md` | Detailed setup from scratch (all OS) |
| `free-hosting-guide.md` | Deploy for free (Vercel + Render + MongoDB Atlas) |
| `mongodb-migration-guide.md` | Migrate from SQLite to MongoDB Atlas |

---

## Author

**Krishna Kumar Bandoju**

---

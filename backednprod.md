# Backend Services Hosting Guide

Complete guide to host all Ekart/LunchBox backend microservices.

---

## Architecture Overview

```
Internet
    │
    ▼
┌─────────────────┐
│   API Gateway   │  Port 3000  ← Single entry point
│  (api-gateway)  │
└────────┬────────┘
         │ proxies to:
    ┌────┼────────────────────┐
    │         │               │
    ▼         ▼               ▼
┌─────────┐ ┌─────────┐ ┌───────────┐
│  Menu   │ │  Order  │ │   Auth    │
│ Service │ │ Service │ │  Service  │
│  :3001  │ │  :3002  │ │   :3003   │
└─────────┘ └────┬────┘ └───────────┘
                 │
         ┌───────┴────────┐
         │                │
         ▼                ▼
    ┌─────────┐    ┌──────────────┐
    │  Redis  │    │ Worker Svc   │
    │  :6379  │    │ (no port)    │
    └─────────┘    └──────────────┘
         │
         ▼
   MongoDB Atlas
```

---

## Services Summary

| Service | Port | Tech | Dependencies |
|---------|------|------|--------------|
| api-gateway | 3000 | Express + http-proxy-middleware | Menu, Order, Auth services |
| menu-service | 3001 | Express | None |
| order-service | 3002 | Express + BullMQ + ioredis | Redis |
| auth-service | 3003 | Express + Mongoose + SendGrid + Twilio | MongoDB Atlas |
| worker-service | — | BullMQ + ioredis | Redis, Order Service |
| Redis | 6379 | Redis 7 Alpine | None |

---

## Option 1: Render (Free / Recommended for MVP)

### Step 1 — Redis (Render Redis)
1. Go to [render.com](https://render.com) → **New → Redis**
2. Name: `lunchbox-redis`
3. Plan: Free
4. Copy the **Internal Redis URL** → you'll use it as `REDIS_HOST` / `REDIS_PORT`

### Step 2 — Menu Service
1. **New → Web Service** → connect your GitHub repo
2. Root directory: `Backend/microservices`
3. Dockerfile path: `services/menu-service/Dockerfile`
4. Name: `lunchbox-menu-service`
5. Port: `3001`
6. Environment variables: _(none required)_

### Step 3 — Order Service
1. **New → Web Service**
2. Root directory: `Backend/microservices`
3. Dockerfile: `services/order-service/Dockerfile`
4. Name: `lunchbox-order-service`
5. Port: `3002`
6. Environment variables:
   ```
   REDIS_HOST=<Render Redis internal host>
   REDIS_PORT=6379
   ORDER_DB_FILE=/data/orders.json
   ```

### Step 4 — Auth Service
1. **New → Web Service**
2. Root directory: `Backend/microservices`
3. Dockerfile: `services/auth-service/Dockerfile`
4. Name: `lunchbox-auth-service`
5. Port: `3003`
6. Environment variables:
   ```
   MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/lunchbox_db?retryWrites=true&w=majority
   SENDGRID_API_KEY=<your-key>
   SENDGRID_FROM_EMAIL=noreply@ekartapp.com
   TWILIO_ACCOUNT_SID=<your-sid>
   TWILIO_AUTH_TOKEN=<your-token>
   TWILIO_FROM_NUMBER=+1xxxxxxxxxx
   OTP_DEBUG_MODE=0
   NODE_ENV=production
   ```

### Step 5 — Worker Service
1. **New → Background Worker** (not a Web Service — no public port)
2. Root directory: `Backend/microservices`
3. Dockerfile: `services/worker-service/Dockerfile`
4. Name: `lunchbox-worker-service`
5. Environment variables:
   ```
   REDIS_HOST=<Render Redis internal host>
   REDIS_PORT=6379
   ORDER_SERVICE_INTERNAL_URL=https://<order-service-render-url>
   ```

### Step 6 — API Gateway (deploy last)
1. **New → Web Service**
2. Root directory: `Backend/microservices`
3. Dockerfile: `services/api-gateway/Dockerfile`
4. Name: `lunchbox-api-gateway`
5. Port: `3000`
6. Environment variables:
   ```
   PORT=3000
   MENU_SERVICE_URL=https://<menu-service-render-url>
   ORDER_SERVICE_URL=https://<order-service-render-url>
   AUTH_SERVICE_URL=https://<auth-service-render-url>
   ```

### Health Check URLs (after deploy)
```
https://<api-gateway-url>/health
https://<menu-service-url>/health
https://<order-service-url>/health
https://<auth-service-url>/health
```

---

## Option 2: Railway

### Quick Deploy
```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

# From Backend/microservices directory
railway init
railway up
```

### Manual Setup
1. Go to [railway.app](https://railway.app) → **New Project**
2. Add **Redis** plugin first
3. For each service, **Add Service → GitHub Repo**
4. Set the **Root Directory** and **Dockerfile Path** per service (same as Render above)
5. Railway auto-injects `REDIS_URL` — use `${{Redis.REDIS_URL}}` in env vars

---

## Option 3: Docker Compose (Self-hosted / VPS)

### Prerequisites
- Ubuntu VPS (DigitalOcean, Linode, AWS EC2, etc.)
- Docker + Docker Compose installed

### Deploy Steps

```bash
# 1. Clone your repo on the server
git clone https://github.com/<your-org>/ekart.git
cd ekart/Backend/microservices

# 2. Create environment file
cp .env.example .env
nano .env   # fill in MONGODB_URI, SENDGRID_API_KEY, etc.

# 3. Build and start all services
docker-compose -f docker-compose.prod.yml up -d --build

# 4. Check running containers
docker ps

# 5. View logs
docker-compose logs -f api-gateway
docker-compose logs -f auth-service
```

### docker-compose.prod.yml Key Config
```yaml
services:
  api-gateway:
    ports:
      - "3000:3000"   # only expose the gateway publicly
    environment:
      MENU_SERVICE_URL: http://menu-service:3001
      ORDER_SERVICE_URL: http://order-service:3002
      AUTH_SERVICE_URL: http://auth-service:3003
```

> **Note:** In production Docker Compose, only `api-gateway` needs a public port. All other services communicate via Docker internal network.

---

## Option 4: Azure Container Apps (Enterprise)

```bash
# Login
az login
az acr create --name ekartregistry --resource-group ekart-rg --sku Basic

# Build and push images
az acr build --registry ekartregistry --image auth-service:latest \
  --file services/auth-service/Dockerfile .

az acr build --registry ekartregistry --image menu-service:latest \
  --file services/menu-service/Dockerfile .

az acr build --registry ekartregistry --image order-service:latest \
  --file services/order-service/Dockerfile .

az acr build --registry ekartregistry --image api-gateway:latest \
  --file services/api-gateway/Dockerfile .

# Create Container Apps Environment
az containerapp env create \
  --name ekart-env \
  --resource-group ekart-rg \
  --location eastus

# Deploy API Gateway
az containerapp create \
  --name api-gateway \
  --resource-group ekart-rg \
  --environment ekart-env \
  --image ekartregistry.azurecr.io/api-gateway:latest \
  --target-port 3000 \
  --ingress external \
  --env-vars \
    MENU_SERVICE_URL=http://menu-service \
    ORDER_SERVICE_URL=http://order-service \
    AUTH_SERVICE_URL=http://auth-service
```

---

## Environment Variables Reference

### Auth Service (`.env.production`)
| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `PORT` | ✅ | `3003` |
| `NODE_ENV` | ✅ | `production` |
| `SENDGRID_API_KEY` | ✅ | Email OTP delivery |
| `SENDGRID_FROM_EMAIL` | ✅ | Sender email |
| `TWILIO_ACCOUNT_SID` | Optional | SMS OTP |
| `TWILIO_AUTH_TOKEN` | Optional | SMS OTP |
| `TWILIO_FROM_NUMBER` | Optional | SMS OTP sender |
| `OTP_DEBUG_MODE` | ✅ | `0` in production, `1` for testing |
| `ENABLE_INMEMORY_FALLBACK` | Optional | `0` in production |
| `CORS_ALLOWED_ORIGINS` | ✅ | Comma-separated allowed origins |
| `GOOGLE_MAPS_API_KEY` | Optional | Maps integration |

### Order Service
| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_HOST` | ✅ | Redis host |
| `REDIS_PORT` | ✅ | `6379` |
| `ORDER_DB_FILE` | ✅ | `/data/orders.json` |

### Worker Service
| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_HOST` | ✅ | Redis host |
| `REDIS_PORT` | ✅ | `6379` |
| `ORDER_SERVICE_INTERNAL_URL` | ✅ | Internal URL to order-service |

### API Gateway
| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | ✅ | `3000` |
| `MENU_SERVICE_URL` | ✅ | URL to menu-service |
| `ORDER_SERVICE_URL` | ✅ | URL to order-service |
| `AUTH_SERVICE_URL` | ✅ | URL to auth-service |

---

## API Routes (via Gateway)

| Route | Proxies To | Description |
|-------|-----------|-------------|
| `GET /health` | Gateway itself | Gateway health check |
| `GET /api/menu/*` | menu-service:3001 | Menu items |
| `GET /api/orders/*` | order-service:3002 | Orders CRUD |
| `POST /api/jobs/*` | order-service:3002 | Background jobs |
| `POST /api/auth/*` | auth-service:3003 | Authentication |

---

## Deployment Checklist

- [ ] MongoDB Atlas cluster created and IP whitelist set to `0.0.0.0/0`
- [ ] SendGrid API key created (for email OTP)
- [ ] Redis instance provisioned
- [ ] All environment variables set before deploying auth-service
- [ ] menu-service and order-service deployed before api-gateway
- [ ] worker-service points to correct `ORDER_SERVICE_INTERNAL_URL`
- [ ] API Gateway `MENU_SERVICE_URL`, `ORDER_SERVICE_URL`, `AUTH_SERVICE_URL` set
- [ ] `OTP_DEBUG_MODE=0` in production
- [ ] `ENABLE_INMEMORY_FALLBACK=0` in production
- [ ] CORS origins updated to your frontend domain
- [ ] Health check endpoints responding `200 OK`

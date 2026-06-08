# RouteX Deployment Configuration Guide

## Quick Start

### 1. Environment Setup

#### For Local Development:
```bash
# Frontend environment is already configured in src/environments/environment.ts
# Auth service uses .env.development (already provided)
npm install
ng serve
```

#### For Production Deployment:

**Step 1: Set Production Environment Variables**

```bash
# Set these in your deployment platform (Docker, Kubernetes, etc.)

# MongoDB Atlas Credentials
export MONGO_USER="your_atlas_username"
export MONGO_PASSWORD="your_atlas_password"
export MONGO_CLUSTER="your-cluster.mongodb.net"
export MONGO_DB_NAME="lunchbox_db"

# SendGrid Email Service
export SENDGRID_API_KEY="SG.your_key_here"

# CORS Configuration
export CORS_ALLOWED_ORIGINS="https://ekart.com,https://www.ekart.com"

# Docker Registry
export DOCKER_REGISTRY="your_registry_name"
```

**Step 2: Build and Deploy**

```bash
# For Docker Compose (quick deployment)
cd Backend/microservices
docker-compose -f docker-compose.prod.yml up -d

# For Kubernetes (production-grade)
kubectl apply -f k8s/
```

### 2. Configuration Files Reference

#### Frontend
- **Development**: `src/environments/environment.ts`
- **Production**: `src/environments/environment.prod.ts`

#### Backend (.NET)
- **Development**: `appsettings.json`
- **Production**: `appsettings.Production.json`
- **Staging**: `appsettings.Staging.json`

#### Backend (Node.js Auth Service)
- **Development**: `services/auth-service/.env.development`
- **Staging**: `services/auth-service/.env.staging`
- **Production**: `services/auth-service/.env.production`

### 3. API Endpoints by Environment

| Service | Local | Staging | Production |
|---------|-------|---------|-----------|
| API Gateway | http://localhost:3000 | https://staging-api.ekart.com | https://api.ekart.com |
| Auth Service | http://localhost:3003 | https://staging-auth.ekart.com | https://auth-service.ekart.com |
| Menu Service | http://localhost:3001 | https://staging-menu.ekart.com | https://menu-service.ekart.com |
| Order Service | http://localhost:3002 | https://staging-order.ekart.com | https://order-service.ekart.com |
| Frontend | http://localhost:4200 | https://staging.ekart.com | https://ekart.com |

### 4. Database Connection

#### MongoDB Atlas (Production)
```
Connection String: mongodb+srv://user:password@cluster.mongodb.net/database?options
```

#### MongoDB Local (Development)
```
Connection String: mongodb://localhost:27017/lunchbox_db
```

#### Fallback (Development only)
Set `ENABLE_INMEMORY_FALLBACK=1` to use in-memory database when MongoDB is unavailable

### 5. Deployment Scripts

#### Build and Deploy (Linux/macOS)
```bash
cd Backend/microservices
chmod +x deploy.sh
./deploy.sh latest production
```

#### Build and Deploy (Windows PowerShell)
```bash
cd Backend\microservices
.\deploy.ps1 -ImageTag latest -Environment production
```

### 6. Health Checks

```bash
# API Gateway
curl https://api.ekart.com/health

# Auth Service
curl https://auth-service.ekart.com/health

# Database Connection
curl https://api.ekart.com/health/db
```

### 7. Troubleshooting

#### Issue: MongoDB Connection Failed
```
Solution:
1. Verify MONGO_USER and MONGO_PASSWORD are correct
2. Check MongoDB Atlas IP Whitelist includes your deployment IP
3. Ensure connection string format is correct
4. Check logs: kubectl logs deployment/auth-service
```

#### Issue: CORS Errors
```
Solution:
1. Verify CORS_ALLOWED_ORIGINS environment variable
2. Check frontend URL matches allowed origins
3. Restart services after changing CORS settings
```

#### Issue: Services Not Communicating
```
Solution:
1. Check Docker network: docker network ls
2. Verify service DNS names: docker exec container nslookup service-name
3. Check firewall/security groups
4. Review API Gateway routing configuration
```

### 8. Production Checklist

- [ ] MongoDB Atlas cluster created and configured
- [ ] All environment variables set correctly
- [ ] Docker images built and pushed to registry
- [ ] CORS allowed origins configured
- [ ] SSL certificates installed
- [ ] DNS records configured
- [ ] Database backups configured
- [ ] Monitoring and logging setup
- [ ] Health checks passing
- [ ] Load testing completed
- [ ] Security scanning completed
- [ ] Rollback plan documented

### 9. Key Security Settings

- **ENABLE_INMEMORY_FALLBACK**: Set to `0` in production
- **OTP_DEBUG_MODE**: Set to `0` in production
- **CORS**: Restricted to specific domains (not `*`)
- **REQUIRE_CUSTOMER_REGISTRATION_OTP**: Set to `1` in production
- **Connection Pooling**: Configured in `MongoDBConnectionManager.ts`

### 10. Useful Commands

```bash
# View service logs
kubectl logs -f deployment/auth-service

# Scale services
kubectl scale deployment/auth-service --replicas=3

# Check resource usage
kubectl top pods

# Port forward for local testing
kubectl port-forward svc/api-gateway 3000:3000

# Export database backup
mongodump --uri "$MONGODB_URI" --out ./backup

# Import database backup
mongorestore --uri "$MONGODB_URI" ./backup
```

---

**For detailed deployment instructions, see**: [PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md)

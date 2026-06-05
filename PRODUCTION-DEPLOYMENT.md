# Ekart Production Deployment Guide

## Overview
This guide walks through deploying the Ekart ride-sharing application to production with proper environment configuration, database setup, and monitoring.

## Prerequisites

- **Infrastructure**: Docker, Docker Compose, Kubernetes (or Docker Swarm)
- **Database**: MongoDB Atlas account (free or paid tier)
- **Services**: SendGrid account (for OTP emails)
- **DNS**: Domain configured and SSL certificates ready
- **Container Registry**: Docker Hub or private registry

## Step 1: MongoDB Atlas Setup

### 1.1 Create MongoDB Atlas Cluster
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a new organization and project
3. Create a cluster:
   - Select M10 or higher for production
   - Enable backup
   - Set IP whitelist to allow your deployment IPs
4. Create database user with strong password
5. Get connection string: `mongodb+srv://user:password@cluster.mongodb.net/database`

### 1.2 Create Databases
```bash
# Connect to MongoDB Atlas
mongosh "mongodb+srv://<user>:<password>@cluster.mongodb.net"

# Create databases
use lunchbox_db
db.createCollection("users")

use lunchbox_menu
db.createCollection("restaurants")

use lunchbox_orders
db.createCollection("orders")
```

## Step 2: Environment Configuration

### 2.1 Backend Environment Variables (.env.production)

Create `.env.production` files for each service:

**Auth Service** (`Backend/microservices/services/auth-service/.env.production`):
```bash
# MongoDB Atlas
MONGODB_URI=mongodb+srv://ekart_user:YourStrongPassword@ekart-cluster.mongodb.net/lunchbox_db?retryWrites=true&w=majority

# Server
NODE_ENV=production
PORT=3003
ENABLE_INMEMORY_FALLBACK=0

# OTP Configuration
OTP_DEBUG_MODE=0
REQUIRE_CUSTOMER_REGISTRATION_OTP=1
SENDGRID_API_KEY=SG.your_sendgrid_key_here
SENDGRID_FROM_EMAIL=noreply@ekartapp.com

# CORS
CORS_ALLOWED_ORIGINS=https://ekart.com,https://www.ekart.com,https://app.ekart.com
```

### 2.2 Frontend Environment Configuration

Update `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  authApiBase: 'https://auth-service.ekart.com',
  parcelApiBase: 'https://api.ekart.com/parcel',
  gatewayApiBase: 'https://api.ekart.com',
  voiceBookingEnabled: true,
  liveTrackingEnabled: true,
  chatSupportEnabled: true
};
```

### 2.3 .NET Configuration

Update `AuthService/appsettings.Production.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "mongodb+srv://USER:PASSWORD@CLUSTER/lunchbox_db?retryWrites=true&w=majority"
  },
  "Cors": {
    "AllowedOrigins": "https://ekart.com,https://www.ekart.com"
  }
}
```

## Step 3: Build and Push Docker Images

### 3.1 Build Images
```bash
# Linux/macOS
cd Backend/microservices
chmod +x deploy.sh
./deploy.sh latest production

# Windows PowerShell
cd Backend\microservices
.\deploy.ps1 -ImageTag latest -Environment production
```

### 3.2 Verify Images
```bash
docker images | grep ekartregistry

# Output should show:
# ekartregistry/api-gateway           latest
# ekartregistry/auth-service          latest
# ekartregistry/menu-service          latest
# ekartregistry/order-service         latest
```

## Step 4: Kubernetes Deployment

### 4.1 Create Namespace
```bash
kubectl create namespace ekart-prod
```

### 4.2 Create Secrets
```bash
# MongoDB credentials
kubectl create secret generic mongodb-secret \
  --from-literal=MONGO_USER=ekart_user \
  --from-literal=MONGO_PASSWORD=YourStrongPassword \
  --from-literal=MONGO_CLUSTER=ekart-cluster.mongodb.net \
  -n ekart-prod

# SendGrid API Key
kubectl create secret generic sendgrid-secret \
  --from-literal=SENDGRID_API_KEY=SG.your_key \
  -n ekart-prod
```

### 4.3 Deploy Services
```bash
# Apply ConfigMaps and Deployments
kubectl apply -f k8s/configmap.yaml -n ekart-prod
kubectl apply -f k8s/deployment.yaml -n ekart-prod
kubectl apply -f k8s/service.yaml -n ekart-prod

# Verify rollout
kubectl rollout status deployment/auth-service -n ekart-prod
kubectl rollout status deployment/api-gateway -n ekart-prod
```

### 4.4 Verify Deployment
```bash
# Check pods
kubectl get pods -n ekart-prod

# Check logs
kubectl logs -f deployment/auth-service -n ekart-prod

# Port forward for testing
kubectl port-forward svc/api-gateway 3000:3000 -n ekart-prod
```

## Step 5: Frontend Deployment

### 5.1 Build Angular App
```bash
cd Frontend/lunchbox-app
npm install
ng build --configuration production

# Output: dist/lunchbox-app/
```

### 5.2 Deploy to Static Hosting

**Azure Static Web Apps:**
```bash
# Login to Azure
az login

# Create static web app
az staticwebapp create \
  --name ekart-frontend \
  --resource-group ekart-prod \
  --source ./Frontend/lunchbox-app \
  --output-location dist/lunchbox-app
```

**AWS S3 + CloudFront:**
```bash
# Upload to S3
aws s3 sync dist/lunchbox-app s3://ekart-frontend-prod/

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id XXXX --paths "/*"
```

## Step 6: DNS and SSL

### 6.1 Configure DNS Records
```
A Record:
  Name: ekart.com
  Value: Your Load Balancer IP

CNAME Records:
  api.ekart.com -> ekart.com
  auth-service.ekart.com -> ekart.com
  app.ekart.com -> your-cdn-domain
```

### 6.2 SSL Certificates (Let's Encrypt with Cert Manager)
```bash
# Install Cert Manager
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace

# Create Certificate
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ekart-tls
  namespace: ekart-prod
spec:
  secretName: ekart-tls-secret
  issuerRef:
    name: letsencrypt-prod
  dnsNames:
    - ekart.com
    - "*.ekart.com"
EOF
```

## Step 7: Monitoring and Logging

### 7.1 Health Checks
```bash
# API Gateway Health
curl https://api.ekart.com/health

# Auth Service Health
curl https://auth-service.ekart.com/health

# Expected response:
# {"status": "ok", "timestamp": "2024-01-15T10:30:00Z"}
```

### 7.2 Logs Aggregation (ELK Stack)
```bash
# Deploy Elasticsearch
helm install elasticsearch elastic/elasticsearch -n ekart-prod

# Deploy Kibana for visualization
helm install kibana elastic/kibana -n ekart-prod

# Configure log forwarding
# Update docker-compose.prod.yml to send logs to Elasticsearch
```

### 7.3 Metrics (Prometheus + Grafana)
```bash
# Deploy Prometheus
helm install prometheus prometheus-community/prometheus -n ekart-prod

# Deploy Grafana
helm install grafana grafana/grafana -n ekart-prod
```

## Step 8: Database Backup and Recovery

### 8.1 Automated Backups (MongoDB Atlas)
- Backups are automatic on MongoDB Atlas (M10+)
- Configure backup frequency in Atlas Dashboard
- Snapshots stored for 7 days

### 8.2 Manual Backup
```bash
# Export database
mongodump --uri "mongodb+srv://user:password@cluster/lunchbox_db" \
  --out ./backup/lunchbox_db

# Import backup
mongorestore --uri "mongodb+srv://user:password@cluster" \
  ./backup/lunchbox_db
```

## Step 9: Security Hardening

### 9.1 Network Security
- ✓ Set MongoDB Atlas IP Whitelist
- ✓ Enable Network Peering (if using private clusters)
- ✓ Use private container registry (not Docker Hub)
- ✓ Enable Kubernetes Network Policies

### 9.2 Application Security
- ✓ CORS restricted to specific domains
- ✓ API rate limiting enabled
- ✓ Request validation on all endpoints
- ✓ SQL injection prevention (parameterized queries)

### 9.3 Secrets Management
```bash
# Use Kubernetes Secrets (best practice: use sealed-secrets)
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
helm install sealed-secrets -n kube-system sealed-secrets/sealed-secrets

# Seal secrets for git
kubeseal -f k8s/secret.yaml -w k8s/secret-sealed.yaml
```

## Step 10: Post-Deployment Verification

### 10.1 End-to-End Tests
```bash
# Test booking flow
curl -X POST https://api.ekart.com/bookings \
  -H "Content-Type: application/json" \
  -d '{"pickup":"address1","dropoff":"address2"}'

# Test authentication
curl -X POST https://auth-service.ekart.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### 10.2 Load Testing
```bash
# Using Apache Bench
ab -n 10000 -c 100 https://api.ekart.com/health

# Using k6
k6 run load-test.js
```

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check connection string
echo $MONGODB_URI

# Test connection
mongosh "$MONGODB_URI"

# View connection logs
kubectl logs deployment/auth-service -n ekart-prod | grep -i mongo
```

### Service Not Responding
```bash
# Check pod status
kubectl get pods -n ekart-prod

# Restart service
kubectl rollout restart deployment/auth-service -n ekart-prod

# Check service endpoints
kubectl get endpoints -n ekart-prod
```

### High Memory Usage
```bash
# Check resource usage
kubectl top pods -n ekart-prod

# Update resource limits in deployment.yaml
kubectl set resources deployment/auth-service \
  --limits=cpu=1,memory=512Mi \
  -n ekart-prod
```

## Maintenance

### 10.1 Regular Tasks
- [ ] Monitor MongoDB disk usage (Atlas Dashboard)
- [ ] Review logs weekly for errors
- [ ] Update container images monthly
- [ ] Test backup/restore procedures quarterly
- [ ] Review and update CORS allowed origins as needed

### 10.2 Scaling
```bash
# Scale auth service to 3 replicas
kubectl scale deployment/auth-service --replicas=3 -n ekart-prod

# Setup horizontal pod autoscaling
kubectl autoscale deployment/auth-service --min=2 --max=5 -n ekart-prod
```

## Support

For deployment issues, check:
1. Docker container logs: `docker logs container_name`
2. Kubernetes logs: `kubectl logs pod_name -n ekart-prod`
3. MongoDB Atlas dashboard for connection issues
4. DNS propagation: `nslookup api.ekart.com`

---

**Last Updated**: 2024-01-15  
**Version**: 1.0

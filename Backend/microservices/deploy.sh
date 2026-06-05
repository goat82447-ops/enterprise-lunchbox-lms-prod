#!/bin/bash
# Production Deployment Script for Ekart
# Prerequisites: Docker, Docker Compose, MongoDB Atlas account, environment variables configured

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
DOCKER_REGISTRY="${DOCKER_REGISTRY:-ekartregistry}"
IMAGE_TAG="${1:-latest}"
ENVIRONMENT="${2:-production}"

echo -e "${YELLOW}=== Ekart Production Deployment Script ===${NC}"
echo "Environment: $ENVIRONMENT"
echo "Image Tag: $IMAGE_TAG"

# Validate environment variables
validate_env_vars() {
    local required_vars=("MONGO_USER" "MONGO_PASSWORD" "MONGO_CLUSTER" "CORS_ALLOWED_ORIGINS" "API_BASE_URL")
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo -e "${RED}ERROR: Required environment variable '$var' is not set${NC}"
            exit 1
        fi
    done
    echo -e "${GREEN}✓ All environment variables validated${NC}"
}

# Build Docker images
build_images() {
    echo -e "${YELLOW}Building Docker images...${NC}"
    
    cd Backend/microservices
    
    # Build API Gateway
    docker build -t "$DOCKER_REGISTRY/api-gateway:$IMAGE_TAG" services/api-gateway/
    echo -e "${GREEN}✓ API Gateway image built${NC}"
    
    # Build Auth Service
    docker build -t "$DOCKER_REGISTRY/auth-service:$IMAGE_TAG" services/auth-service/
    echo -e "${GREEN}✓ Auth Service image built${NC}"
    
    # Build Menu Service
    docker build -t "$DOCKER_REGISTRY/menu-service:$IMAGE_TAG" services/menu-service/
    echo -e "${GREEN}✓ Menu Service image built${NC}"
    
    # Build Order Service
    docker build -t "$DOCKER_REGISTRY/order-service:$IMAGE_TAG" services/order-service/
    echo -e "${GREEN}✓ Order Service image built${NC}"
    
    cd ../..
}

# Push images to registry
push_images() {
    echo -e "${YELLOW}Pushing images to registry...${NC}"
    
    docker push "$DOCKER_REGISTRY/api-gateway:$IMAGE_TAG"
    docker push "$DOCKER_REGISTRY/auth-service:$IMAGE_TAG"
    docker push "$DOCKER_REGISTRY/menu-service:$IMAGE_TAG"
    docker push "$DOCKER_REGISTRY/order-service:$IMAGE_TAG"
    
    echo -e "${GREEN}✓ All images pushed to registry${NC}"
}

# Health check
health_check() {
    echo -e "${YELLOW}Performing health checks...${NC}"
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ API Gateway is healthy${NC}"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo "Health check attempt $attempt/$max_attempts..."
        sleep 2
    done
    
    echo -e "${RED}Health check failed after $max_attempts attempts${NC}"
    return 1
}

# Main execution
main() {
    validate_env_vars
    build_images
    push_images
    
    echo -e "${YELLOW}Deployment complete!${NC}"
    echo -e "${GREEN}Next steps:${NC}"
    echo "1. Update your orchestration platform (Kubernetes/Docker Swarm) with new image tags"
    echo "2. Run health checks: docker-compose -f docker-compose.prod.yml up -d"
    echo "3. Monitor logs: docker-compose -f docker-compose.prod.yml logs -f"
    echo "4. Verify API gateway health at: http://your-domain/health"
}

main

# Production Deployment Script for Ekart (PowerShell)
# Prerequisites: Docker, Docker Compose, MongoDB Atlas account, environment variables configured

param(
    [string]$ImageTag = "latest",
    [string]$Environment = "production"
)

# Configuration
$DockerRegistry = $env:DOCKER_REGISTRY ?? "ekartregistry"
$ProgressPreference = 'SilentlyContinue'

Write-Host "=== Ekart Production Deployment Script ===" -ForegroundColor Yellow
Write-Host "Environment: $Environment"
Write-Host "Image Tag: $ImageTag"

# Validate environment variables
function Validate-EnvVars {
    $requiredVars = @("MONGO_USER", "MONGO_PASSWORD", "MONGO_CLUSTER", "CORS_ALLOWED_ORIGINS", "API_BASE_URL")
    
    foreach ($var in $requiredVars) {
        if ([string]::IsNullOrEmpty([Environment]::GetEnvironmentVariable($var))) {
            Write-Host "ERROR: Required environment variable '$var' is not set" -ForegroundColor Red
            exit 1
        }
    }
    Write-Host "✓ All environment variables validated" -ForegroundColor Green
}

# Build Docker images
function Build-Images {
    Write-Host "Building Docker images..." -ForegroundColor Yellow
    
    Push-Location "Backend\microservices"
    
    $services = @("api-gateway", "auth-service", "menu-service", "order-service")
    
    foreach ($service in $services) {
        docker build -t "$DockerRegistry/${service}:$ImageTag" "services/$service/"
        Write-Host "✓ $service image built" -ForegroundColor Green
    }
    
    Pop-Location
}

# Push images to registry
function Push-Images {
    Write-Host "Pushing images to registry..." -ForegroundColor Yellow
    
    $services = @("api-gateway", "auth-service", "menu-service", "order-service")
    
    foreach ($service in $services) {
        docker push "$DockerRegistry/${service}:$ImageTag"
    }
    
    Write-Host "✓ All images pushed to registry" -ForegroundColor Green
}

# Health check
function Test-Health {
    Write-Host "Performing health checks..." -ForegroundColor Yellow
    
    $maxAttempts = 30
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -Method Get -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Host "✓ API Gateway is healthy" -ForegroundColor Green
                return $true
            }
        } catch {
            # Ignore errors and retry
        }
        
        $attempt++
        Write-Host "Health check attempt $attempt/$maxAttempts..."
        Start-Sleep -Seconds 2
    }
    
    Write-Host "Health check failed after $maxAttempts attempts" -ForegroundColor Red
    return $false
}

# Main execution
Write-Host "Starting deployment process..."

Validate-EnvVars
Build-Images
Push-Images

Write-Host "Deployment complete!" -ForegroundColor Yellow
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "1. Update your orchestration platform (Kubernetes/Docker Swarm) with new image tags"
Write-Host "2. Run health checks: docker-compose -f docker-compose.prod.yml up -d"
Write-Host "3. Monitor logs: docker-compose -f docker-compose.prod.yml logs -f"
Write-Host "4. Verify API gateway health at: http://your-domain/health"

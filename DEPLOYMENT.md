# Ghost Mannequin Pipeline v2.1 - Deployment Guide

Complete deployment guide for production environments including cloud platforms, API configuration, and monitoring setup.

## 🚀 Quick Production Deployment

### Vercel (Recommended)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy to Vercel
vercel --prod

# 3. Configure environment variables in Vercel dashboard
# https://vercel.com/your-project/settings/environment-variables
```

Required Environment Variables:
```bash
FAL_AI_API_KEY=your-fal-ai-key
GEMINI_API_KEY=your-gemini-key  
GROUNDED_SAM_API_KEY=your-hf-token
NODE_ENV=production
NEXT_PUBLIC_PIPELINE_VERSION=2.1
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t ghost-mannequin-v2 .
docker run -p 3000:3000 --env-file .env.local ghost-mannequin-v2
```

### AWS Lambda (Serverless)

```yaml
# serverless.yml
service: ghost-mannequin-pipeline

provider:
  name: aws
  runtime: nodejs18.x
  timeout: 300  # 5 minutes
  memorySize: 1024

functions:
  ghost:
    handler: dist/api/ghost.handler
    events:
      - http:
          path: api/ghost
          method: post
    environment:
      FAL_AI_API_KEY: ${env:FAL_AI_API_KEY}
      GEMINI_API_KEY: ${env:GEMINI_API_KEY}
      GROUNDED_SAM_API_KEY: ${env:GROUNDED_SAM_API_KEY}
```

## 🔧 Environment Configuration

### Production Environment Variables

```bash
# Required API Keys
FAL_AI_API_KEY="key-id:secret"               # FAL.AI Flash API
GEMINI_API_KEY="AIzaSy..."                   # Google Gemini 1.5 Flash  
GROUNDED_SAM_API_KEY="hf_..."                # Hugging Face token

# Application Settings
NODE_ENV="production"
NEXT_PUBLIC_PIPELINE_VERSION="2.1"

# Optional Performance Tuning
TIMEOUT_ANALYSIS=90000                       # 90 seconds
TIMEOUT_SEGMENTATION=120000                  # 120 seconds
TIMEOUT_GENERATION=180000                    # 180 seconds
MAX_CONCURRENT_REQUESTS=10                   # Concurrent limit
ENABLE_REQUEST_CACHE=true                    # Response caching

# Security Settings
CORS_ORIGIN="https://your-domain.com"        # CORS configuration
RATE_LIMIT_REQUESTS=100                      # Requests per minute
RATE_LIMIT_WINDOW=60000                      # Rate limit window (ms)

# Monitoring & Logging
LOG_LEVEL="info"                             # debug, info, warn, error
ENABLE_PERFORMANCE_METRICS=true              # Performance tracking
SENTRY_DSN="https://..."                     # Error monitoring (optional)
```

### Development vs Production

| Environment | Purpose | Configuration |
|-------------|---------|---------------|
| **Development** | Local testing | `NODE_ENV=development`, debug logging, relaxed timeouts |
| **Staging** | Pre-production testing | `NODE_ENV=staging`, production APIs, debug enabled |
| **Production** | Live deployment | `NODE_ENV=production`, optimized timeouts, minimal logging |

## 📊 Infrastructure Requirements

### Minimum Requirements
- **CPU**: 2 vCPUs
- **RAM**: 1GB (2GB recommended)
- **Storage**: 10GB for application + logs
- **Network**: Stable internet for API calls
- **Node.js**: 18.x or higher

### Recommended Production Setup
- **CPU**: 4 vCPUs  
- **RAM**: 4GB
- **Storage**: 50GB with log rotation
- **Load Balancer**: For horizontal scaling
- **CDN**: For static assets and caching

### Scaling Considerations

```bash
# Horizontal scaling with PM2
npm install -g pm2

# Production cluster mode
pm2 start ecosystem.config.js --env production

# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'ghost-mannequin-v2',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

## 🔒 Security Configuration

### API Security

```bash
# Rate limiting configuration
RATE_LIMIT_REQUESTS=100          # Requests per window
RATE_LIMIT_WINDOW=60000          # 1 minute window
RATE_LIMIT_SKIP_FAILED=true      # Skip failed requests

# CORS configuration  
CORS_ORIGIN="https://your-domain.com,https://admin.your-domain.com"
CORS_METHODS="POST,GET,OPTIONS"
CORS_CREDENTIALS=false

# Request validation
MAX_REQUEST_SIZE=50mb            # Maximum request body size
VALIDATE_IMAGE_URLS=true         # Validate image URL formats
REQUIRE_HTTPS=true               # Force HTTPS in production
```

### Network Security

```bash
# Firewall rules (example for ufw)
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP redirect
sudo ufw allow 443/tcp    # HTTPS
sudo ufw deny 3000/tcp    # Block direct app access
sudo ufw enable

# Nginx reverse proxy configuration
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings for long-running AI requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

## 📈 Monitoring & Observability

### Performance Monitoring

```javascript
// Performance metrics endpoint
GET /api/metrics

// Response format
{
  "system": {
    "uptime": 86400,
    "memory": {
      "used": "256MB",
      "free": "768MB",
      "total": "1024MB"
    },
    "cpu": {
      "usage": "15%",
      "load": [0.5, 0.4, 0.3]
    }
  },
  "pipeline": {
    "requests_total": 1250,
    "requests_success": 1223,
    "requests_failed": 27,
    "avg_processing_time": 18500,
    "quality_score_avg": 87.3
  },
  "apis": {
    "fal_ai": {
      "requests": 1250,
      "success_rate": 98.4,
      "avg_response_time": 12300
    },
    "gemini": {
      "requests": 1250,
      "success_rate": 99.1,
      "avg_response_time": 2400
    }
  }
}
```

### Health Checks

```bash
# Application health
curl https://your-domain.com/api/test

# Detailed health with API connectivity
curl https://your-domain.com/api/health

# Expected response
{
  "status": "healthy",
  "version": "2.1.0",
  "timestamp": "2024-09-22T12:00:00Z",
  "checks": {
    "database": "ok",
    "fal_ai": "ok", 
    "gemini": "ok",
    "grounded_sam": "ok"
  },
  "performance": {
    "avg_response_time": "18.5s",
    "success_rate": "98.4%",
    "uptime": "99.9%"
  }
}
```

### Error Tracking

```javascript
// Sentry integration (optional)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Performance monitoring
  tracesSampleRate: 0.1,
  
  // Error filtering
  beforeSend(event) {
    // Filter out expected errors
    if (event.exception?.values?.[0]?.type === 'QUALITY_GATES_FAILED') {
      return null; // Don't report quality gate failures
    }
    return event;
  }
});
```

## 🔧 Troubleshooting

### Common Deployment Issues

#### 1. API Key Problems
```bash
# Verify API keys are set
node -e "console.log('FAL:', !!process.env.FAL_AI_API_KEY)"
node -e "console.log('Gemini:', !!process.env.GEMINI_API_KEY)"
node -e "console.log('SAM:', !!process.env.GROUNDED_SAM_API_KEY)"

# Test API connectivity
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

#### 2. Memory Issues
```bash
# Monitor memory usage
docker stats ghost-mannequin-v2

# Increase memory limit
docker run -m 2g ghost-mannequin-v2

# PM2 memory monitoring
pm2 monit
```

#### 3. Timeout Issues
```bash
# Check processing times
curl -w "@curl-format.txt" -X POST http://localhost:3000/api/ghost

# curl-format.txt
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
```

### Performance Optimization

#### Database Optimization (if using)
```sql
-- Index optimization for session tracking
CREATE INDEX idx_sessions_created ON sessions(created_at);
CREATE INDEX idx_sessions_status ON sessions(status);

-- Regular cleanup
DELETE FROM sessions WHERE created_at < NOW() - INTERVAL '7 days';
```

#### Caching Strategy
```bash
# Redis for response caching (optional)
REDIS_URL="redis://localhost:6379"
CACHE_TTL=3600                   # 1 hour cache
CACHE_PREFIX="ghost-v2:"         # Cache key prefix
```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] API keys tested and verified
- [ ] Build completes without errors (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] Security scan completed
- [ ] Performance benchmarks within acceptable range

### Deployment
- [ ] Application deployed to target environment
- [ ] Health checks returning 200 OK
- [ ] API endpoints responding correctly
- [ ] Error monitoring configured
- [ ] Performance monitoring active
- [ ] Logs being collected and rotated

### Post-Deployment
- [ ] End-to-end testing with real images
- [ ] Load testing with expected traffic
- [ ] Security vulnerability scan
- [ ] Backup and recovery procedures tested
- [ ] Documentation updated
- [ ] Team trained on new features

## 🆘 Support & Maintenance

### Regular Maintenance Tasks
```bash
# Weekly tasks
- Review performance metrics
- Check error rates and investigate failures
- Update dependencies (security patches)
- Clean up logs older than 30 days

# Monthly tasks  
- Review API usage and costs
- Update API keys if needed
- Performance optimization review
- Security audit

# Quarterly tasks
- Major dependency updates
- Infrastructure scaling review
- Disaster recovery testing
- Security penetration testing
```

### Emergency Procedures
```bash
# Quick rollback
git revert HEAD
npm run build
pm2 restart all

# Emergency disable
export MAINTENANCE_MODE=true
pm2 restart all

# Scale down if overloaded
pm2 scale ghost-mannequin-v2 1
```

---

**Contact Information:**
- Technical Issues: [GitHub Issues](https://github.com/your-repo/issues)
- Security Concerns: security@your-domain.com
- Emergency Contact: +1-XXX-XXX-XXXX
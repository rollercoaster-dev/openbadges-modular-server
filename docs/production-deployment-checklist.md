# Production Deployment Checklist

This checklist provides a comprehensive guide for deploying the Open Badges Modular Server in a production environment. Use this document to ensure your deployment is secure, performant, and reliable.

## Table of Contents

1. [Pre-Deployment Planning](#pre-deployment-planning)
2. [Security Checklist](#security-checklist)
3. [Performance Optimization](#performance-optimization)
4. [Monitoring Setup](#monitoring-setup)
5. [Backup Procedures](#backup-procedures)
6. [Scaling Considerations](#scaling-considerations)
7. [Maintenance Procedures](#maintenance-procedures)
8. [Deployment Verification](#deployment-verification)

## Pre-Deployment Planning

Before deploying to production, ensure you have:

- [ ] Determined your deployment architecture (single server, high availability, etc.)
- [ ] Selected the appropriate database backend (PostgreSQL recommended for production)
- [ ] Planned your authentication strategy
- [ ] Identified resource requirements (CPU, memory, disk)
- [ ] Established backup and recovery procedures
- [ ] Created monitoring and alerting plans
- [ ] Documented deployment and rollback procedures

## Security Checklist

### Network Security

- [ ] Deploy behind a reverse proxy (Nginx, Traefik, etc.)
- [ ] Configure TLS/SSL with strong ciphers
- [ ] Implement HTTP security headers:
  - [ ] Content-Security-Policy
  - [ ] X-Content-Type-Options: nosniff
  - [ ] X-Frame-Options: DENY
  - [ ] Strict-Transport-Security (HSTS)
- [ ] Set up a Web Application Firewall (WAF)
- [ ] Configure network firewall to restrict access to necessary ports only
- [ ] Implement rate limiting to prevent abuse

### Authentication Security

- [ ] Use a strong, unique JWT secret
- [ ] Set appropriate JWT token expiry (balance security vs. user experience)
- [ ] Implement secure API key management
- [ ] Enable RBAC for proper access control
- [ ] Disable unused authentication methods
- [ ] Implement proper CORS configuration
- [ ] Ensure all authentication endpoints are protected against brute force attacks

### Database Security

- [ ] Use a dedicated database user with minimal permissions
- [ ] Store database credentials securely (environment variables or secrets management)
- [ ] Enable TLS for database connections
- [ ] Implement database connection pooling with appropriate limits
- [ ] Regularly rotate database credentials
- [ ] Ensure database is not directly accessible from the internet

### Container Security

- [ ] Use the latest stable container image
- [ ] Run containers as non-root user (already configured in the image)
- [ ] Implement resource limits for containers
- [ ] Scan container images for vulnerabilities
- [ ] Use read-only file systems where possible
- [ ] Implement proper secret management (Docker secrets, Kubernetes secrets, etc.)

### Environment Variables

- [ ] Set `NODE_ENV=production`
- [ ] Configure a strong `JWT_SECRET`
- [ ] Set appropriate `BASE_URL` for your deployment
- [ ] Review all environment variables in [Environment Variables Reference](./environment-variables-reference.md)

## Performance Optimization

### Server Configuration

- [ ] Allocate appropriate CPU and memory resources
- [ ] Configure container resource limits
- [ ] Optimize Node.js settings for production
- [ ] Configure appropriate concurrency settings

### Database Optimization

- [ ] Use PostgreSQL for production deployments
- [ ] Configure appropriate connection pool size
- [ ] Implement database indexes (created automatically by migrations)
- [ ] Configure query logging with appropriate thresholds
- [ ] Set up database monitoring

### Caching Configuration

- [ ] Enable caching with `CACHE_ENABLED=true`
- [ ] Configure appropriate cache sizes and TTLs
- [ ] Consider using a distributed cache for multi-instance deployments

### Network Optimization

- [ ] Implement HTTP/2 support
- [ ] Configure appropriate keep-alive settings
- [ ] Implement content compression
- [ ] Use a CDN for static assets if applicable

## Monitoring Setup

### Health Checks

- [ ] Configure container health checks
- [ ] Set up external health monitoring
- [ ] Implement alerting for health check failures
- [ ] Use the built-in `/health` endpoint

### Metrics Collection

- [ ] Set up system metrics monitoring (CPU, memory, disk, network)
- [ ] Implement application metrics collection
- [ ] Configure database metrics monitoring
- [ ] Set up alerting thresholds

### Logging

- [ ] Configure appropriate log levels (`LOG_LEVEL=info` for production)
- [ ] Set up log aggregation
- [ ] Implement log rotation
- [ ] Configure log retention policies
- [ ] Set up log analysis and alerting

### Alerting

- [ ] Define critical alerts (service down, high error rates, etc.)
- [ ] Set up notification channels (email, SMS, chat, etc.)
- [ ] Implement escalation procedures
- [ ] Configure alert thresholds based on baseline metrics

## Backup Procedures

### Database Backups

- [ ] Implement regular database backups
- [ ] Configure backup retention policies
- [ ] Test backup restoration procedures
- [ ] Store backups securely and off-site
- [ ] For PostgreSQL, use the backup service in `docker-compose.prod.yml`

### Configuration Backups

- [ ] Back up environment variables
- [ ] Back up Docker Compose files
- [ ] Back up custom configuration files
- [ ] Document configuration changes

### Asset Backups

- [ ] Back up uploaded badge images and assets
- [ ] Ensure S3 bucket versioning if using S3 storage
- [ ] Implement backup verification procedures

## Scaling Considerations

### Horizontal Scaling

- [ ] Implement a load balancer for multiple instances
- [ ] Ensure session persistence is not required (stateless design)
- [ ] Configure database connection pooling appropriately
- [ ] Implement distributed caching if needed
- [ ] Consider using Kubernetes for orchestration

### Vertical Scaling

- [ ] Monitor resource usage to determine scaling needs
- [ ] Allocate appropriate CPU and memory resources
- [ ] Scale database resources as needed
- [ ] Consider database read replicas for read-heavy workloads

### Database Scaling

- [ ] Implement PostgreSQL replication for high availability
- [ ] Consider read replicas for read-heavy workloads
- [ ] Implement connection pooling
- [ ] Monitor database performance metrics

## Maintenance Procedures

### Updates and Upgrades

- [ ] Establish a regular update schedule
- [ ] Test updates in a staging environment before production
- [ ] Document update procedures
- [ ] Implement rollback procedures
- [ ] Monitor for security advisories

### Database Maintenance

- [ ] Schedule regular database maintenance windows
- [ ] Implement database vacuuming (PostgreSQL)
- [ ] Monitor database size and growth
- [ ] Implement index maintenance procedures

### Log Management

- [ ] Implement log rotation
- [ ] Configure log retention policies
- [ ] Archive logs for compliance if needed
- [ ] Regularly review logs for issues

### Performance Monitoring

- [ ] Regularly review performance metrics
- [ ] Identify and address performance bottlenecks
- [ ] Adjust resource allocation as needed
- [ ] Monitor database query performance

## Deployment Verification

After deployment, verify:

### Functionality Verification

- [ ] API endpoints are accessible
- [ ] Authentication is working correctly
- [ ] Badge issuance flow works end-to-end
- [ ] Verification endpoints are accessible
- [ ] Public endpoints are accessible without authentication

### Security Verification

- [ ] TLS/SSL is properly configured
- [ ] Security headers are in place
- [ ] Authentication is enforced for protected endpoints
- [ ] Rate limiting is working
- [ ] Database is not directly accessible

### Performance Verification

- [ ] Response times are within acceptable limits
- [ ] Resource usage is within expected ranges
- [ ] Database connections are properly managed
- [ ] Caching is working effectively

### Monitoring Verification

- [ ] Health checks are passing
- [ ] Metrics are being collected
- [ ] Logs are being properly captured
- [ ] Alerts are properly configured

## Production Deployment Example

Here's an example of a production-ready Docker Compose configuration:

```yaml
version: '3.8'

services:
  # Reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/ssl:/etc/nginx/ssl
      - ./nginx/logs:/var/log/nginx
    depends_on:
      - api
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3

  # API service
  api:
    image: ghcr.io/rollercoaster-dev/openbadges-modular-server:latest
    environment:
      # Server configuration
      - PORT=3000
      - HOST=0.0.0.0
      - NODE_ENV=production
      - BASE_URL=https://badges.example.com
      
      # Database configuration
      - DB_TYPE=postgresql
      - DATABASE_URL=postgres://openbadges:${DB_PASSWORD}@db:5432/openbadges
      - DB_MAX_CONNECTION_ATTEMPTS=10
      - DB_CONNECTION_RETRY_DELAY_MS=2000
      
      # Authentication configuration
      - AUTH_ENABLED=true
      - JWT_SECRET=${JWT_SECRET}
      - JWT_TOKEN_EXPIRY_SECONDS=3600
      - AUTH_API_KEY_ENABLED=true
      - AUTH_API_KEY_SYSTEM=${API_KEY}:system-user:System integration
      
      # Logging configuration
      - LOG_LEVEL=info
      - LOG_FORMAT=json
      
      # Cache configuration
      - CACHE_ENABLED=true
      - CACHE_MAX_ITEMS=10000
    volumes:
      - api_data:/data
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  # Database service
  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_USER=openbadges
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=openbadges
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/postgresql.conf:/etc/postgresql/postgresql.conf
      - ./backups:/backups
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "openbadges"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.25'
          memory: 256M

  # Backup service
  backup:
    image: postgres:14-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data:ro
      - ./backups:/backups
    environment:
      - POSTGRES_USER=openbadges
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=openbadges
      - BACKUP_RETENTION_DAYS=7
    command: |
      sh -c 'while true; do
        pg_dump -h db -U openbadges -d openbadges -f /backups/openbadges_$(date +%Y%m%d_%H%M%S).sql
        find /backups -name "openbadges_*.sql" -type f -mtime +${BACKUP_RETENTION_DAYS} -delete
        sleep 86400
      done'
    depends_on:
      - db
    restart: unless-stopped

volumes:
  postgres_data:
  api_data:
```

This configuration includes:
- Nginx reverse proxy with SSL termination
- API service with appropriate resource limits
- PostgreSQL database with custom configuration
- Automated backup service

Remember to create a `.env` file with the necessary secrets:
```
DB_PASSWORD=secure-database-password
JWT_SECRET=secure-jwt-secret
API_KEY=secure-api-key
```

#!/bin/sh
# Health Check Script for Open Badges API
# This script checks the health of the API service

set -e

# API endpoint to check
HEALTH_ENDPOINT="http://localhost:${PORT:-3000}/health"

# Perform health check
response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_ENDPOINT)

if [ "$response" = "200" ]; then
    # Get detailed health status
    health_data=$(curl -s $HEALTH_ENDPOINT)
    
    # Extract status from health data (simplified parsing)
    status=$(echo "$health_data" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$status" = "ok" ]; then
        echo "Health check passed: API is healthy"
        exit 0
    elif [ "$status" = "degraded" ]; then
        echo "Health check warning: API is in degraded state"
        exit 0  # Still return success to prevent container restart
    else
        echo "Health check failed: API status is $status"
        exit 1
    fi
else
    echo "Health check failed: HTTP status $response"
    exit 1
fi

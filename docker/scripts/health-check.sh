#!/bin/sh
# Health Check Script for Open Badges API
# This script checks the health of the API service
# Simplified for better container compatibility

# API endpoint to check
HEALTH_ENDPOINT="http://localhost:${PORT:-3000}/health"

# Perform health check with timeout
response=$(curl -f -s -m 5 --connect-timeout 3 "$HEALTH_ENDPOINT" 2>/dev/null)
exit_code=$?

if [ $exit_code -eq 0 ]; then
    # curl succeeded (HTTP 200-299), check if we got a response
    if [ -n "$response" ]; then
        # Try to check if response contains success indicators
        # Use simple string matching instead of complex JSON parsing
        case "$response" in
            *'"status":"ok"'*|*'"status": "ok"'*)
                echo "Health check passed: API is healthy"
                exit 0
                ;;
            *'"status":"degraded"'*|*'"status": "degraded"'*)
                echo "Health check warning: API is in degraded state"
                exit 0  # Still return success to prevent container restart
                ;;
            *'"status"'*)
                echo "Health check failed: API status not ok"
                echo "Response: $response"
                exit 1
                ;;
            *)
                # If no status field found, assume success if we got any response
                echo "Health check passed: API responding (no status field)"
                exit 0
                ;;
        esac
    else
        echo "Health check failed: Empty response from API"
        exit 1
    fi
else
    echo "Health check failed: curl exit code $exit_code"
    exit 1
fi

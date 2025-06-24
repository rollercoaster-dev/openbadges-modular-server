#!/bin/bash

# Repository Dispatch Script
# Trigger downstream workflows via repository_dispatch using GitHub PAT
#
# Usage:
#   ./repository-dispatch.sh [OPTIONS]
#
# Options:
#   -t, --token TOKEN        GitHub Personal Access Token (required)
#   -o, --owner OWNER        Repository owner (default: current repo owner)
#   -r, --repo REPO          Repository name (default: current repo name)
#   -e, --event-type TYPE    Event type for dispatch (required)
#   -p, --payload PAYLOAD    JSON payload (default: {})
#   --target-owner OWNER     Target repository owner (if different)
#   --target-repo REPO       Target repository name (if different)
#   -h, --help               Show this help message
#
# Environment Variables:
#   GH_PAT                   GitHub Personal Access Token
#   GITHUB_REPOSITORY        Current repository (owner/repo format)
#   OWNER                    Repository owner
#   REPO                     Repository name

set -euo pipefail

# Default values
GITHUB_TOKEN="${GH_PAT:-}"
OWNER="${OWNER:-}"
REPO="${REPO:-}"
EVENT_TYPE=""
CLIENT_PAYLOAD="{}"
TARGET_OWNER=""
TARGET_REPO=""

# Parse GitHub repository if available
if [[ -n "${GITHUB_REPOSITORY:-}" ]]; then
    IFS='/' read -r DEFAULT_OWNER DEFAULT_REPO <<< "$GITHUB_REPOSITORY"
    OWNER="${OWNER:-$DEFAULT_OWNER}"
    REPO="${REPO:-$DEFAULT_REPO}"
fi

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -t, --token TOKEN        GitHub Personal Access Token (required)"
    echo "  -o, --owner OWNER        Repository owner (default: current repo owner)"
    echo "  -r, --repo REPO          Repository name (default: current repo name)"
    echo "  -e, --event-type TYPE    Event type for dispatch (required)"
    echo "  -p, --payload PAYLOAD    JSON payload (default: {})"
    echo "  --target-owner OWNER     Target repository owner (if different)"
    echo "  --target-repo REPO       Target repository name (if different)"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  GH_PAT                   GitHub Personal Access Token"
    echo "  GITHUB_REPOSITORY        Current repository (owner/repo format)"
    echo "  OWNER                    Repository owner"
    echo "  REPO                     Repository name"
    echo ""
    echo "Examples:"
    echo "  $0 --token \$GH_PAT --event-type docker_build"
    echo "  $0 -t \$GH_PAT -e integration_test -p '{\"branch\":\"main\"}'"
    echo "  $0 -t \$GH_PAT -e deploy --target-owner myorg --target-repo myapp"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--token)
            GITHUB_TOKEN="$2"
            shift 2
            ;;
        -o|--owner)
            OWNER="$2"
            shift 2
            ;;
        -r|--repo)
            REPO="$2"
            shift 2
            ;;
        -e|--event-type)
            EVENT_TYPE="$2"
            shift 2
            ;;
        -p|--payload)
            CLIENT_PAYLOAD="$2"
            shift 2
            ;;
        --target-owner)
            TARGET_OWNER="$2"
            shift 2
            ;;
        --target-repo)
            TARGET_REPO="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            show_usage
            exit 1
            ;;
    esac
done

# Validate required parameters
if [[ -z "$GITHUB_TOKEN" ]]; then
    echo "Error: GitHub token is required. Use --token or set GH_PAT environment variable." >&2
    exit 1
fi

if [[ -z "$EVENT_TYPE" ]]; then
    echo "Error: Event type is required. Use --event-type option." >&2
    exit 1
fi

if [[ -z "$OWNER" ]] || [[ -z "$REPO" ]]; then
    echo "Error: Repository owner and name are required. Use --owner and --repo options or set GITHUB_REPOSITORY environment variable." >&2
    exit 1
fi

# Set target repository (default to source repository)
FINAL_OWNER="${TARGET_OWNER:-$OWNER}"
FINAL_REPO="${TARGET_REPO:-$REPO}"

# Validate JSON payload
if ! echo "$CLIENT_PAYLOAD" | jq empty 2>/dev/null; then
    echo "Warning: Invalid JSON payload, using empty object" >&2
    CLIENT_PAYLOAD="{}"
fi

# Build the dispatch URL
DISPATCH_URL="https://api.github.com/repos/$FINAL_OWNER/$FINAL_REPO/dispatches"

echo "Repository Dispatch Configuration:"
echo "  Target Repository: $FINAL_OWNER/$FINAL_REPO"
echo "  Event Type: $EVENT_TYPE"
echo "  Client Payload: $CLIENT_PAYLOAD"
echo "  Dispatch URL: $DISPATCH_URL"
echo ""

# Prepare the payload
PAYLOAD=$(jq -n \
    --arg event_type "$EVENT_TYPE" \
    --argjson client_payload "$CLIENT_PAYLOAD" \
    '{
        event_type: $event_type,
        client_payload: $client_payload
    }')

echo "Sending repository dispatch..."

# Make the API call
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "$DISPATCH_URL" \
    -d "$PAYLOAD")

# Extract status code and response body
STATUS_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)

echo "Response Status: $STATUS_CODE"

# Check if the request was successful
if [[ "$STATUS_CODE" -eq 204 ]]; then
    echo "✅ Repository dispatch triggered successfully!"
    echo ""
    echo "The '$EVENT_TYPE' event has been dispatched to $FINAL_OWNER/$FINAL_REPO"
    exit 0
else
    echo "❌ Failed to trigger repository dispatch"
    echo "Response Body: $RESPONSE_BODY"
    
    # Provide helpful error messages
    case $STATUS_CODE in
        401)
            echo "Error: Unauthorized. Check your GitHub token permissions."
            ;;
        403)
            echo "Error: Forbidden. The token may not have 'repo' scope or access to the target repository."
            ;;
        404)
            echo "Error: Repository not found. Check the owner/repo combination."
            ;;
        422)
            echo "Error: Invalid request. Check the event type and payload format."
            ;;
    esac
    
    exit 1
fi

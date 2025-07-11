#!/bin/bash

# This script runs PostgreSQL tests with Docker, ensuring proper error handling.
# It sets up the test database, runs migrations, executes tests, and tears down the database.

set -euo pipefail

cleanup() {
  echo "Tearing down PostgreSQL test database..."
  bun run db:test:pg:stop
}
trap cleanup EXIT

echo "Starting PostgreSQL test setup..."
bun run db:test:pg:start

echo "Resetting PostgreSQL test database..."
bun run db:test:pg:reset

echo "Running PostgreSQL migrations..."
bun run db:test:pg:migrate

echo "Running PostgreSQL tests..."
bun run test:pg

# `cleanup` will run automatically; only log success here
echo "PostgreSQL tests completed successfully."

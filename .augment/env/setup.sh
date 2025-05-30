#!/bin/bash

# Exit on any error
set -e

echo "Setting up Open Badges API development environment..."

# Update package lists
sudo apt-get update

# Install required system dependencies
sudo apt-get install -y curl unzip sqlite3 libsqlite3-dev

# Install Bun
echo "Installing Bun..."
curl -fsSL https://bun.sh/install | bash

# Add Bun to PATH in .profile
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> $HOME/.profile

# Source the profile to make bun available in current session
export PATH="$HOME/.bun/bin:$PATH"

# Verify Bun installation
echo "Verifying Bun installation..."
bun --version

# Navigate to workspace directory
cd /mnt/persist/workspace

# Install project dependencies
echo "Installing project dependencies..."
bun install

# Set up environment variables for tests
export NODE_ENV=test
export DB_TYPE=sqlite
export SQLITE_DB_PATH=:memory:

echo "Setup completed successfully!"
echo "Bun version: $(bun --version)"
echo "Node environment: $NODE_ENV"
echo "Database type: $DB_TYPE"
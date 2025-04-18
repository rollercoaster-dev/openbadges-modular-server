#!/bin/sh
# Database Restore Script for Open Badges API
# This script restores backups of either SQLite or PostgreSQL databases

set -e

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "Error: No backup file specified"
    echo "Usage: $0 <backup_file>"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Starting database restore - $(date)"

# Determine database type from backup filename
if echo "$BACKUP_FILE" | grep -q "sqlite"; then
    echo "Restoring SQLite backup..."
    
    # Install SQLite
    apk add --no-cache sqlite gzip
    
    # Decompress if needed
    if echo "$BACKUP_FILE" | grep -q "\.gz$"; then
        echo "Decompressing backup file..."
        gunzip -c "$BACKUP_FILE" > /tmp/sqlite_restore.db
        RESTORE_FILE="/tmp/sqlite_restore.db"
    else
        RESTORE_FILE="$BACKUP_FILE"
    fi
    
    # Stop the API service to prevent database access during restore
    echo "Warning: Make sure the API service is stopped before continuing"
    echo "Press Enter to continue or Ctrl+C to abort..."
    read -r
    
    # Restore the database
    echo "Restoring SQLite database to /data/sqlite.db..."
    cp "$RESTORE_FILE" /data/sqlite.db
    
    # Clean up
    if [ "$RESTORE_FILE" = "/tmp/sqlite_restore.db" ]; then
        rm -f "$RESTORE_FILE"
    fi
    
    echo "SQLite database restored successfully"
    
elif echo "$BACKUP_FILE" | grep -q "postgres"; then
    echo "Restoring PostgreSQL backup..."
    
    # Install PostgreSQL client
    apk add --no-cache postgresql-client gzip
    
    # Set PostgreSQL environment variables
    export PGHOST=db
    export PGUSER=$POSTGRES_USER
    export PGPASSWORD=$POSTGRES_PASSWORD
    export PGDATABASE=$POSTGRES_DB
    
    # Decompress if needed
    if echo "$BACKUP_FILE" | grep -q "\.gz$"; then
        echo "Decompressing and restoring backup file..."
        gunzip -c "$BACKUP_FILE" | psql
    else
        echo "Restoring backup file..."
        psql < "$BACKUP_FILE"
    fi
    
    echo "PostgreSQL database restored successfully"
else
    echo "Error: Unable to determine database type from backup filename"
    exit 1
fi

echo "Restore completed - $(date)"

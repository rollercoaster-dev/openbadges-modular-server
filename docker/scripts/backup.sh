#!/bin/sh
# Database Backup Script for Open Badges API
# This script creates backups of either SQLite or PostgreSQL databases

set -e

# Create backup directory if it doesn't exist
mkdir -p /backups

# Get current date for backup filename
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

echo "Starting database backup - $(date)"
echo "Database type: $DB_TYPE"

# Backup based on database type
if [ "$DB_TYPE" = "sqlite" ]; then
    echo "Creating SQLite backup..."
    
    # Create backup directory
    BACKUP_FILE="/backups/sqlite_backup_$DATE.db"
    
    # Use SQLite's backup command
    apk add --no-cache sqlite
    
    # Check if database file exists
    if [ -f "/data/sqlite.db" ]; then
        # Create a backup using SQLite's .backup command
        sqlite3 /data/sqlite.db ".backup '$BACKUP_FILE'"
        echo "SQLite backup created: $BACKUP_FILE"
        
        # Compress the backup
        apk add --no-cache gzip
        gzip -f "$BACKUP_FILE"
        echo "Backup compressed: $BACKUP_FILE.gz"
    else
        echo "Error: SQLite database file not found at /data/sqlite.db"
        exit 1
    fi
    
elif [ "$DB_TYPE" = "postgresql" ]; then
    echo "Creating PostgreSQL backup..."
    
    # Install PostgreSQL client
    apk add --no-cache postgresql-client
    
    # Create backup file
    BACKUP_FILE="/backups/postgres_backup_$DATE.sql.gz"
    
    # Set PostgreSQL environment variables
    export PGHOST=db
    export PGUSER=$POSTGRES_USER
    export PGPASSWORD=$POSTGRES_PASSWORD
    export PGDATABASE=$POSTGRES_DB
    
    # Create compressed backup
    pg_dump | gzip > "$BACKUP_FILE"
    
    echo "PostgreSQL backup created: $BACKUP_FILE"
else
    echo "Error: Unsupported database type: $DB_TYPE"
    exit 1
fi

# Clean up old backups
echo "Cleaning up backups older than $BACKUP_RETENTION_DAYS days..."
find /backups -name "*.gz" -type f -mtime +$BACKUP_RETENTION_DAYS -delete
echo "Cleanup completed."

echo "Backup completed successfully - $(date)"

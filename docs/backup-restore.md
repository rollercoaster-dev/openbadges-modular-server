# Database Backup and Restore Guide

This document provides detailed instructions for backing up and restoring the Open Badges API database.

## Table of Contents

1. [Overview](#overview)
2. [Automated Backups](#automated-backups)
3. [Manual Backups](#manual-backups)
4. [Backup Retention](#backup-retention)
5. [Restoring from Backup](#restoring-from-backup)
6. [Backup Verification](#backup-verification)
7. [Disaster Recovery](#disaster-recovery)

## Overview

The Open Badges API supports two database types:
- **SQLite**: File-based database, suitable for small to medium deployments
- **PostgreSQL**: Client-server database, suitable for larger deployments

Both database types have different backup and restore procedures, which are detailed in this guide.

## Automated Backups

The production Docker Compose configuration includes an automated backup service that creates daily backups of the database.

### Configuration

The backup service can be configured using the following environment variables:

- `BACKUP_RETENTION_DAYS`: Number of days to keep backups (default: 7)
- `DB_TYPE`: Database type ("sqlite" or "postgresql")

### Backup Schedule

By default, backups run daily. You can adjust the schedule by modifying the `backup` service in the Docker Compose file:

```yaml
backup:
  # ... other configuration ...
  deploy:
    restart_policy:
      condition: none
    placement:
      constraints:
        - node.role == manager
    labels:
      - "swarm.cronjob.enable=true"
      - "swarm.cronjob.schedule=0 0 * * *" # Daily at midnight
      - "swarm.cronjob.skip-running=true"
```

### Backup Location

Backups are stored in the `backups/` directory, which is mounted as a volume in the Docker Compose configuration. This directory should be backed up to external storage for disaster recovery.

## Manual Backups

### SQLite Manual Backup

To manually create a SQLite backup:

1. Using Docker Compose:
   ```bash
   docker-compose -f docker-compose.prod.yml run --rm backup /scripts/backup.sh
   ```

2. Direct SQLite backup (if you have access to the server):
   ```bash
   sqlite3 /path/to/sqlite.db ".backup '/path/to/backup/sqlite_backup_$(date +%Y-%m-%d).db'"
   gzip /path/to/backup/sqlite_backup_*.db
   ```

### PostgreSQL Manual Backup

To manually create a PostgreSQL backup:

1. Using Docker Compose:
   ```bash
   docker-compose -f docker-compose.prod.yml run --rm backup /scripts/backup.sh
   ```

2. Direct PostgreSQL backup (if you have access to the server):
   ```bash
   PGPASSWORD=your_password pg_dump -h db -U postgres openbadges | gzip > /path/to/backup/postgres_backup_$(date +%Y-%m-%d).sql.gz
   ```

## Backup Retention

The backup service automatically manages backup retention based on the `BACKUP_RETENTION_DAYS` environment variable. By default, backups older than 7 days are deleted.

To manually manage backup retention:

```bash
# Delete backups older than 7 days
find /path/to/backups -name "*.gz" -type f -mtime +7 -delete
```

## Restoring from Backup

### SQLite Restore

To restore a SQLite database from backup:

1. Stop the API service:
   ```bash
   docker-compose -f docker-compose.prod.yml stop api
   ```

2. Restore the database:
   ```bash
   docker-compose -f docker-compose.prod.yml run --rm -v ./backups:/backups backup /scripts/restore.sh /backups/sqlite_backup_YYYY-MM-DD.db.gz
   ```

3. Restart the API service:
   ```bash
   docker-compose -f docker-compose.prod.yml start api
   ```

### PostgreSQL Restore

To restore a PostgreSQL database from backup:

1. Stop the API service:
   ```bash
   docker-compose -f docker-compose.prod.yml stop api
   ```

2. Restore the database:
   ```bash
   docker-compose -f docker-compose.prod.yml run --rm -v ./backups:/backups backup /scripts/restore.sh /backups/postgres_backup_YYYY-MM-DD.sql.gz
   ```

3. Restart the API service:
   ```bash
   docker-compose -f docker-compose.prod.yml start api
   ```

## Backup Verification

It's important to regularly verify that your backups are valid and can be restored. Here's a procedure for backup verification:

1. Create a test environment:
   ```bash
   docker-compose -f docker-compose.test.yml up -d
   ```

2. Restore a backup to the test environment:
   ```bash
   docker-compose -f docker-compose.test.yml run --rm -v ./backups:/backups backup /scripts/restore.sh /backups/your-backup-file.gz
   ```

3. Verify the data integrity:
   - Access the API and check that data is accessible
   - Run automated tests against the restored database
   - Check for any errors in the logs

4. Clean up the test environment:
   ```bash
   docker-compose -f docker-compose.test.yml down -v
   ```

## Disaster Recovery

In case of a complete system failure, follow these steps to recover:

1. Set up a new server with Docker and Docker Compose

2. Clone the repository:
   ```bash
   git clone https://github.com/your-org/openbadges-modular-server.git
   cd openbadges-modular-server
   ```

3. Copy your backup files to the new server:
   ```bash
   mkdir -p backups
   # Copy backup files to the backups directory
   ```

4. Create a `.env` file with your configuration

5. Restore the database:
   ```bash
   docker-compose -f docker-compose.prod.yml run --rm -v ./backups:/backups backup /scripts/restore.sh /backups/your-latest-backup.gz
   ```

6. Start the services:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

7. Verify that the system is working correctly:
   - Check the health endpoint: `curl http://localhost:3000/health`
   - Verify that data is accessible through the API

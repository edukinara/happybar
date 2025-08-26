# Database Backup and Restore Scripts

This directory contains PostgreSQL backup and restore utilities for the Happy Bar application.

## Scripts Overview

### 1. pg-backup.sh
Creates comprehensive PostgreSQL database backups in multiple formats.

**Features:**
- Multiple backup formats (SQL, Custom, TAR)
- Automatic compression
- Environment detection
- Detailed logging and progress reporting
- Backup metadata and restore instructions

**Usage:**
```bash
./scripts/pg-backup.sh [type] [description]
pnpm db:backup                    # Manual backup
pnpm db:backup:auto              # Automated backup
pnpm db:backup:pre-migrate       # Pre-migration backup
```

### 2. pg-restore.sh
Flexible database restoration with various options.

**Features:**
- Support for all pg_dump formats
- Safety confirmations
- Selective restore options (data-only, schema-only)
- Clean restore capability
- Progress reporting

**Usage:**
```bash
./scripts/pg-restore.sh <backup_file> [options]
pnpm db:restore <backup_file>

# Options:
--force         # Skip confirmations
--data-only     # Restore data only
--schema-only   # Restore schema only
--clean         # Drop existing objects first
```

### 3. pg-verify-backup.sh
Verifies backup file integrity and provides information.

**Features:**
- Format detection
- Integrity verification
- Content analysis
- Restore command suggestions

**Usage:**
```bash
./scripts/pg-verify-backup.sh <backup_file>
pnpm db:verify <backup_file>
```

## NPM Scripts

The following scripts are available in the root `package.json`:

```json
{
  "db:backup": "Manual database backup",
  "db:backup:auto": "Automated backup for scripts/cron",
  "db:backup:pre-migrate": "Backup before migrations",
  "db:restore": "Interactive database restore",
  "db:verify": "Verify backup file integrity"
}
```

## Prerequisites

These scripts require PostgreSQL client tools:

### macOS (Homebrew)
```bash
brew install postgresql
```

### Ubuntu/Debian
```bash
sudo apt-get install postgresql-client
```

### Rocky Linux/CentOS/RHEL
```bash
sudo yum install postgresql
```

### Docker
```bash
docker run --rm -v $(pwd):/backup postgres:15 pg_dump --help
```

## Environment Setup

Scripts automatically detect database connection from:
1. `packages/database/prisma/.env`
2. `packages/api/.env`
3. Environment variable `DATABASE_URL`

**Required format:**
```
DATABASE_URL=postgresql://user:password@host:port/database
```

## Backup Formats

### Custom Format (.dump) - Recommended
- Best performance and compression
- Parallel restore support  
- Selective restore capabilities
- **Use case:** Production backups

### SQL Format (.sql)
- Human-readable plain text
- Version control friendly
- Cross-platform compatible
- **Use case:** Development, debugging

### TAR Format (.tar)
- Directory-based structure
- Selective table restore
- Good for large databases
- **Use case:** Advanced restore scenarios

## File Structure

```
backups/postgres/
├── backup_manual_YYYYMMDD_HHMMSS.sql     # Plain SQL
├── backup_manual_YYYYMMDD_HHMMSS.sql.gz  # Compressed SQL  
├── backup_manual_YYYYMMDD_HHMMSS.dump    # Custom format
├── backup_manual_YYYYMMDD_HHMMSS.tar     # TAR format
└── backup_manual_YYYYMMDD_HHMMSS.info    # Backup metadata
```

## Best Practices

### Regular Backups
```bash
# Add to crontab for daily backups at 2 AM
0 2 * * * cd /path/to/project && pnpm db:backup:auto

# Weekly cleanup of old backups
0 3 * * 0 cd /path/to/project && find backups/postgres/ -mtime +7 -delete
```

### Pre-Deployment
```bash
# Always backup before migrations
pnpm db:backup:pre-migrate
pnpm db:migrate

# Rollback if needed
./scripts/pg-restore.sh backups/postgres/backup_pre_migrate_*.dump --clean --force
```

### Testing Restores
```bash
# Verify backup integrity
pnpm db:verify backup_file.dump

# Test restore to development database
./scripts/pg-restore.sh backup_prod.dump --force
```

## Troubleshooting

### Common Issues

1. **Permission denied:**
   ```bash
   chmod +x scripts/pg-*.sh
   ```

2. **PostgreSQL tools not found:**
   ```bash
   # Check if installed
   which pg_dump pg_restore psql
   
   # Install if missing (macOS)
   brew install postgresql
   ```

3. **Database connection failed:**
   - Check DATABASE_URL format
   - Verify database server is running
   - Test connection: `psql $DATABASE_URL -c "SELECT version();"`

4. **Backup file corrupted:**
   ```bash
   # Verify integrity
   pnpm db:verify suspicious_backup.dump
   
   # For custom format
   pg_restore --list backup.dump | head
   ```

### Recovery Scenarios

#### Complete Database Loss
```bash
# 1. Restore latest backup
./scripts/pg-restore.sh backups/postgres/backup_auto_latest.dump --clean --force

# 2. Run migrations
pnpm db:migrate

# 3. Verify application
pnpm dev
```

#### Migration Rollback
```bash
# Restore pre-migration backup
./scripts/pg-restore.sh backups/postgres/backup_pre_migrate_*.dump --clean --force
```

#### Selective Recovery
```bash
# Data only (preserve schema changes)
./scripts/pg-restore.sh backup.dump --data-only --force

# Schema only (structure without data)
./scripts/pg-restore.sh backup.dump --schema-only --force
```

## Security Considerations

1. **Backup Storage:** Store in secure, encrypted locations
2. **Access Control:** Limit script and backup file access
3. **Network Security:** Use SSL for remote databases
4. **Password Security:** Use `.pgpass` or environment variables

## Monitoring

### Backup Health Checks
```bash
# Check recent backups
ls -la backups/postgres/ | head -10

# Verify latest backup
pnpm db:verify $(ls -t backups/postgres/backup_*.dump | head -1)

# Check backup sizes
du -sh backups/postgres/*
```

### Automated Monitoring
```bash
#!/bin/bash
# backup-monitor.sh - Add to cron for daily backup health checks

LATEST_BACKUP=$(ls -t backups/postgres/backup_auto_*.dump 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No automated backups found!"
    exit 1
fi

# Check if backup is less than 25 hours old
if [ $(find "$LATEST_BACKUP" -mtime -1 | wc -l) -eq 0 ]; then
    echo "ERROR: Latest backup is older than 24 hours: $LATEST_BACKUP"
    exit 1
fi

# Verify backup integrity
if ! ./scripts/pg-verify-backup.sh "$LATEST_BACKUP" >/dev/null 2>&1; then
    echo "ERROR: Latest backup failed integrity check: $LATEST_BACKUP"
    exit 1
fi

echo "SUCCESS: Backup health check passed"
```

For detailed usage instructions, see [DATABASE_BACKUP_RESTORE.md](../docs/DATABASE_BACKUP_RESTORE.md).
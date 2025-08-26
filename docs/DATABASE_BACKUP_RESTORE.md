# Database Backup and Restore

This document describes the PostgreSQL backup and restore system for the Happy Bar application.

## Overview

We use PostgreSQL's native `pg_dump` and `pg_restore` utilities for reliable database backups and restores. This approach is more robust than JSON-based backups and provides better performance and consistency.

## Features

- **Multiple backup formats**: SQL, Custom (compressed), and TAR formats
- **Automated compression**: SQL backups are automatically compressed with gzip
- **Flexible restore options**: Data-only, schema-only, or full restore
- **Safety features**: Confirmation prompts and detailed logging
- **Environment integration**: Automatically reads DATABASE_URL from .env files

## Quick Start

### Creating a Backup

```bash
# Manual backup with description
pnpm db:backup

# Automated backup (for scripts/cron jobs)
pnpm db:backup:auto

# Pre-migration backup
pnpm db:backup:pre-migrate

# Custom backup with specific type and description
./scripts/pg-backup.sh production "Before major update"
```

### Restoring a Backup

```bash
# Interactive restore (with confirmation)
pnpm db:restore backups/postgres/backup_manual_20241226_143022.dump

# Force restore (no confirmation prompts)
./scripts/pg-restore.sh backup.dump --force

# Data-only restore (preserve schema changes)
./scripts/pg-restore.sh backup.dump --data-only

# Schema-only restore (structure without data)
./scripts/pg-restore.sh backup.dump --schema-only

# Clean restore (drop existing objects first)
./scripts/pg-restore.sh backup.dump --clean --force
```

## Backup Scripts

### pg-backup.sh

Creates comprehensive database backups in multiple formats.

**Usage:**
```bash
./scripts/pg-backup.sh [type] [description]
```

**Parameters:**
- `type` (optional): Backup type identifier (default: "manual")
- `description` (optional): Backup description (default: "Manual backup")

**Generated Files:**
- `backup_TYPE_TIMESTAMP.sql` - Plain SQL format (human-readable)
- `backup_TYPE_TIMESTAMP.sql.gz` - Compressed SQL format
- `backup_TYPE_TIMESTAMP.dump` - Custom format (recommended for restore)
- `backup_TYPE_TIMESTAMP.tar` - TAR format (good for selective restore)
- `backup_TYPE_TIMESTAMP.info` - Backup metadata and restore instructions

**Example:**
```bash
./scripts/pg-backup.sh production "Before v2.0 deployment"
```

### pg-restore.sh

Restores database backups with various options.

**Usage:**
```bash
./scripts/pg-restore.sh <backup_file> [options]
```

**Options:**
- `--force` - Skip confirmation prompts
- `--data-only` - Restore data only (no schema changes)
- `--schema-only` - Restore schema only (no data)
- `--clean` - Drop existing objects before restoring
- `--help` - Show help message

**Supported Formats:**
- `.dump` (custom format) - **recommended**
- `.tar` (tar format)
- `.sql` (plain SQL)
- `.sql.gz` (compressed SQL)

## Backup Formats Explained

### Custom Format (.dump) - Recommended
- **Best performance** for restore operations
- **Compressed** by default (saves ~70% space)
- **Parallel restore** support
- **Selective restore** capabilities
- **Use case**: Production backups, automated restores

### SQL Format (.sql)
- **Human-readable** plain text
- **Easy to inspect** and modify
- **Version control friendly**
- **Cross-platform** compatible
- **Use case**: Development, debugging, manual inspection

### TAR Format (.tar)
- **Directory-based** structure
- **Selective table restore**
- **Parallel restore** support
- **Good compression** with external tools
- **Use case**: Large databases, selective restores

## NPM Scripts

The following scripts are available in `package.json`:

```json
{
  "scripts": {
    "db:backup": "Manual database backup",
    "db:backup:auto": "Automated backup (for cron jobs)",
    "db:backup:pre-migrate": "Backup before migrations",
    "db:restore": "Interactive database restore"
  }
}
```

## Environment Setup

The scripts automatically detect your database connection from:

1. `packages/database/.env`
2. `DATABASE_URL` environment variable

**Required format:**
```
DATABASE_URL=postgresql://user:password@host:port/database
```

## Best Practices

### Backup Strategy

1. **Regular automated backups**:
   ```bash
   # Daily backup (add to cron)
   0 2 * * * cd /path/to/project && pnpm db:backup:auto
   ```

2. **Pre-deployment backups**:
   ```bash
   pnpm db:backup:pre-migrate
   pnpm db:migrate
   ```

3. **Long-term retention**:
   - Keep daily backups for 7 days
   - Keep weekly backups for 1 month
   - Keep monthly backups for 1 year

### Restore Strategy

1. **Use custom format** for fastest restores
2. **Test restores regularly** in non-production environments
3. **Use `--clean` flag** for complete environment resets
4. **Use `--data-only`** to preserve schema migrations

### Security Considerations

1. **Backup storage**: Store backups in secure, encrypted locations
2. **Access control**: Limit access to backup files and scripts
3. **Password security**: Use `.pgpass` file or environment variables
4. **Network security**: Use SSL connections for remote databases

## Troubleshooting

### Common Issues

1. **Permission denied**:
   ```bash
   chmod +x scripts/pg-backup.sh
   chmod +x scripts/pg-restore.sh
   ```

2. **Database connection failed**:
   - Check DATABASE_URL format
   - Verify database server is running
   - Check network connectivity and firewall rules

3. **Backup file not found**:
   ```bash
   # List available backups
   ls -la backups/postgres/
   ```

4. **Insufficient disk space**:
   - Clean old backups: `find backups/ -name "*.sql.gz" -mtime +7 -delete`
   - Use custom format (more compressed)

### Recovery Scenarios

#### Complete Database Loss
```bash
# 1. Restore from latest backup
./scripts/pg-restore.sh backups/postgres/backup_auto_latest.dump --clean --force

# 2. Run migrations if needed
pnpm db:migrate

# 3. Verify data integrity
pnpm db:studio
```

#### Schema Migration Issues
```bash
# 1. Restore data only (preserve current schema)
./scripts/pg-restore.sh backup_pre_migrate.dump --data-only --force

# 2. Or restore full backup and re-run migrations
./scripts/pg-restore.sh backup_pre_migrate.dump --clean --force
pnpm db:migrate
```

#### Selective Table Restore
```bash
# Using TAR format for selective restore
pg_restore -d database_name -t specific_table backup.tar
```

## Monitoring and Maintenance

### Backup Monitoring
```bash
# Check recent backups
ls -la backups/postgres/ | head -10

# Check backup sizes
du -sh backups/postgres/*

# Verify backup integrity (custom format)
pg_restore --list backup.dump | head -10
```

### Cleanup Scripts
```bash
# Remove backups older than 30 days
find backups/postgres/ -name "backup_*" -mtime +30 -delete

# Keep only the latest 10 manual backups
ls -t backups/postgres/backup_manual_* | tail -n +11 | xargs rm -f
```

## Integration Examples

### CI/CD Pipeline
```yaml
# GitHub Actions example
- name: Backup Database
  run: pnpm db:backup:pre-migrate

- name: Run Migrations
  run: pnpm db:migrate

- name: Test Application
  run: pnpm test

- name: Rollback on Failure
  if: failure()
  run: ./scripts/pg-restore.sh backups/postgres/backup_pre_migrate_*.dump --force
```

### Cron Job Setup
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/happy-bar && pnpm db:backup:auto

# Add weekly cleanup
0 3 * * 0 cd /path/to/happy-bar && find backups/postgres/ -mtime +7 -delete
```

---

For more information, see the individual script help:
- `./scripts/pg-backup.sh --help`
- `./scripts/pg-restore.sh --help`
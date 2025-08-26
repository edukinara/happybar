#!/bin/bash

# PostgreSQL Database Backup Script
# Uses pg_dump to create reliable database backups

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f "packages/database/prisma/.env" ]; then
    export $(cat packages/database/prisma/.env | grep -v '^#' | xargs)
elif [ -f "../packages/database/prisma/.env" ]; then
    export $(cat ../packages/database/prisma/.env | grep -v '^#' | xargs)
elif [ -f "packages/api/.env" ]; then
    export $(cat packages/api/.env | grep -v '^#' | xargs)
elif [ -f "../packages/api/.env" ]; then
    export $(cat ../packages/api/.env | grep -v '^#' | xargs)
fi

# Parse DATABASE_URL to extract components
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not found in environment${NC}"
    exit 1
fi

# Extract database connection details
DB_URL="$DATABASE_URL"
# Remove query parameters
DB_URL_BASE="${DB_URL%%\?*}"
# Extract protocol
PROTOCOL="${DB_URL_BASE%%://*}"
# Remove protocol
URL_WITHOUT_PROTOCOL="${DB_URL_BASE#*://}"
# Extract user:password
USER_PASS="${URL_WITHOUT_PROTOCOL%%@*}"
DB_USER="${USER_PASS%%:*}"
DB_PASS="${USER_PASS#*:}"
# Extract host:port/database
HOST_PORT_DB="${URL_WITHOUT_PROTOCOL#*@}"
HOST_PORT="${HOST_PORT_DB%%/*}"
DB_HOST="${HOST_PORT%%:*}"
DB_PORT="${HOST_PORT#*:}"
DB_NAME="${HOST_PORT_DB#*/}"

# Default port if not specified
if [ -z "$DB_PORT" ] || [ "$DB_PORT" = "$DB_HOST" ]; then
    DB_PORT="5432"
fi

# Create backups directory if it doesn't exist
BACKUP_DIR="./backups/postgres"
mkdir -p "$BACKUP_DIR"

# Generate timestamp for backup file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_TYPE="${1:-manual}"
DESCRIPTION="${2:-Manual backup}"

# Backup filenames
BACKUP_FILE="$BACKUP_DIR/backup_${BACKUP_TYPE}_${TIMESTAMP}.sql"
BACKUP_ARCHIVE="$BACKUP_DIR/backup_${BACKUP_TYPE}_${TIMESTAMP}.tar"
BACKUP_CUSTOM="$BACKUP_DIR/backup_${BACKUP_TYPE}_${TIMESTAMP}.dump"
BACKUP_INFO="$BACKUP_DIR/backup_${BACKUP_TYPE}_${TIMESTAMP}.info"

echo -e "${GREEN}=== PostgreSQL Database Backup ===${NC}"
echo "Host: $DB_HOST:$DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Backup Type: $BACKUP_TYPE"
echo "Description: $DESCRIPTION"
echo ""

# Create backup info file
cat > "$BACKUP_INFO" << EOF
Backup Information
==================
Date: $(date)
Type: $BACKUP_TYPE
Description: $DESCRIPTION
Database: $DB_NAME
Host: $DB_HOST:$DB_PORT
User: $DB_USER

Files Created:
- SQL Format: $(basename $BACKUP_FILE)
- Custom Format: $(basename $BACKUP_CUSTOM)
- TAR Archive: $(basename $BACKUP_ARCHIVE)

Restore Commands:
-----------------
# For SQL format:
psql $DB_NAME < $BACKUP_FILE

# For Custom format (recommended):
pg_restore -d $DB_NAME -c -v $BACKUP_CUSTOM

# For TAR format:
pg_restore -d $DB_NAME -c -v $BACKUP_ARCHIVE
EOF

# Set PGPASSWORD for authentication
export PGPASSWORD="$DB_PASS"

echo -e "${YELLOW}Creating backups...${NC}"

# 1. SQL format backup (plain text, human-readable)
echo "1. Creating SQL format backup..."
pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --no-owner \
    --no-acl \
    --if-exists \
    --clean \
    --create \
    -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ SQL backup created: $BACKUP_FILE${NC}"
    
    # Compress SQL backup
    gzip -c "$BACKUP_FILE" > "${BACKUP_FILE}.gz"
    echo -e "${GREEN}✓ Compressed SQL backup: ${BACKUP_FILE}.gz${NC}"
else
    echo -e "${RED}✗ SQL backup failed${NC}"
fi

# 2. Custom format backup (compressed, best for pg_restore)
echo ""
echo "2. Creating custom format backup..."
pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --no-owner \
    --no-acl \
    --format=custom \
    --compress=9 \
    -f "$BACKUP_CUSTOM"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Custom format backup created: $BACKUP_CUSTOM${NC}"
else
    echo -e "${RED}✗ Custom format backup failed${NC}"
fi

# 3. TAR format backup (good for selective restore)
echo ""
echo "3. Creating TAR format backup..."
pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --no-owner \
    --no-acl \
    --format=tar \
    -f "$BACKUP_ARCHIVE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ TAR format backup created: $BACKUP_ARCHIVE${NC}"
else
    echo -e "${RED}✗ TAR format backup failed${NC}"
fi

# Clear password from environment
unset PGPASSWORD

# Show backup sizes
echo ""
echo -e "${GREEN}=== Backup Complete ===${NC}"
echo "Backup sizes:"
ls -lh "$BACKUP_FILE" 2>/dev/null | awk '{print "  SQL format: " $5 " - " $9}'
ls -lh "${BACKUP_FILE}.gz" 2>/dev/null | awk '{print "  SQL compressed: " $5 " - " $9}'
ls -lh "$BACKUP_CUSTOM" 2>/dev/null | awk '{print "  Custom format: " $5 " - " $9}'
ls -lh "$BACKUP_ARCHIVE" 2>/dev/null | awk '{print "  TAR format: " $5 " - " $9}'

echo ""
echo "Backup info saved to: $BACKUP_INFO"
echo ""
echo -e "${YELLOW}To restore from custom format (recommended):${NC}"
echo "  ./scripts/pg-restore.sh $BACKUP_CUSTOM"
echo ""
echo -e "${YELLOW}To restore from SQL format:${NC}"
echo "  psql $DB_NAME < $BACKUP_FILE"
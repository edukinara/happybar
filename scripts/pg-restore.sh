#!/bin/bash

# PostgreSQL Database Restore Script
# Uses pg_restore to restore database backups

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to show usage
show_usage() {
    echo -e "${BLUE}Usage: $0 <backup_file> [options]${NC}"
    echo ""
    echo "Options:"
    echo "  --force         Skip confirmation prompts"
    echo "  --data-only     Restore data only (no schema changes)"
    echo "  --schema-only   Restore schema only (no data)"
    echo "  --clean         Drop existing objects before restoring"
    echo "  --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 backup.dump"
    echo "  $0 backup.sql --force"
    echo "  $0 backup.dump --data-only --clean"
    echo ""
    echo "Supported formats:"
    echo "  - .dump (custom format) - recommended"
    echo "  - .tar (tar format)"
    echo "  - .sql (plain SQL)"
    echo "  - .sql.gz (compressed SQL)"
}

# Parse command line arguments
BACKUP_FILE=""
FORCE=false
DATA_ONLY=false
SCHEMA_ONLY=false
CLEAN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_usage
            exit 0
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --data-only)
            DATA_ONLY=true
            shift
            ;;
        --schema-only)
            SCHEMA_ONLY=true
            shift
            ;;
        --clean)
            CLEAN=true
            shift
            ;;
        -*)
            echo -e "${RED}Unknown option: $1${NC}"
            show_usage
            exit 1
            ;;
        *)
            if [ -z "$BACKUP_FILE" ]; then
                BACKUP_FILE="$1"
            else
                echo -e "${RED}Multiple backup files specified${NC}"
                show_usage
                exit 1
            fi
            shift
            ;;
    esac
done

# Check if backup file is provided
if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: No backup file specified${NC}"
    show_usage
    exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file does not exist: $BACKUP_FILE${NC}"
    exit 1
fi

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

# Detect backup file format
BACKUP_FORMAT=""
case "$BACKUP_FILE" in
    *.dump)
        BACKUP_FORMAT="custom"
        ;;
    *.tar)
        BACKUP_FORMAT="tar"
        ;;
    *.sql.gz)
        BACKUP_FORMAT="sql_gz"
        ;;
    *.sql)
        BACKUP_FORMAT="sql"
        ;;
    *)
        echo -e "${YELLOW}Warning: Unable to detect format from extension, trying custom format${NC}"
        BACKUP_FORMAT="custom"
        ;;
esac

echo -e "${GREEN}=== PostgreSQL Database Restore ===${NC}"
echo "Host: $DB_HOST:$DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Backup file: $BACKUP_FILE"
echo "Detected format: $BACKUP_FORMAT"
echo "File size: $(ls -lh "$BACKUP_FILE" | awk '{print $5}')"

# Show options
echo ""
echo "Restore options:"
[ "$FORCE" = true ] && echo "  - Force mode enabled (no confirmations)"
[ "$DATA_ONLY" = true ] && echo "  - Data only restore"
[ "$SCHEMA_ONLY" = true ] && echo "  - Schema only restore"
[ "$CLEAN" = true ] && echo "  - Clean existing objects before restore"

# Check for conflicts
if [ "$DATA_ONLY" = true ] && [ "$SCHEMA_ONLY" = true ]; then
    echo -e "${RED}Error: Cannot specify both --data-only and --schema-only${NC}"
    exit 1
fi

# Warning and confirmation
echo ""
if [ "$FORCE" != true ]; then
    echo -e "${RED}⚠️  WARNING: This will modify the database '$DB_NAME'${NC}"
    if [ "$CLEAN" = true ]; then
        echo -e "${RED}⚠️  WARNING: --clean will DROP existing objects before restoring${NC}"
    fi
    echo ""
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Restore cancelled."
        exit 0
    fi
fi

# Set PGPASSWORD for authentication
export PGPASSWORD="$DB_PASS"

# Function to restore custom/tar format
restore_binary() {
    local format="$1"
    local pg_restore_args=()
    
    pg_restore_args+=("-h" "$DB_HOST")
    pg_restore_args+=("-p" "$DB_PORT")
    pg_restore_args+=("-U" "$DB_USER")
    pg_restore_args+=("-d" "$DB_NAME")
    pg_restore_args+=("--verbose")
    pg_restore_args+=("--no-owner")
    pg_restore_args+=("--no-acl")
    
    # Add conditional flags
    [ "$CLEAN" = true ] && pg_restore_args+=("--clean" "--if-exists")
    [ "$DATA_ONLY" = true ] && pg_restore_args+=("--data-only")
    [ "$SCHEMA_ONLY" = true ] && pg_restore_args+=("--schema-only")
    
    pg_restore_args+=("$BACKUP_FILE")
    
    echo -e "${YELLOW}Running pg_restore...${NC}"
    echo "Command: pg_restore ${pg_restore_args[*]}"
    echo ""
    
    pg_restore "${pg_restore_args[@]}"
}

# Function to restore SQL format
restore_sql() {
    local sql_file="$1"
    
    echo -e "${YELLOW}Running psql to restore SQL backup...${NC}"
    echo "Command: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $sql_file"
    echo ""
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$sql_file"
}

# Execute restore based on format
echo -e "${YELLOW}Starting restore...${NC}"
echo ""

case "$BACKUP_FORMAT" in
    "custom"|"tar")
        restore_binary "$BACKUP_FORMAT"
        ;;
    "sql")
        if [ "$DATA_ONLY" = true ] || [ "$SCHEMA_ONLY" = true ]; then
            echo -e "${YELLOW}Warning: --data-only and --schema-only options are ignored for SQL format${NC}"
        fi
        restore_sql "$BACKUP_FILE"
        ;;
    "sql_gz")
        if [ "$DATA_ONLY" = true ] || [ "$SCHEMA_ONLY" = true ]; then
            echo -e "${YELLOW}Warning: --data-only and --schema-only options are ignored for compressed SQL format${NC}"
        fi
        echo -e "${YELLOW}Decompressing and restoring...${NC}"
        zcat "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
        ;;
    *)
        echo -e "${RED}Error: Unsupported backup format${NC}"
        exit 1
        ;;
esac

# Check if restore was successful
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Database restore completed successfully!${NC}"
    
    # Show some basic stats
    echo ""
    echo -e "${BLUE}Database statistics after restore:${NC}"
    
    # Get table count and row counts
    SQL_STATS="SELECT schemaname, tablename, n_tup_ins as inserts FROM pg_stat_user_tables ORDER BY n_tup_ins DESC LIMIT 10;"
    
    echo "Top 10 tables by insert count:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$SQL_STATS" 2>/dev/null || echo "  (Statistics not available)"
    
else
    echo ""
    echo -e "${RED}✗ Database restore failed!${NC}"
    echo "Check the error messages above for details."
    exit 1
fi

# Clear password from environment
unset PGPASSWORD

echo ""
echo -e "${GREEN}Restore completed!${NC}"

# Show next steps
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Verify your application connects successfully"
echo "2. Run any necessary migrations: pnpm prisma migrate deploy"
echo "3. Generate Prisma client: pnpm prisma generate"
echo "4. Test critical functionality"
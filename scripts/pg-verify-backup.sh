#!/bin/bash

# PostgreSQL Backup Verification Script
# Verifies backup file integrity and provides information

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to show usage
show_usage() {
    echo -e "${BLUE}Usage: $0 <backup_file>${NC}"
    echo ""
    echo "Verifies backup file integrity and displays information."
    echo ""
    echo "Supported formats:"
    echo "  - .dump (custom format)"
    echo "  - .tar (tar format)" 
    echo "  - .sql (plain SQL)"
    echo "  - .sql.gz (compressed SQL)"
    echo ""
    echo "Examples:"
    echo "  $0 backup.dump"
    echo "  $0 backup.sql.gz"
}

# Check if backup file is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: No backup file specified${NC}"
    show_usage
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file does not exist: $BACKUP_FILE${NC}"
    exit 1
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
        echo -e "${YELLOW}Warning: Unable to detect format from extension${NC}"
        BACKUP_FORMAT="unknown"
        ;;
esac

echo -e "${GREEN}=== Backup Verification ===${NC}"
echo "File: $BACKUP_FILE"
echo "Format: $BACKUP_FORMAT"
echo "Size: $(ls -lh "$BACKUP_FILE" | awk '{print $5}')"
echo "Modified: $(ls -l "$BACKUP_FILE" | awk '{print $6, $7, $8}')"
echo ""

# Verify based on format
case "$BACKUP_FORMAT" in
    "custom"|"tar")
        echo -e "${YELLOW}Verifying backup contents...${NC}"
        
        # List backup contents
        if command -v pg_restore >/dev/null 2>&1; then
            echo "Backup contains the following objects:"
            echo ""
            
            # Get table of contents
            pg_restore --list "$BACKUP_FILE" 2>/dev/null | head -20
            
            if [ $(pg_restore --list "$BACKUP_FILE" 2>/dev/null | wc -l) -gt 20 ]; then
                echo "... (showing first 20 objects, use 'pg_restore --list $BACKUP_FILE' for full list)"
            fi
            
            echo ""
            
            # Count objects by type
            echo "Object counts:"
            pg_restore --list "$BACKUP_FILE" 2>/dev/null | awk '{print $1}' | sort | uniq -c | sort -nr
            
            echo ""
            echo -e "${GREEN}✓ Backup file appears to be valid${NC}"
        else
            echo -e "${YELLOW}Warning: pg_restore not found, cannot verify contents${NC}"
        fi
        ;;
        
    "sql")
        echo -e "${YELLOW}Verifying SQL file...${NC}"
        
        # Basic SQL file validation
        if head -n 5 "$BACKUP_FILE" | grep -q "PostgreSQL database dump" 2>/dev/null; then
            echo -e "${GREEN}✓ Valid PostgreSQL SQL dump file${NC}"
        else
            echo -e "${YELLOW}Warning: File may not be a PostgreSQL dump${NC}"
        fi
        
        # Count statements
        echo ""
        echo "SQL statement counts:"
        grep -c "^CREATE TABLE" "$BACKUP_FILE" 2>/dev/null | awk '{print "  CREATE TABLE: " $1}' || echo "  CREATE TABLE: 0"
        grep -c "^CREATE INDEX" "$BACKUP_FILE" 2>/dev/null | awk '{print "  CREATE INDEX: " $1}' || echo "  CREATE INDEX: 0"
        grep -c "^INSERT INTO" "$BACKUP_FILE" 2>/dev/null | awk '{print "  INSERT INTO: " $1}' || echo "  INSERT INTO: 0"
        grep -c "^COPY" "$BACKUP_FILE" 2>/dev/null | awk '{print "  COPY: " $1}' || echo "  COPY: 0"
        
        echo ""
        echo -e "${GREEN}✓ SQL file appears to be valid${NC}"
        ;;
        
    "sql_gz")
        echo -e "${YELLOW}Verifying compressed SQL file...${NC}"
        
        # Test gzip file integrity
        if gzip -t "$BACKUP_FILE" 2>/dev/null; then
            echo -e "${GREEN}✓ Gzip file integrity check passed${NC}"
        else
            echo -e "${RED}✗ Gzip file appears to be corrupted${NC}"
            exit 1
        fi
        
        # Check if it's a PostgreSQL dump
        if zcat "$BACKUP_FILE" | head -n 5 | grep -q "PostgreSQL database dump" 2>/dev/null; then
            echo -e "${GREEN}✓ Valid compressed PostgreSQL SQL dump${NC}"
        else
            echo -e "${YELLOW}Warning: File may not be a PostgreSQL dump${NC}"
        fi
        
        # Count statements
        echo ""
        echo "SQL statement counts:"
        zcat "$BACKUP_FILE" | grep -c "^CREATE TABLE" 2>/dev/null | awk '{print "  CREATE TABLE: " $1}' || echo "  CREATE TABLE: 0"
        zcat "$BACKUP_FILE" | grep -c "^CREATE INDEX" 2>/dev/null | awk '{print "  CREATE INDEX: " $1}' || echo "  CREATE INDEX: 0"
        zcat "$BACKUP_FILE" | grep -c "^INSERT INTO" 2>/dev/null | awk '{print "  INSERT INTO: " $1}' || echo "  INSERT INTO: 0"
        zcat "$BACKUP_FILE" | grep -c "^COPY" 2>/dev/null | awk '{print "  COPY: " $1}' || echo "  COPY: 0"
        
        echo ""
        echo -e "${GREEN}✓ Compressed SQL file appears to be valid${NC}"
        ;;
        
    *)
        echo -e "${YELLOW}Cannot verify unknown format${NC}"
        
        # Try to detect file type
        if command -v file >/dev/null 2>&1; then
            echo "File type detection:"
            file "$BACKUP_FILE"
        fi
        ;;
esac

# Show restore command suggestions
echo ""
echo -e "${BLUE}=== Restore Commands ===${NC}"

case "$BACKUP_FORMAT" in
    "custom"|"tar")
        echo "# Full restore (recommended):"
        echo "./scripts/pg-restore.sh $BACKUP_FILE"
        echo ""
        echo "# Force restore (no prompts):"
        echo "./scripts/pg-restore.sh $BACKUP_FILE --force"
        echo ""
        echo "# Clean restore (drop existing objects):"
        echo "./scripts/pg-restore.sh $BACKUP_FILE --clean --force"
        ;;
    "sql")
        echo "# Restore SQL file:"
        echo "psql database_name < $BACKUP_FILE"
        echo ""
        echo "# Or use the restore script:"
        echo "./scripts/pg-restore.sh $BACKUP_FILE"
        ;;
    "sql_gz")
        echo "# Restore compressed SQL file:"
        echo "zcat $BACKUP_FILE | psql database_name"
        echo ""
        echo "# Or use the restore script:"
        echo "./scripts/pg-restore.sh $BACKUP_FILE"
        ;;
esac

echo ""
echo -e "${GREEN}Verification complete!${NC}"
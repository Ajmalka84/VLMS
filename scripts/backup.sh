#!/usr/bin/env bash
# ==============================================================================
#                 VLMS AUTOMATED POSTGRESQL BACKUP SCRIPT
# ==============================================================================
# Retention Policy: 90 Days rolling daily backups
# Usage:
#   bash scripts/backup.sh
# Automated Cron Setup (every night at 2:00 AM):
#   0 2 * * * cd /path/to/VLMS && bash scripts/backup.sh >> /var/log/vlms_backup.log 2>&1
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${ROOT_DIR}/backups"
RETENTION_DAYS=90

# Ensure backups directory exists
mkdir -p "$BACKUP_DIR"

# Load environment configuration (production preferred, fallback to .env)
if [ -f "${ROOT_DIR}/.env.production" ]; then
    # shellcheck disable=SC1091
    source "${ROOT_DIR}/.env.production"
    COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
elif [ -f "${ROOT_DIR}/.env" ]; then
    # shellcheck disable=SC1091
    source "${ROOT_DIR}/.env"
    COMPOSE_FILE="${ROOT_DIR}/docker-compose.yml"
else
    echo "❌ Error: Neither .env.production nor .env found in ${ROOT_DIR}"
    exit 1
fi

DB_USER="${POSTGRES_USER:-vlms}"
DB_NAME="${POSTGRES_DB:-vlms}"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/vlms_${DB_NAME}_${TIMESTAMP}.dump"

echo "=================================================================="
echo "📦 Starting VLMS Database Backup [$(date '+%Y-%m-%d %H:%M:%S')]"
echo "Database : ${DB_NAME}"
echo "User     : ${DB_USER}"
echo "Target   : ${BACKUP_FILE}"
echo "=================================================================="

# Check if docker daemon is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Error: Docker daemon is not running."
    exit 1
fi

# Execute pg_dump directly inside the postgres container
if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$BACKUP_FILE"; then
    BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    echo "✅ Backup completed successfully! (Size: ${BACKUP_SIZE})"
else
    echo "❌ Error: pg_dump failed during execution."
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Rotate backups: Delete archives older than 90 days
echo "🧹 Applying ${RETENTION_DAYS}-day retention policy..."
DELETED_COUNT=$(find "$BACKUP_DIR" -type f -name "*.dump" -mtime +"$RETENTION_DAYS" | wc -l | tr -d ' ')

if [ "$DELETED_COUNT" -gt 0 ]; then
    find "$BACKUP_DIR" -type f -name "*.dump" -mtime +"$RETENTION_DAYS" -delete
    echo "🗑️  Purged ${DELETED_COUNT} old backup(s) older than ${RETENTION_DAYS} days."
else
    echo "ℹ️  No backups older than ${RETENTION_DAYS} days found to purge."
fi

# Print storage status summary
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -type f -name "*.dump" | wc -l | tr -d ' ')
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | awk '{print $1}')

echo "------------------------------------------------------------------"
echo "📊 Current Backup Status:"
echo "   Total Backups Stored : ${TOTAL_BACKUPS} files (Retained up to ${RETENTION_DAYS} days)"
echo "   Total Disk Used      : ${TOTAL_SIZE}"
echo "=================================================================="

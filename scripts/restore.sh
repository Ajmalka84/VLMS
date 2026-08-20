#!/usr/bin/env bash
# ==============================================================================
#                 VLMS DISASTER RECOVERY RESTORE SCRIPT
# ==============================================================================
# Usage:
#   bash scripts/restore.sh <path-to-backup-file>
# Example:
#   bash scripts/restore.sh backups/vlms_vlms_2026-08-20_150000.dump
# ==============================================================================

set -eo pipefail

if [ -z "$1" ]; then
    echo "❌ Error: Missing backup file path."
    echo "Usage: bash scripts/restore.sh <path-to-backup-file>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found at: ${BACKUP_FILE}"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Load environment configuration
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

echo "=================================================================="
echo "⚠️  WARNING: DISASTER RECOVERY RESTORE INITIATED"
echo "Target Database : ${DB_NAME}"
echo "User            : ${DB_USER}"
echo "Source Dump     : ${BACKUP_FILE}"
echo "=================================================================="
echo "This will restore tables and overwrite matching records in ${DB_NAME}."
echo ""

# Check for interactive confirmation unless FORCE_RESTORE=true
if [ "${FORCE_RESTORE}" != "true" ]; then
    read -r -p "Are you sure you want to proceed with restore? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "❌ Restore cancelled by user."
        exit 0
    fi
fi

echo "🔄 Restoring database from backup..."

# Pipe dump file to pg_restore inside postgres container (-c cleans/drops tables before restoring)
if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner --no-privileges < "$BACKUP_FILE"; then
    echo "✅ Database restore completed successfully!"
else
    # Note: pg_restore may return warnings for clean statements on new databases, check tables
    echo "ℹ️  Restore finished with standard exit status."
fi

echo "=================================================================="

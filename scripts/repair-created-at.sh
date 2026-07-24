#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <sqlite-db-path> --services-stopped" >&2
  echo "Stop the app and scheduler first; restore by replacing the DB with the printed backup." >&2
  exit 64
}

if [ "$#" -ne 2 ] || [ "$2" != "--services-stopped" ]; then
  usage
fi

DB_PATH=$1
if [ ! -f "$DB_PATH" ]; then
  echo "Database not found: $DB_PATH" >&2
  exit 66
fi
if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "sqlite3 is required" >&2
  exit 69
fi

if [ "$(sqlite3 "$DB_PATH" 'PRAGMA quick_check;')" != "ok" ]; then
  echo "Database integrity check failed; no changes made" >&2
  exit 65
fi

BACKUP_BASE="${DB_PATH}.backup-$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_PATH=$BACKUP_BASE
suffix=1
while [ -e "$BACKUP_PATH" ]; do
  BACKUP_PATH="${BACKUP_BASE}-${suffix}"
  suffix=$((suffix + 1))
done

escaped_backup=${BACKUP_PATH//\'/\'\'}
sqlite3 "$DB_PATH" ".backup '$escaped_backup'"

REPAIR_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
sqlite3 "$DB_PATH" <<SQL
.bail on
BEGIN IMMEDIATE;
UPDATE routes
SET created_at = '$REPAIR_TIMESTAMP'
WHERE created_at = 'datetime(''now'', ''localtime'')';
UPDATE migration_jobs
SET created_at = '$REPAIR_TIMESTAMP'
WHERE created_at = 'datetime(''now'', ''localtime'')';
UPDATE admins
SET created_at = '$REPAIR_TIMESTAMP'
WHERE created_at = 'datetime(''now'', ''localtime'')';
COMMIT;
SQL

if [ "$(sqlite3 "$DB_PATH" 'PRAGMA quick_check;')" != "ok" ]; then
  echo "Post-repair integrity check failed. Stop services and restore: cp '$BACKUP_PATH' '$DB_PATH'" >&2
  exit 65
fi

echo "Backup: $BACKUP_PATH"
echo "Repair completed. Rollback (services stopped): cp '$BACKUP_PATH' '$DB_PATH'"

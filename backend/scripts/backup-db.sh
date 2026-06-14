#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-backups}"
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-tour_crm}"

timestamp=$(date +%Y%m%d%H%M%S)
mkdir -p "$BACKUP_DIR"
backup_file="$BACKUP_DIR/$DB_NAME-$timestamp.sql"

echo "Running mysqldump for $DB_NAME -> $backup_file"
mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$backup_file"

if [ $? -eq 0 ]; then
  echo "Backup saved to $backup_file"
else
  echo "Backup failed" >&2
  exit 1
fi

#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/sfxc-activity-request}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/sfxc-activity-request}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE_NAME="sfxc-activity-request-${TIMESTAMP}.tar.gz"
ARCHIVE_PATH="${BACKUP_DIR}/${ARCHIVE_NAME}"

if [ ! -d "$APP_DIR" ]; then
  echo "App directory not found: $APP_DIR" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

cd "$APP_DIR"

BACKUP_ITEMS=()

if [ -f "dev.db" ]; then
  BACKUP_ITEMS+=("dev.db")
fi

if [ -d "public/uploads" ]; then
  BACKUP_ITEMS+=("public/uploads")
fi

if [ -f ".env" ]; then
  BACKUP_ITEMS+=(".env")
fi

if [ "${#BACKUP_ITEMS[@]}" -eq 0 ]; then
  echo "Nothing to back up in $APP_DIR" >&2
  exit 1
fi

tar -czf "$ARCHIVE_PATH" "${BACKUP_ITEMS[@]}"
chmod 600 "$ARCHIVE_PATH"

find "$BACKUP_DIR" -type f -name "sfxc-activity-request-*.tar.gz" -mtime "+${RETENTION_DAYS}" -delete

echo "Backup created: $ARCHIVE_PATH"

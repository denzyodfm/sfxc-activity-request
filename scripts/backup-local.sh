#!/usr/bin/env bash
# Timestamped local backup: source, git history, database, uploads, .env.
# Usage:  bash scripts/backup-local.sh
# Each run creates backups/<YYYYMMDD-HHMMSS>/ and never overwrites a previous run.
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
TS="$(date +%Y%m%d-%H%M%S)"
DEST="$APP_DIR/backups/$TS"

cd "$APP_DIR"
mkdir -p "$DEST/database" "$DEST/env"
echo "==> Backup destination: $DEST"

echo "==> Archiving application source..."
tar -czf "$DEST/app-source.tar.gz" \
  --exclude='./node_modules' --exclude='./.next' --exclude='./backups' \
  --exclude='./.git' --exclude='./tsconfig.tsbuildinfo' .

echo "==> Bundling git history..."
git bundle create "$DEST/repo.bundle" --all 2>/dev/null

# MySQL dump, if DATABASE_URL points at mysql. Requires mysqldump on PATH or MYSQLDUMP set.
DB_URL="$(grep -E '^DATABASE_URL=' .env 2>/dev/null | sed 's/^DATABASE_URL="//; s/"$//' || true)"
if [[ "$DB_URL" == mysql://* ]]; then
  echo "==> Dumping MySQL database..."
  MYSQLDUMP="${MYSQLDUMP:-/c/xampp/mysql/bin/mysqldump.exe}"
  proto="${DB_URL#mysql://}"
  creds="${proto%%@*}"; hostpart="${proto#*@}"
  DB_USER="${creds%%:*}"; DB_PASS="${creds#*:}"
  hostport="${hostpart%%/*}"; DB_NAME="${hostpart#*/}"; DB_NAME="${DB_NAME%%\?*}"
  DB_HOST="${hostport%%:*}"; DB_PORT="${hostport#*:}"
  [ "$DB_PORT" = "$DB_HOST" ] && DB_PORT=3306
  if [ -x "$MYSQLDUMP" ] || command -v "$MYSQLDUMP" >/dev/null 2>&1; then
    "$MYSQLDUMP" -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" -P "$DB_PORT" \
      --protocol=TCP --single-transaction --routines --triggers --default-character-set=utf8mb4 \
      "$DB_NAME" > "$DEST/database/$DB_NAME.sql"
    echo "    wrote database/$DB_NAME.sql"
  else
    echo "    WARNING: mysqldump not found at $MYSQLDUMP — database NOT dumped." >&2
  fi
fi

# Legacy SQLite file, if still present.
if [ -f prisma/dev.db ]; then
  echo "==> Copying legacy SQLite database..."
  cp prisma/dev.db "$DEST/database/dev.db"
fi

if [ -d public/uploads ]; then
  echo "==> Archiving uploads..."
  tar -czf "$DEST/uploads.tar.gz" -C public uploads
fi

echo "==> Copying .env (contains DB password and SESSION_SECRET)..."
cp .env "$DEST/env/.env"

echo "==> Writing checksums..."
( cd "$DEST" && find . -type f ! -name 'manifest.sha256' -exec sha256sum {} \; > manifest.sha256 )

echo "==> Done: $DEST"

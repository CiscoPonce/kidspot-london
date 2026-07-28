#!/bin/bash
# KidSpot London — Daily PostgreSQL Backup
set -euo pipefail

ROOT="${ROOT:-/home/ubuntu/kidspot}"
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M)
DUMP_FILE="${BACKUP_DIR}/kidspot_${DATE}.dump"

source "$ROOT/.env"
mkdir -p "$BACKUP_DIR"
cd "$ROOT"

echo "[$(date -Iseconds)] Starting backup..."

docker compose exec -T -e PGPASSWORD="${DB_PASSWORD}" postgres \
  pg_dump -h localhost -U kidspot_admin -Fc kidspot > "$DUMP_FILE"

SIZE=$(du -h "$DUMP_FILE" | cut -f1)
echo "[$(date -Iseconds)] Backup complete: ${DUMP_FILE} - ${SIZE}"

if [ -n "${R2_ACCOUNT_ID:-}" ] && [ -n "${R2_ACCESS_KEY_ID:-}" ] && [ -n "${R2_SECRET_ACCESS_KEY:-}" ] && [ -n "${R2_BUCKET_NAME:-}" ]; then
  echo "[$(date -Iseconds)] Uploading to Cloudflare R2..."
  AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" aws s3 cp "$DUMP_FILE" "s3://${R2_BUCKET_NAME}/kidspot_${DATE}.dump" --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
  
  echo "[$(date -Iseconds)] Cleaning up R2 backups older than 30 days..."
  OLD_DATE=$(date -d "30 days ago" -u +"%Y-%m-%dT%H:%M:%SZ")
  OLD_FILES=$(AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" aws s3api list-objects-v2 --bucket "${R2_BUCKET_NAME}" --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" --query "Contents[?LastModified<='${OLD_DATE}'].Key" --output text)
  if [ -n "$OLD_FILES" ] && [ "$OLD_FILES" != "None" ]; then
    for f in $OLD_FILES; do
      AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" aws s3 rm "s3://${R2_BUCKET_NAME}/$f" --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    done
  fi
fi

DELETED=$(find "$BACKUP_DIR" -name "kidspot_*.dump" -mtime +30 -print -delete | wc -l)
echo "[$(date -Iseconds)] Cleaned up ${DELETED} old local backups"
echo "[$(date -Iseconds)] Done."

#!/usr/bin/env bash
# Nightly QPM backup: application database, licence database and MinIO files.
#
#   BACKUP_DIR        where backups are kept            (default: ~/qpm-backups)
#   RETENTION_DAYS    days of backups to keep           (default: 14)
#   BACKUP_RSYNC_TARGET  optional off-server copy, e.g. backup@host:/srv/qpm (needs SSH key auth)
#
# Each run creates BACKUP_DIR/qpm-YYYYmmdd-HHMMSS/ with:
#   atlas.dump, licenses.dump (pg_dump custom format, verified with pg_restore -l),
#   minio.tar.gz (MinIO volume, read-only mount), SHA256SUMS, and updates BACKUP_DIR/last-success.
# Restore: see ops/backup/RESTORE.md. Exit code is non-zero on any failure.
set -euo pipefail
umask 077

BACKUP_DIR="${BACKUP_DIR:-$HOME/qpm-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
APP_DB_CONTAINER="${APP_DB_CONTAINER:-atlas_db}"
APP_DB_NAME="${APP_DB_NAME:-atlas}"
LICENSE_DB_CONTAINER="${LICENSE_DB_CONTAINER:-license-authority-license-db-1}"
MINIO_VOLUME="${MINIO_VOLUME:-atlas-cmms_minio_data}"
TOOL_IMAGE="${TOOL_IMAGE:-postgres:16-alpine}"   # already present on the host; provides tar and gzip

log() { printf '%s %s\n' "$(date -Is)" "$*"; }
fail() { log "ERROR: $*"; exit 1; }

[[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] && (( RETENTION_DAYS >= 1 )) || fail "RETENTION_DAYS must be a positive integer"
mkdir -p "$BACKUP_DIR"
run_dir="$BACKUP_DIR/qpm-$(date +%Y%m%d-%H%M%S)"
mkdir "$run_dir"
trap 'log "backup failed; partial files left in $run_dir for inspection"' ERR

dump_db() { # container database-expression output
  local container="$1" database="$2" output="$3"
  docker exec "$container" sh -c "pg_dump -U \"\$POSTGRES_USER\" -d $database -Fc" > "$output"
  [[ -s "$output" ]] || fail "empty dump from $container"
  docker exec -i "$container" pg_restore -l < "$output" > /dev/null || fail "unreadable dump from $container"
  log "dumped $container ($(du -h "$output" | cut -f1))"
}

dump_db "$APP_DB_CONTAINER" "$APP_DB_NAME" "$run_dir/atlas.dump"
if docker inspect "$LICENSE_DB_CONTAINER" > /dev/null 2>&1; then
  dump_db "$LICENSE_DB_CONTAINER" '"$POSTGRES_DB"' "$run_dir/licenses.dump"
else
  log "WARNING: licence database container $LICENSE_DB_CONTAINER not found; skipped"
fi

# MinIO's own scratch area (.minio.sys/tmp: uploads in progress, trash) is not data and changes constantly.
docker run --rm --network none -v "$MINIO_VOLUME:/data:ro" --entrypoint tar "$TOOL_IMAGE" \
  --exclude=./.minio.sys/tmp -czf - -C /data . > "$run_dir/minio.tar.gz"
gzip -t "$run_dir/minio.tar.gz" || fail "corrupt MinIO archive"
log "archived MinIO volume ($(du -h "$run_dir/minio.tar.gz" | cut -f1))"

( cd "$run_dir" && sha256sum -- * > SHA256SUMS )

if [[ -n "${BACKUP_RSYNC_TARGET:-}" ]]; then
  rsync -a --partial "$run_dir" "$BACKUP_RSYNC_TARGET/" || fail "off-server copy to $BACKUP_RSYNC_TARGET failed"
  log "copied to $BACKUP_RSYNC_TARGET"
fi

# Retention: only directories this script created (qpm-YYYYmmdd-HHMMSS) directly under BACKUP_DIR.
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -regextype posix-extended \
  -regex '.*/qpm-[0-9]{8}-[0-9]{6}' -mtime +"$RETENTION_DAYS" -print0 |
  while IFS= read -r -d '' old; do rm -r -- "$old"; log "removed expired $old"; done

date -Is > "$BACKUP_DIR/last-success"
log "backup complete: $run_dir"

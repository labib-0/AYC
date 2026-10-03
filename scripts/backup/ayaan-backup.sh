#!/usr/bin/env bash
# ==============================================================================
# Ayaan Clothing Production Backup System
# ==============================================================================
set -euo pipefail

BACKUP_ROOT="/var/backups/ayaan"
LOG_FILE="/var/log/ayaan-backup.log"
LOCK_FILE="/var/run/ayaan-backup.lock"
DB_NAME="ayaan_production"
SCRIPT_VERSION="1.0.0"
RETENTION_DAYS=14
MIN_DISK_FREE_MB=2000

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
DATE_STAMP=$(date +"%Y-%m-%d")

log() {
    local msg="[$(date +'%Y-%m-%d %H:%M:%S UTC')] $1"
    echo "$msg"
    echo "$msg" >> "$LOG_FILE"
}

log_error() {
    local msg="[$(date +'%Y-%m-%d %H:%M:%S UTC')] ERROR: $1"
    echo "$msg" >&2
    echo "$msg" >> "$LOG_FILE"
}

# 1. Concurrency Lock
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
    log "Backup skipped: Another backup process is already running."
    exit 0
fi

START_TIME=$(date +%s)
log "=================================================="
log "Starting Ayaan Clothing Production Backup (v${SCRIPT_VERSION})"
log "Timestamp: ${TIMESTAMP}"

# 2. Pre-flight Disk Space Safety Check
log "Performing pre-flight checks..."
AVAIL_DISK_MB=$(df -m "$BACKUP_ROOT" | awk 'NR==2 {print $4}')
if [ "$AVAIL_DISK_MB" -lt "$MIN_DISK_FREE_MB" ]; then
    log_error "Insufficient disk space on backup filesystem (${AVAIL_DISK_MB}MB available, ${MIN_DISK_FREE_MB}MB required). Aborting backup."
    exit 1
fi
log "Disk space check passed (${AVAIL_DISK_MB}MB available)."

for cmd in psql pg_dump pg_dumpall pg_restore tar sha256sum gzip; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        log_error "Required command '$cmd' is missing. Aborting."
        exit 1
    fi
done

mkdir -p "${BACKUP_ROOT}/database" "${BACKUP_ROOT}/media" "${BACKUP_ROOT}/config" "${BACKUP_ROOT}/manifests" "${BACKUP_ROOT}/logs"
chmod 700 "${BACKUP_ROOT}" "${BACKUP_ROOT}/"*

GIT_SHA=$(cd /var/www/ayaan && git rev-parse HEAD 2>/dev/null || echo "unknown")
PG_VERSION=$(su - postgres -c "psql -t -c 'SHOW server_version;'" 2>/dev/null | tr -d '[:space:]' || echo "unknown")
HOST_NAME=$(hostname)

log "Metadata: Host=${HOST_NAME}, GitSHA=${GIT_SHA}, PostgreSQL=${PG_VERSION}"

# 3. Database Backup (PostgreSQL Custom Format + Globals)
log "Starting PostgreSQL database backup..."
DB_DUMP_FILE="${BACKUP_ROOT}/database/ayaan_production_${TIMESTAMP}.dump"
GLOBALS_FILE="${BACKUP_ROOT}/database/ayaan_globals_${TIMESTAMP}.sql"

if ! su - postgres -c "pg_dump -Fc -d ${DB_NAME}" > "${DB_DUMP_FILE}"; then
    log_error "Database dump failed for ${DB_NAME}. Aborting."
    rm -f "${DB_DUMP_FILE}"
    exit 1
fi

if ! su - postgres -c "pg_dumpall --globals-only" > "${GLOBALS_FILE}"; then
    log_error "PostgreSQL globals dump failed. Aborting."
    rm -f "${GLOBALS_FILE}"
    exit 1
fi

chmod 600 "${DB_DUMP_FILE}" "${GLOBALS_FILE}"

if [ ! -s "${DB_DUMP_FILE}" ]; then
    log_error "Database dump file is empty: ${DB_DUMP_FILE}"
    exit 1
fi

log "Verifying database dump structural integrity..."
if ! pg_restore -l "${DB_DUMP_FILE}" > /dev/null; then
    log_error "pg_restore validation failed for ${DB_DUMP_FILE}. Dump is corrupted."
    exit 1
fi

DB_DUMP_SIZE=$(stat -c %s "${DB_DUMP_FILE}")
DB_DUMP_SHA256=$(sha256sum "${DB_DUMP_FILE}" | awk '{print $1}')
GLOBALS_SIZE=$(stat -c %s "${GLOBALS_FILE}")
GLOBALS_SHA256=$(sha256sum "${GLOBALS_FILE}" | awk '{print $1}')
log "PostgreSQL backup verified: size=${DB_DUMP_SIZE}B, sha256=${DB_DUMP_SHA256}"

# 4. Media Storage Backup
log "Starting Laravel persistent media backup..."
MEDIA_SOURCE="/var/www/ayaan/backend/storage/app/public"
MEDIA_FILE="${BACKUP_ROOT}/media/ayaan_media_${TIMESTAMP}.tar.gz"

if [ ! -d "$MEDIA_SOURCE" ]; then
    log_error "Media source directory does not exist: ${MEDIA_SOURCE}"
    exit 1
fi

if ! tar -czf "${MEDIA_FILE}" -C /var/www/ayaan/backend/storage/app public; then
    log_error "Failed to create media archive."
    exit 1
fi

chmod 600 "${MEDIA_FILE}"

if ! tar -tzf "${MEDIA_FILE}" > /dev/null; then
    log_error "Media archive verification failed. Archive is corrupt."
    exit 1
fi

MEDIA_FILE_SIZE=$(stat -c %s "${MEDIA_FILE}")
MEDIA_FILE_SHA256=$(sha256sum "${MEDIA_FILE}" | awk '{print $1}')
MEDIA_FILE_COUNT=$(tar -tzf "${MEDIA_FILE}" | grep -v '/$' | wc -l)
log "Media backup verified: size=${MEDIA_FILE_SIZE}B, files=${MEDIA_FILE_COUNT}, sha256=${MEDIA_FILE_SHA256}"

# 5. Configuration & Non-Source Metadata Backup
log "Starting configuration and environment backup..."
CONFIG_FILE="${BACKUP_ROOT}/config/ayaan_config_${TIMESTAMP}.tar.gz"
STAGE_DIR="$(mktemp -d /tmp/ayaan_backup_stage.XXXXXX)"

mkdir -p "${STAGE_DIR}/nginx" "${STAGE_DIR}/supervisor" "${STAGE_DIR}/pm2" "${STAGE_DIR}/env" "${STAGE_DIR}/system"

cp -r /etc/nginx/sites-available "${STAGE_DIR}/nginx/" 2>/dev/null || true
cp -r /etc/nginx/conf.d "${STAGE_DIR}/nginx/" 2>/dev/null || true
cp -r /etc/supervisor/conf.d "${STAGE_DIR}/supervisor/" 2>/dev/null || true

if [ -f /home/ayaan/.pm2/dump.pm2 ]; then
    cp /home/ayaan/.pm2/dump.pm2 "${STAGE_DIR}/pm2/"
fi

for envfile in /var/www/ayaan/.env.production /var/www/ayaan/.env.local /var/www/ayaan/backend/.env; do
    if [ -f "$envfile" ]; then
        cp "$envfile" "${STAGE_DIR}/env/$(basename $envfile).$(basename $(dirname $envfile))"
    fi
done

ufw status verbose > "${STAGE_DIR}/system/ufw_status.txt" 2>/dev/null || true
dpkg -l > "${STAGE_DIR}/system/installed_packages.txt" 2>/dev/null || true
echo "Host: ${HOST_NAME}" > "${STAGE_DIR}/system/system_info.txt"
echo "Date: $(date)" >> "${STAGE_DIR}/system/system_info.txt"
echo "Git SHA: ${GIT_SHA}" >> "${STAGE_DIR}/system/system_info.txt"
echo "PostgreSQL: ${PG_VERSION}" >> "${STAGE_DIR}/system/system_info.txt"

tar -czf "${CONFIG_FILE}" -C "${STAGE_DIR}" .
rm -rf "${STAGE_DIR}"
chmod 600 "${CONFIG_FILE}"

if ! tar -tzf "${CONFIG_FILE}" > /dev/null; then
    log_error "Configuration archive verification failed."
    exit 1
fi

CONFIG_FILE_SIZE=$(stat -c %s "${CONFIG_FILE}")
CONFIG_FILE_SHA256=$(sha256sum "${CONFIG_FILE}" | awk '{print $1}')
log "Configuration backup verified: size=${CONFIG_FILE_SIZE}B, sha256=${CONFIG_FILE_SHA256}"

# 6. Generate Manifest
MANIFEST_FILE="${BACKUP_ROOT}/manifests/backup_${TIMESTAMP}.manifest"
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

cat << MANIFEST_EOF > "${MANIFEST_FILE}"
MANIFEST_VERSION=1.0
BACKUP_TIMESTAMP=${TIMESTAMP}
BACKUP_DATE_UTC=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
BACKUP_DURATION_SECONDS=${DURATION}
HOSTNAME=${HOST_NAME}
APPLICATION_GIT_SHA=${GIT_SHA}
POSTGRESQL_VERSION=${PG_VERSION}
DATABASE_NAME=${DB_NAME}
DATABASE_DUMP_PATH=${DB_DUMP_FILE}
DATABASE_DUMP_SIZE=${DB_DUMP_SIZE}
DATABASE_DUMP_SHA256=${DB_DUMP_SHA256}
DATABASE_GLOBALS_PATH=${GLOBALS_FILE}
DATABASE_GLOBALS_SIZE=${GLOBALS_SIZE}
DATABASE_GLOBALS_SHA256=${GLOBALS_SHA256}
MEDIA_BACKUP_PATH=${MEDIA_FILE}
MEDIA_BACKUP_SIZE=${MEDIA_FILE_SIZE}
MEDIA_FILE_COUNT=${MEDIA_FILE_COUNT}
MEDIA_BACKUP_SHA256=${MEDIA_FILE_SHA256}
CONFIG_BACKUP_PATH=${CONFIG_FILE}
CONFIG_BACKUP_SIZE=${CONFIG_FILE_SIZE}
CONFIG_BACKUP_SHA256=${CONFIG_FILE_SHA256}
BACKUP_STATUS=SUCCESS
MANIFEST_EOF

chmod 644 "${MANIFEST_FILE}"
log "Manifest generated at: ${MANIFEST_FILE}"

# 7. Retention Policy Enforcement
log "Applying retention policy (retaining ${RETENTION_DAYS} days)..."
apply_retention() {
    local dir="$1"
    local pattern="$2"
    local total_count=$(find "$dir" -name "$pattern" -type f | wc -l)
    if [ "$total_count" -le 1 ]; then
        return 0
    fi
    find "$dir" -name "$pattern" -type f -mtime +${RETENTION_DAYS} | while read -r old_file; do
        local current_count=$(find "$dir" -name "$pattern" -type f | wc -l)
        if [ "$current_count" -gt 1 ]; then
            log "Retention: Removing expired backup ${old_file}"
            rm -f "$old_file"
        fi
    done
}

apply_retention "${BACKUP_ROOT}/database" "ayaan_production_*.dump"
apply_retention "${BACKUP_ROOT}/database" "ayaan_globals_*.sql"
apply_retention "${BACKUP_ROOT}/media" "ayaan_media_*.tar.gz"
apply_retention "${BACKUP_ROOT}/config" "ayaan_config_*.tar.gz"
apply_retention "${BACKUP_ROOT}/manifests" "backup_*.manifest"

log "Backup completed successfully in ${DURATION} seconds."
log "=================================================="

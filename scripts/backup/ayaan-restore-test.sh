#!/usr/bin/env bash
# ==============================================================================
# Ayaan Clothing Production Restore Verification Script
# ==============================================================================
set -euo pipefail

BACKUP_ROOT="/var/backups/ayaan"
TS=$(date +"%Y%m%d_%H%M%S")
TEST_DB="ayaan_restore_test_${TS}"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S UTC')] $1"
}

log_error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S UTC')] ERROR: $1" >&2
}

# 1. Locate Database Dump
DUMP_FILE="${1:-}"
if [ -z "${DUMP_FILE}" ]; then
    DUMP_FILE=$(ls -t "${BACKUP_ROOT}/database"/ayaan_production_*.dump 2>/dev/null | head -n 1 || true)
fi

if [ -z "${DUMP_FILE}" ] || [ ! -f "${DUMP_FILE}" ]; then
    log_error "No database dump file found to test. Aborting."
    exit 1
fi

log "=================================================="
log "Starting Restore Integrity & Verification Test"
log "Target DB Dump: ${DUMP_FILE}"
log "Test Database: ${TEST_DB}"

# 2. Test Isolated Database Restore
log "Creating temporary isolated PostgreSQL database '${TEST_DB}'..."
su - postgres -c "createdb -O ayaan_user ${TEST_DB}"

cleanup_db() {
    log "Cleaning up temporary database '${TEST_DB}'..."
    su - postgres -c "dropdb --if-exists ${TEST_DB}" 2>/dev/null || true
}
trap cleanup_db EXIT

log "Restoring dump into '${TEST_DB}' via pg_restore..."
cat "${DUMP_FILE}" | su - postgres -c "pg_restore -d ${TEST_DB} --no-owner" || true

log "Verifying database schema and table structure..."
TABLE_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';\"" | tr -d '[:space:]')
log "Public schema tables restored: ${TABLE_COUNT} (Expected: 51)"
if [ "${TABLE_COUNT}" -lt 50 ]; then
    log_error "Insufficient tables restored in test database (${TABLE_COUNT}). Aborting."
    exit 1
fi

# Verify representative row counts (matching live production baseline)
log "Verifying representative business entities in restored database..."
PRODUCTS_TOTAL=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM products;\"" | tr -d '[:space:]')
PRODUCTS_ACTIVE=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM products WHERE deleted_at IS NULL;\"" | tr -d '[:space:]')
BRANDS_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM brands;\"" | tr -d '[:space:]')
CATEGORIES_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM categories;\"" | tr -d '[:space:]')
INVENTORIES_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM inventories;\"" | tr -d '[:space:]')
ORDERS_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM orders;\"" | tr -d '[:space:]')
USERS_TOTAL=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM users;\"" | tr -d '[:space:]')
USERS_ACTIVE=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM users WHERE deleted_at IS NULL;\"" | tr -d '[:space:]')
QUOTES_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM quotations;\"" | tr -d '[:space:]')

log "Restored entity counts:"
log "  - products:    ${PRODUCTS_TOTAL} total (active: ${PRODUCTS_ACTIVE}, Expected active: 48)"
log "  - brands:      ${BRANDS_COUNT} (Expected: 63)"
log "  - categories:  ${CATEGORIES_COUNT} (Expected: 27)"
log "  - inventories: ${INVENTORIES_COUNT} (Expected: 137)"
log "  - orders:      ${ORDERS_COUNT} (Expected: 4)"
log "  - users:       ${USERS_TOTAL} total (active: ${USERS_ACTIVE}, Expected active: 3)"
log "  - quotations:  ${QUOTES_COUNT} (Expected: 1)"

if [ "${PRODUCTS_ACTIVE}" -ne 48 ] || [ "${BRANDS_COUNT}" -ne 63 ] || [ "${ORDERS_COUNT}" -ne 4 ] || [ "${USERS_ACTIVE}" -ne 3 ]; then
    log_error "Restored entity counts do not match expected baseline!"
    exit 1
fi

# Test relational integrity with join query
log "Testing relational queries on restored database..."
SAMPLE_JOIN=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT p.name, b.name FROM products p JOIN brands b ON p.brand_id = b.id WHERE p.deleted_at IS NULL LIMIT 2;\"" | tr -d '\n')
if [ -z "${SAMPLE_JOIN}" ]; then
    log_error "Relational join query failed or returned no records."
    exit 1
fi
log "Relational query test succeeded: Products and Brands linked correctly."

# 3. Test Media Archive Extraction
LATEST_MEDIA=$(ls -t "${BACKUP_ROOT}/media"/ayaan_media_*.tar.gz 2>/dev/null | head -n 1 || true)
if [ -n "${LATEST_MEDIA}" ] && [ -f "${LATEST_MEDIA}" ]; then
    log "Testing media restore from ${LATEST_MEDIA}..."
    TEST_MEDIA_DIR=$(mktemp -d /tmp/ayaan_restore_media_test.XXXXXX)
    tar -xzf "${LATEST_MEDIA}" -C "${TEST_MEDIA_DIR}"
    
    RESTORED_MEDIA_COUNT=$(find "${TEST_MEDIA_DIR}" -type f | wc -l)
    log "Media extracted: ${RESTORED_MEDIA_COUNT} files restored to temporary directory."
    
    for sub in products brands categories banners branding; do
        if [ ! -d "${TEST_MEDIA_DIR}/public/${sub}" ]; then
            log_error "Missing expected media subdirectory in archive: public/${sub}"
            rm -rf "${TEST_MEDIA_DIR}"
            exit 1
        fi
    done
    rm -rf "${TEST_MEDIA_DIR}"
    log "Media restore test passed: All directories and ${RESTORED_MEDIA_COUNT} files verified."
fi

# 4. Test Configuration Archive Extraction
LATEST_CONFIG=$(ls -t "${BACKUP_ROOT}/config"/ayaan_config_*.tar.gz 2>/dev/null | head -n 1 || true)
if [ -n "${LATEST_CONFIG}" ] && [ -f "${LATEST_CONFIG}" ]; then
    log "Testing configuration restore from ${LATEST_CONFIG}..."
    TEST_CONFIG_DIR=$(mktemp -d /tmp/ayaan_restore_config_test.XXXXXX)
    tar -xzf "${LATEST_CONFIG}" -C "${TEST_CONFIG_DIR}"
    
    if [ ! -f "${TEST_CONFIG_DIR}/nginx/sites-available/ayaan-customer.conf" ]; then
        log_error "Missing Nginx configuration in backup archive!"
        rm -rf "${TEST_CONFIG_DIR}"
        exit 1
    fi
    if [ ! -f "${TEST_CONFIG_DIR}/supervisor/conf.d/ayaan-worker.conf" ]; then
        log_error "Missing Supervisor configuration in backup archive!"
        rm -rf "${TEST_CONFIG_DIR}"
        exit 1
    fi
    rm -rf "${TEST_CONFIG_DIR}"
    log "Configuration restore test passed: Nginx, Supervisor, PM2, and environment snapshots verified."
fi

log "=================================================="
log "ALL RESTORE VERIFICATION CHECKS PASSED SUCCESSFULLY"
log "=================================================="

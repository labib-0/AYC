#!/usr/bin/env bash
# ==============================================================================
# AYC - Isolated Database Restore Verification Script
# Strict error handling, real exit status capture, baseline validation
# ==============================================================================
set -Eeuo pipefail

LOG_FILE="/tmp/ayc_gap_close/db_restore_verification.log"
mkdir -p /tmp/ayc_gap_close
exec > >(tee -a "${LOG_FILE}") 2>&1

TS=$(date -u +"%Y%m%d_%H%M%S")
TEST_DB="ayc_restore_verify_${TS}"
DUMP_FILE="/tmp/ayc_gap_close/ayaan_production_20261020_023056.dump"
RESTORE_RAW_LOG="/tmp/ayc_gap_close/pg_restore_raw.log"

log() {
    echo "[$(date -u +'%Y-%m-%d %H:%M:%S UTC')] $1"
}

log_error() {
    echo "[$(date -u +'%Y-%m-%d %H:%M:%S UTC')] ERROR: $1" >&2
}

log "===================================================================="
log "Starting Isolated Database Restore Verification Test"
log "Target Snapshot ID: 5650e06bbca1b74664d0f75d5628a330c49f7a2f74dc4999fbb4c01311b918bf"
log "Dump File: ${DUMP_FILE}"
log "Isolated Temporary DB: ${TEST_DB}"
log "===================================================================="

# 1. Verify Dump File Presence and Integrity
if [ ! -f "${DUMP_FILE}" ]; then
    log_error "Dump file not found: ${DUMP_FILE}"
    exit 1
fi
chmod 644 "${DUMP_FILE}"
DUMP_SIZE=$(stat -c%s "${DUMP_FILE}")
DUMP_SHA256=$(sha256sum "${DUMP_FILE}" | awk '{print $1}')
log "Dump File Size: ${DUMP_SIZE} bytes"
log "Dump File SHA256: ${DUMP_SHA256}"

# 2. Cleanup Trap (Cleans ONLY the newly created temporary database)
cleanup() {
    local exit_code=$?
    log "===================================================================="
    log "Cleaning up isolated temporary database: ${TEST_DB}..."
    su - postgres -c "dropdb --if-exists ${TEST_DB}" 2>/dev/null || true
    if [ ${exit_code} -eq 0 ]; then
        log "Temporary database ${TEST_DB} cleanly dropped. Test finished with code 0."
    else
        log_error "Test aborted or failed with exit code ${exit_code}."
    fi
    log "===================================================================="
}
trap cleanup EXIT

# 3. Create Isolated Temporary Database
log "Creating temporary isolated database: ${TEST_DB} (owner: ayaan_user)..."
su - postgres -c "createdb -O ayaan_user ${TEST_DB}"
log "Database ${TEST_DB} created successfully."

# 4. Perform pg_restore with UNMODIFIED EXIT STATUS CAPTURE
log "Executing pg_restore into ${TEST_DB}..."
log "Command: pg_restore -v --no-owner -d ${TEST_DB} ${DUMP_FILE}"

set +e
su - postgres -c "pg_restore -v --no-owner -d ${TEST_DB} \"${DUMP_FILE}\"" > "${RESTORE_RAW_LOG}" 2>&1
RESTORE_EXIT_CODE=$?
set -Eeuo pipefail

log "pg_restore process completed. Raw exit code: ${RESTORE_EXIT_CODE}"

# Analyze pg_restore output
WARNINGS_COUNT=$(grep -ci "warning:" "${RESTORE_RAW_LOG}" || true)
ERRORS_COUNT=$(grep -ci "error:" "${RESTORE_RAW_LOG}" || true)

log "pg_restore output analysis:"
log "  - Exit Code:      ${RESTORE_EXIT_CODE}"
log "  - Warning Count:  ${WARNINGS_COUNT}"
log "  - Error Count:    ${ERRORS_COUNT}"

if [ "${RESTORE_EXIT_CODE}" -ne 0 ]; then
    log_error "pg_restore FAILED with non-zero exit code ${RESTORE_EXIT_CODE}!"
    log_error "Full restore log tail:"
    tail -n 30 "${RESTORE_RAW_LOG}" >&2
    exit "${RESTORE_EXIT_CODE}"
fi

if [ "${ERRORS_COUNT}" -gt 0 ]; then
    log_error "pg_restore reported ${ERRORS_COUNT} errors despite exit code ${RESTORE_EXIT_CODE}!"
    grep -i "error:" "${RESTORE_RAW_LOG}" >&2
    exit 1
fi

log "pg_restore completed with ZERO errors and exit status 0 (SUCCESS)."

# 5. Schema and Object Verification
log "--------------------------------------------------------------------"
log "Verifying restored schema, migration metadata, constraints, and indexes..."

TABLE_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';\"" | tr -d '[:space:]')
VIEW_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM information_schema.views WHERE table_schema = 'public';\"" | tr -d '[:space:]')
INDEX_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';\"" | tr -d '[:space:]')
FK_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM information_schema.table_constraints WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY';\"" | tr -d '[:space:]')
PK_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM information_schema.table_constraints WHERE constraint_schema = 'public' AND constraint_type = 'PRIMARY KEY';\"" | tr -d '[:space:]')
UNIQUE_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM information_schema.table_constraints WHERE constraint_schema = 'public' AND constraint_type = 'UNIQUE';\"" | tr -d '[:space:]')
MIGRATIONS_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM migrations;\"" | tr -d '[:space:]')
LAST_MIGRATION=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT migration FROM migrations ORDER BY id DESC LIMIT 1;\"" | tr -d '[:space:]')

log "Schema Metrics:"
log "  - Tables in public schema:       ${TABLE_COUNT}"
log "  - Views in public schema:        ${VIEW_COUNT}"
log "  - Indexes in public schema:      ${INDEX_COUNT}"
log "  - Primary Key Constraints:       ${PK_COUNT}"
log "  - Foreign Key Constraints:       ${FK_COUNT}"
log "  - Unique Constraints:            ${UNIQUE_COUNT}"
log "  - Applied Migrations:            ${MIGRATIONS_COUNT}"
log "  - Latest Migration:              ${LAST_MIGRATION}"

if [ "${TABLE_COUNT}" -lt 55 ]; then
    log_error "Table count ${TABLE_COUNT} is below required threshold (>55)!"
    exit 1
fi

# 6. Entity Count Baseline (Privacy Redacted)
log "--------------------------------------------------------------------"
log "Auditing restored business entity counts (PII redacted)..."

PRODUCTS_TOTAL=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM products;\"" | tr -d '[:space:]')
PRODUCTS_ACTIVE=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM products WHERE deleted_at IS NULL;\"" | tr -d '[:space:]')
BRANDS_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM brands;\"" | tr -d '[:space:]')
CATEGORIES_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM categories;\"" | tr -d '[:space:]')
INVENTORIES_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM inventories;\"" | tr -d '[:space:]')
INVENTORIES_QTY_SUM=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT coalesce(sum(quantity), 0) FROM inventories;\"" | tr -d '[:space:]')
ORDERS_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM orders;\"" | tr -d '[:space:]')
ORDER_ITEMS_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM order_items;\"" | tr -d '[:space:]')
PAYMENTS_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM payments;\"" | tr -d '[:space:]')
QUOTES_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM quotations;\"" | tr -d '[:space:]')
ACTIVITIES_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM activities;\"" | tr -d '[:space:]')
ADJUSTMENTS_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM admin_inventory_adjustments;\"" | tr -d '[:space:]')

# User role counts without PII
USERS_TOTAL=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM users;\"" | tr -d '[:space:]')
USERS_ACTIVE=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM users WHERE deleted_at IS NULL;\"" | tr -d '[:space:]')
USERS_ADMIN_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM users WHERE role = 'admin' AND deleted_at IS NULL;\"" | tr -d '[:space:]')
USERS_CUSTOMER_COUNT=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM users WHERE role = 'customer' AND deleted_at IS NULL;\"" | tr -d '[:space:]')

log "Restored Entity Metrics:"
log "  - products:                     ${PRODUCTS_TOTAL} total (active: ${PRODUCTS_ACTIVE})"
log "  - brands:                       ${BRANDS_COUNT}"
log "  - categories:                   ${CATEGORIES_COUNT}"
log "  - inventories:                  ${INVENTORIES_COUNT} allocations (total units: ${INVENTORIES_QTY_SUM})"
log "  - orders:                       ${ORDERS_COUNT}"
log "  - order_items:                  ${ORDER_ITEMS_COUNT}"
log "  - payments:                     ${PAYMENTS_COUNT}"
log "  - quotations:                   ${QUOTES_COUNT}"
log "  - activities:                   ${ACTIVITIES_COUNT}"
log "  - admin_inventory_adjustments:  ${ADJUSTMENTS_COUNT}"
log "  - users:                        ${USERS_TOTAL} total (${USERS_ACTIVE} active: ${USERS_ADMIN_COUNT} admin, ${USERS_CUSTOMER_COUNT} customer)"

# 7. Relational Queries and Foreign Key Integrity Checks
log "--------------------------------------------------------------------"
log "Executing representative relational queries and foreign key integrity checks..."

# Test 1: Products - Brands - CategoryProduct - Categories Join
JOIN_RES=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM products p JOIN brands b ON p.brand_id = b.id JOIN category_product cp ON cp.product_id = p.id JOIN categories c ON cp.category_id = c.id WHERE p.deleted_at IS NULL;\"" | tr -d '[:space:]')
log "Relational Join (Products -> Brands -> Categories via category_product): ${JOIN_RES} product-category associations linked."
if [ "${JOIN_RES}" -eq 0 ]; then
    log_error "Relational join returned zero records!"
    exit 1
fi

# Test 2: Products - Inventories Join
INV_JOIN_RES=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM inventories i JOIN products p ON i.product_id = p.id;\"" | tr -d '[:space:]')
log "Relational Join (Inventories -> Products): ${INV_JOIN_RES} allocations linked."
if [ "${INV_JOIN_RES}" -eq 0 ]; then
    log_error "Inventory join returned zero records!"
    exit 1
fi

# Test 3: Foreign Key Orphan Checks (Must all be 0)
ORPHAN_BRANDS=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM products WHERE brand_id IS NOT NULL AND brand_id NOT IN (SELECT id FROM brands);\"" | tr -d '[:space:]')
ORPHAN_CAT_PROD_P=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM category_product WHERE product_id NOT IN (SELECT id FROM products);\"" | tr -d '[:space:]')
ORPHAN_CAT_PROD_C=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM category_product WHERE category_id NOT IN (SELECT id FROM categories);\"" | tr -d '[:space:]')
ORPHAN_ORDER_ITEMS=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM order_items WHERE order_id NOT IN (SELECT id FROM orders);\"" | tr -d '[:space:]')
ORPHAN_INVENTORIES=$(su - postgres -c "psql -d ${TEST_DB} -t -c \"SELECT count(*) FROM inventories WHERE product_id NOT IN (SELECT id FROM products);\"" | tr -d '[:space:]')

log "Foreign Key Orphan Audit:"
log "  - Products with non-existent brand_id:               ${ORPHAN_BRANDS}"
log "  - category_product with non-existent product_id:     ${ORPHAN_CAT_PROD_P}"
log "  - category_product with non-existent category_id:    ${ORPHAN_CAT_PROD_C}"
log "  - Order items with non-existent order_id:            ${ORPHAN_ORDER_ITEMS}"
log "  - Inventories with non-existent product_id:          ${ORPHAN_INVENTORIES}"

if [ "${ORPHAN_BRANDS}" -ne 0 ] || [ "${ORPHAN_CAT_PROD_P}" -ne 0 ] || [ "${ORPHAN_CAT_PROD_C}" -ne 0 ] || [ "${ORPHAN_ORDER_ITEMS}" -ne 0 ] || [ "${ORPHAN_INVENTORIES}" -ne 0 ]; then
    log_error "Foreign key orphan check failed! Data corruption detected."
    exit 1
fi

log "===================================================================="
log "ALL ISOLATED DATABASE RESTORE AND INTEGRITY CHECKS PASSED!"
log "Database Restore Status: 100% VERIFIED (Exit Code 0, 0 Errors)"
log "===================================================================="

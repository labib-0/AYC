#!/usr/bin/env bash
# ==============================================================================
# AYC - Synthetic Test Suite for Generation-Aware Backup Retention
# ==============================================================================
set -euo pipefail

# Sourced or embedded retention logic
apply_generation_retention() {
    local backup_root="${1:-/var/backups/ayaan}"
    local keep_gens="${2:-7}"
    local dry_run="${3:-0}"

    if [ "$keep_gens" -lt 3 ]; then
        echo "[RETENTION ERROR] KEEP_GENERATIONS (${keep_gens}) is below minimum safety floor (3). Aborting retention." >&2
        return 1
    fi

    if [ ! -d "$backup_root" ]; then
        echo "[RETENTION ERROR] Backup root directory does not exist: ${backup_root}" >&2
        return 1
    fi

    # Read whitelist if present
    local whitelist_file="${backup_root}/.protected_files"
    local protected_list=()
    if [ -f "$whitelist_file" ]; then
        while IFS= read -r line || [ -n "$line" ]; do
            # ignore comments and empty lines
            [[ "$line" =~ ^[[:space:]]*# ]] && continue
            [[ -z "${line// }" ]] && continue
            protected_list+=("$line")
        done < "$whitelist_file"
    fi

    # Discover valid automated backup generations
    # Primary source of truth: manifests/backup_${TIMESTAMP}.manifest
    # Secondary source: matching pairs of both (ayaan_production_${TIMESTAMP}.dump AND ayaan_globals_${TIMESTAMP}.sql)
    local timestamps
    timestamps=$(
        {
            # From manifests
            find "${backup_root}/manifests" -type f -name 'backup_[0-9]*.manifest' 2>/dev/null | \
                sed -E 's/.*backup_//; s/\.manifest$//'

            # From complete dump+globals pairs
            if [ -d "${backup_root}/database" ]; then
                for dump in "${backup_root}/database"/ayaan_production_[0-9]*.dump; do
                    [ -f "$dump" ] || continue
                    local dts
                    dts=$(basename "$dump" | sed -E 's/ayaan_production_//; s/\.dump$//')
                    if [ -f "${backup_root}/database/ayaan_globals_${dts}.sql" ]; then
                        echo "$dts"
                    fi
                done
            fi
        } | sort -u
    )

    if [ -z "$timestamps" ]; then
        echo "[RETENTION INFO] No valid standard backup generations found in ${backup_root}."
        return 0
    fi

    # Sort timestamps descending (newest first)
    local sorted_desc
    sorted_desc=$(echo "$timestamps" | sort -r)

    local total_gens
    total_gens=$(echo "$sorted_desc" | grep -c . || echo 0)

    echo "[RETENTION INFO] Found ${total_gens} standard backup generations. Configured to keep newest ${keep_gens}."

    if [ "$total_gens" -le "$keep_gens" ]; then
        echo "[RETENTION INFO] Total generations (${total_gens}) <= KEEP_GENERATIONS (${keep_gens}). No pruning needed."
        return 0
    fi

    local gen_index=0
    while IFS= read -r ts; do
        [ -z "$ts" ] && continue
        gen_index=$((gen_index + 1))

        if [ "$gen_index" -le "$keep_gens" ]; then
            echo "[RETENTION KEEP] Generation #${gen_index} [${ts}] (retained within quota)"
            continue
        fi

        echo "[RETENTION CANDIDATE] Generation #${gen_index} [${ts}] (exceeds quota of ${keep_gens})"

        # Gather all component files for this generation
        local comp_files=(
            "${backup_root}/manifests/backup_${ts}.manifest"
            "${backup_root}/database/ayaan_production_${ts}.dump"
            "${backup_root}/database/ayaan_globals_${ts}.sql"
            "${backup_root}/media/ayaan_media_${ts}.tar.gz"
            "${backup_root}/config/ayaan_config_${ts}.tar.gz"
        )

        # Check if any component is protected or matches whitelist
        local is_protected=0
        local protect_reason=""

        for f in "${comp_files[@]}"; do
            local base_f
            base_f=$(basename "$f")

            # Check if file ends in .protected or .keep
            if [ -f "${f}.protected" ] || [ -f "${f}.keep" ]; then
                is_protected=1
                protect_reason="explicit protection marker file (${base_f}.protected/keep)"
                break
            fi

            # Check .protected_files list
            if [ "${#protected_list[@]}" -gt 0 ]; then
                for prot in "${protected_list[@]}"; do
                    if [[ "$base_f" == "$prot" ]] || [[ "$f" == "$prot" ]] || [[ "$ts" == "$prot" ]]; then
                        is_protected=1
                        protect_reason="matched whitelist rule: ${prot}"
                        break 2
                    fi
                done
            fi
        done

        if [ "$is_protected" -eq 1 ]; then
            echo "[RETENTION SKIP] Generation #${gen_index} [${ts}] is PROTECTED: ${protect_reason}. Preserving entire generation."
            continue
        fi

        # Prune components atomically
        for f in "${comp_files[@]}"; do
            if [ -f "$f" ]; then
                if [ "$dry_run" -eq 1 ]; then
                    echo "  [DRY RUN] Would delete: $f"
                else
                    echo "  [PRUNING] Deleting: $f"
                    rm -f "$f"
                fi
            fi
        done
        echo "[RETENTION PRUNED] Generation #${gen_index} [${ts}] processed successfully."

    done <<< "$sorted_desc"

    return 0
}

# --- SYNTHETIC TESTS ---
echo "================================================================="
echo "Running Synthetic Test Suite for apply_generation_retention"
echo "================================================================="

TEST_DIR=$(mktemp -d /tmp/ayc_retention_test.XXXXXX)
trap 'rm -rf "$TEST_DIR"' EXIT

mkdir -p "${TEST_DIR}/database" "${TEST_DIR}/media" "${TEST_DIR}/config" "${TEST_DIR}/manifests"

create_generation() {
    local ts="$1"
    touch "${TEST_DIR}/manifests/backup_${ts}.manifest"
    touch "${TEST_DIR}/database/ayaan_production_${ts}.dump"
    touch "${TEST_DIR}/database/ayaan_globals_${ts}.sql"
    touch "${TEST_DIR}/media/ayaan_media_${ts}.tar.gz"
    touch "${TEST_DIR}/config/ayaan_config_${ts}.tar.gz"
}

# Test 1: Minimum floor safety check
echo "Test 1: Reject keep_gens < 3..."
if apply_generation_retention "$TEST_DIR" 2 0 >/dev/null 2>&1; then
    echo "FAIL: Allowed keep_gens < 3"
    exit 1
else
    echo "PASS: Rejected keep_gens < 3"
fi

# Create 5 synthetic generations: Day 1 through Day 5
create_generation "2026-10-15_02-00-00"
create_generation "2026-10-16_02-00-00"
create_generation "2026-10-17_02-00-00"
create_generation "2026-10-18_02-00-00"
create_generation "2026-10-19_02-00-00"

# Also add special/unrelated files that MUST NOT be touched
touch "${TEST_DIR}/media/orphaned_media_backup_20261018_105552.tar.gz"
touch "${TEST_DIR}/database/ayaan_production_2026-10-16_06-12-16.dump"
touch "${TEST_DIR}/database/custom_manual_export.sql"

# Test 2: If keep_gens = 5 and total = 5, nothing pruned
echo -e "\nTest 2: keep_gens = 5 with 5 generations..."
apply_generation_retention "$TEST_DIR" 5 0 | grep "No pruning needed"
[ -f "${TEST_DIR}/database/ayaan_production_2026-10-15_02-00-00.dump" ] || { echo "FAIL: Day 1 deleted"; exit 1; }
echo "PASS: Nothing pruned when total <= keep_gens"

# Test 3: Add 6th and 7th generations, keep 4 (so oldest 3 should be pruned)
create_generation "2026-10-20_02-00-00"
create_generation "2026-10-21_02-00-00"

# Protect Day 2 via whitelist
echo "2026-10-16_02-00-00" > "${TEST_DIR}/.protected_files"

echo -e "\nTest 3: Dry run with 7 generations, keep 4, with Day 2 protected..."
apply_generation_retention "$TEST_DIR" 4 1 | grep "DRY RUN"
# Verify dry run did not delete anything
[ -f "${TEST_DIR}/database/ayaan_production_2026-10-15_02-00-00.dump" ] || { echo "FAIL: Dry run deleted Day 1"; exit 1; }
echo "PASS: Dry run preserved all files"

echo -e "\nTest 4: Real execution with 7 generations, keep 4, with Day 2 protected..."
apply_generation_retention "$TEST_DIR" 4 0

# Check retained:
# Day 7 (newest 1): retained
[ -f "${TEST_DIR}/database/ayaan_production_2026-10-21_02-00-00.dump" ] || { echo "FAIL: Day 7 deleted"; exit 1; }
# Day 6 (newest 2): retained
[ -f "${TEST_DIR}/database/ayaan_production_2026-10-20_02-00-00.dump" ] || { echo "FAIL: Day 6 deleted"; exit 1; }
# Day 5 (newest 3): retained
[ -f "${TEST_DIR}/database/ayaan_production_2026-10-19_02-00-00.dump" ] || { echo "FAIL: Day 5 deleted"; exit 1; }
# Day 4 (newest 4): retained
[ -f "${TEST_DIR}/database/ayaan_production_2026-10-18_02-00-00.dump" ] || { echo "FAIL: Day 4 deleted"; exit 1; }

# Day 3 (older): pruned!
[ ! -f "${TEST_DIR}/database/ayaan_production_2026-10-17_02-00-00.dump" ] || { echo "FAIL: Day 3 not deleted"; exit 1; }
[ ! -f "${TEST_DIR}/media/ayaan_media_2026-10-17_02-00-00.tar.gz" ] || { echo "FAIL: Day 3 media not deleted"; exit 1; }

# Day 2 (older, but PROTECTED via whitelist): MUST BE RETAINED!
[ -f "${TEST_DIR}/database/ayaan_production_2026-10-16_02-00-00.dump" ] || { echo "FAIL: Day 2 was protected but deleted!"; exit 1; }
[ -f "${TEST_DIR}/media/ayaan_media_2026-10-16_02-00-00.tar.gz" ] || { echo "FAIL: Day 2 media deleted!"; exit 1; }

# Day 1 (older, un-protected): pruned!
[ ! -f "${TEST_DIR}/database/ayaan_production_2026-10-15_02-00-00.dump" ] || { echo "FAIL: Day 1 not deleted"; exit 1; }

# Check that non-standard and orphan files were 100% UNTOUCHED:
[ -f "${TEST_DIR}/media/orphaned_media_backup_20261018_105552.tar.gz" ] || { echo "FAIL: Orphan media was deleted!"; exit 1; }
[ -f "${TEST_DIR}/database/ayaan_production_2026-10-16_06-12-16.dump" ] || { echo "FAIL: Historical standalone dump was deleted!"; exit 1; }
[ -f "${TEST_DIR}/database/custom_manual_export.sql" ] || { echo "FAIL: Custom SQL was deleted!"; exit 1; }

echo -e "\n================================================================="
echo "ALL SYNTHETIC RETENTION TESTS PASSED SUCCESSFULLY!"
echo "================================================================="

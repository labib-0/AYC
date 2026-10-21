#!/usr/bin/env bash
# ==============================================================================
# AYC - Generation-Aware Backup Retention Engine
# Ensures atomic generation pruning, whitelist protection, and minimum floor safety
# ==============================================================================
set -euo pipefail

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

    local whitelist_file="${backup_root}/.protected_files"
    local protected_list=()
    if [ -f "$whitelist_file" ]; then
        while IFS= read -r line || [ -n "$line" ]; do
            [[ "$line" =~ ^[[:space:]]*# ]] && continue
            [[ -z "${line// }" ]] && continue
            protected_list+=("$line")
        done < "$whitelist_file"
    fi

    # Discover valid automated backup generations
    local timestamps
    timestamps=$(
        {
            find "${backup_root}/manifests" -type f -name 'backup_[0-9]*.manifest' 2>/dev/null | \
                sed -E 's/.*backup_//; s/\.manifest$//'

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

        local comp_files=(
            "${backup_root}/manifests/backup_${ts}.manifest"
            "${backup_root}/database/ayaan_production_${ts}.dump"
            "${backup_root}/database/ayaan_globals_${ts}.sql"
            "${backup_root}/media/ayaan_media_${ts}.tar.gz"
            "${backup_root}/config/ayaan_config_${ts}.tar.gz"
        )

        local is_protected=0
        local protect_reason=""

        for f in "${comp_files[@]}"; do
            local base_f
            base_f=$(basename "$f")

            if [ -f "${f}.protected" ] || [ -f "${f}.keep" ]; then
                is_protected=1
                protect_reason="explicit protection marker file (${base_f}.protected/keep)"
                break
            fi

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

# If run directly as CLI script
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    DRY_RUN=0
    ROOT="/var/backups/ayaan"
    GENS=7
    for arg in "$@"; do
        if [ "$arg" = "--dry-run" ] || [ "$arg" = "-n" ]; then
            DRY_RUN=1
        elif [[ "$arg" =~ ^[0-9]+$ ]]; then
            GENS="$arg"
        elif [ -d "$arg" ]; then
            ROOT="$arg"
        fi
    done
    apply_generation_retention "$ROOT" "$GENS" "$DRY_RUN"
fi

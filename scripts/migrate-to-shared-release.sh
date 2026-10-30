#!/usr/bin/env bash
# ==============================================================================
# Ayaan Clothing — Infrastructure Migration to Shared Release Architecture
#
# Idempotent, non-destructive migration helper for transitioning from legacy
# in-place / .next_releases layout to single-pointer shared releases.
#
# Defaults to --dry-run. Must explicitly pass --execute to apply changes.
# ==============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/ayaan}"
DRY_RUN=true
EXECUTE=false
ROLLBACK=false
SKIP_DISK_CHECK=false

# ANSI colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✔${NC} $1"; }
log_warn()    { echo -e "${YELLOW}⚠${NC} $1"; }
log_error()   { echo -e "${RED}✖${NC} $1" >&2; }
log_step()    { echo -e "\n${CYAN}▶${NC} $1"; }

usage() {
  cat << USAGE
Usage: scripts/migrate-to-shared-release.sh [OPTIONS]

Migrates Ayaan Clothing production layout to single-pointer shared release architecture.

Options:
  --dry-run            Simulate migration without modifying files (DEFAULT).
  --execute            Execute migration operations.
  --rollback           Revert migration: removes 'current' symlink and instructs service reversal.
  --app-dir <dir>      Target application root directory (default: /var/www/ayaan).
  --skip-disk-check    Skip disk space requirement check (for test fixtures).
  -h, --help           Show this help message.

USAGE
  exit 0
}

# Parse CLI arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      EXECUTE=false
      shift
      ;;
    --execute)
      EXECUTE=true
      DRY_RUN=false
      shift
      ;;
    --rollback)
      ROLLBACK=true
      shift
      ;;
    --app-dir)
      if [[ -z "${2:-}" || "${2:-}" =~ ^-- ]]; then
        log_error "Missing value for --app-dir"
        exit 1
      fi
      APP_DIR="$2"
      shift 2
      ;;
    --skip-disk-check)
      SKIP_DISK_CHECK=true
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      log_error "Unknown option: $1"
      usage
      ;;
  esac
done

SHARED_DIR="${APP_DIR}/shared"
RELEASES_DIR="${APP_DIR}/releases"
CURRENT_LINK="${APP_DIR}/current"

compute_sha256() {
  local target="$1"
  if command -v sha256sum &>/dev/null; then
    sha256sum "${target}" | awk '{print $1}'
  elif command -v shasum &>/dev/null; then
    shasum -a 256 "${target}" | awk '{print $1}'
  else
    python3 -c "import hashlib, sys; print(hashlib.sha256(open(sys.argv[1],'rb').read()).hexdigest())" "${target}"
  fi
}

resolve_realpath() {
  local p="$1"
  if command -v realpath &>/dev/null; then
    realpath "${p}" 2>/dev/null || true
  elif readlink -f "${p}" &>/dev/null; then
    readlink -f "${p}" 2>/dev/null || true
  else
    python3 -c "import os, sys; print(os.path.realpath(sys.argv[1]))" "${p}" 2>/dev/null || true
  fi
}

atomic_symlink_swap() {
  local target="$1"
  local link_name="$2"
  local tmp_link="${link_name}_tmp_$$"

  ln -sfn "${target}" "${tmp_link}"
  if mv -Tf "${tmp_link}" "${link_name}" 2>/dev/null; then
    return 0
  fi
  if python3 -c 'import os, sys; os.replace(sys.argv[1], sys.argv[2])' "${tmp_link}" "${link_name}" 2>/dev/null; then
    return 0
  fi
  rm -f "${link_name}"
  mv "${tmp_link}" "${link_name}"
}

echo "=========================================================="
echo "  AYAAN CLOTHING — SHARED RELEASE INFRASTRUCTURE MIGRATION"
echo "  Mode:      $([ "${ROLLBACK}" == "true" ] && echo "ROLLBACK" || ([ "${EXECUTE}" == "true" ] && echo "EXECUTE (MUTATIONS ENABLED)" || echo "DRY RUN (SIMULATION ONLY)"))"
echo "  Directory: ${APP_DIR}"
echo "=========================================================="

if [[ "${ROLLBACK}" == "true" ]]; then
  log_step "Executing Infrastructure Migration Rollback..."
  if [[ -L "${CURRENT_LINK}" || -f "${CURRENT_LINK}" ]]; then
    rm -f "${CURRENT_LINK}"
    log_success "Removed root symlink '${CURRENT_LINK}'."
  else
    log_info "Root symlink '${CURRENT_LINK}' not present or already removed."
  fi
  rm -f "${RELEASES_DIR}/CURRENT_RELEASE"
  log_success "Cleared CURRENT_RELEASE marker."
  echo ""
  echo "=========================================================="
  echo "  MIGRATION ROLLBACK COMPLETED"
  echo "  Legacy in-place structure in '${APP_DIR}' remains intact."
  echo "  If services were already updated, revert them to:"
  echo "    1. Nginx root: ${APP_DIR}/backend/public"
  echo "    2. PM2 cwd: ${APP_DIR} (ayaan-customer, ayaan-admin)"
  echo "    3. Supervisor command: php ${APP_DIR}/backend/artisan queue:work ..."
  echo "    4. Reload Nginx, PM2, and Supervisor."
  echo "=========================================================="
  exit 0
fi

# ── Step 1: Pre-flight Validations ───────────────────────────────────────────
log_step "Step 1/5: Pre-Flight Environment & Disk Capacity Checks..."

if [[ ! -d "${APP_DIR}" ]]; then
  log_error "Target application directory '${APP_DIR}' does not exist!"
  exit 1
fi

if [[ "${SKIP_DISK_CHECK}" != "true" ]]; then
  available_kb=$(df -k "${APP_DIR}" | awk 'NR==2 {print $4}')
  if [[ -n "${available_kb}" && "${available_kb}" -lt 204800 ]]; then # 200MB in KB
    log_error "Insufficient disk space on ${APP_DIR} filesystem (${available_kb} KB available, 200 MB required)."
    exit 1
  fi
  log_success "Available disk capacity verified (${available_kb} KB free)."
fi

# ── Step 2: Environment Files Migration & Preservation ────────────────────────
log_step "Step 2/5: Idempotent Environment Files Migration..."

mkdir -p "${SHARED_DIR}"

env_pairs=(
  "${APP_DIR}/.env.production|${SHARED_DIR}/.env.production"
  "${APP_DIR}/.env.local|${SHARED_DIR}/.env.local"
  "${APP_DIR}/backend/.env|${SHARED_DIR}/backend.env"
)

for pair in "${env_pairs[@]}"; do
  src="${pair%%|*}"
  dst="${pair##*|}"
  filename="$(basename "$src")"

  if [[ ! -f "$src" ]]; then
    # .env.local may be optional, others are mandatory
    if [[ "$filename" == ".env.local" ]]; then
      log_warn "Optional environment file '${src}' not present. Skipping."
      continue
    fi
    log_error "Mandatory source environment file '${src}' does not exist!"
    exit 1
  fi

  if [[ ! -s "$src" ]]; then
    log_error "Source environment file '${src}' is empty (0 bytes)!"
    exit 1
  fi

  src_hash=$(compute_sha256 "$src")

  if [[ -f "$dst" ]]; then
    dst_hash=$(compute_sha256 "$dst")
    if [[ "$src_hash" == "$dst_hash" ]]; then
      log_success "Environment file '$(basename "$dst")' already migrated (identical SHA256, idempotent skip)."
      continue
    else
      log_error "CONFLICT: Destination environment file '${dst}' exists but has different contents from '${src}'!"
      log_error "Refusing to overwrite existing secret. Manual reconciliation required."
      exit 1
    fi
  fi

  log_info "Migrating environment file to '${dst}'..."
  if [[ "${EXECUTE}" == "true" ]]; then
    cp -p "$src" "$dst"
    chmod 600 "$dst"
    verify_hash=$(compute_sha256 "$dst")
    if [[ "$src_hash" != "$verify_hash" ]]; then
      log_error "Checksum verification failed after copying '${dst}'!"
      exit 1
    fi
    log_success "Migrated '$(basename "$dst")' (SHA256 verified, permissions 0600)."
  else
    log_info "[DRY RUN] Would copy '${src}' -> '${dst}' (mode 0600)."
  fi
done

# ── Step 3: Persistent Storage Migration ──────────────────────────────────────
log_step "Step 3/5: Idempotent Persistent Storage Migration..."

SRC_STORAGE="${APP_DIR}/backend/storage"
DST_STORAGE="${SHARED_DIR}/storage"

if [[ ! -d "${SRC_STORAGE}" ]]; then
  log_error "Source storage directory '${SRC_STORAGE}' does not exist!"
  exit 1
fi

mkdir -p "${DST_STORAGE}/app/public"
mkdir -p "${DST_STORAGE}/app/private/product_offer_sheets"
mkdir -p "${DST_STORAGE}/framework/cache"
mkdir -p "${DST_STORAGE}/framework/sessions"
mkdir -p "${DST_STORAGE}/framework/views"
mkdir -p "${DST_STORAGE}/logs"

# Check for conflict in existing destination files
log_info "Auditing source files in '${SRC_STORAGE}' against destination '${DST_STORAGE}'..."
conflict_count=0
new_files=0
matching_files=0

while IFS= read -r -d '' src_file; do
  rel_path="${src_file#"${SRC_STORAGE}/"}"
  dst_file="${DST_STORAGE}/${rel_path}"

  if [[ -f "${dst_file}" ]]; then
    src_sum=$(compute_sha256 "${src_file}")
    dst_sum=$(compute_sha256 "${dst_file}")
    if [[ "${src_sum}" == "${dst_sum}" ]]; then
      matching_files=$((matching_files + 1))
    else
      log_error "CONFLICT: Destination storage file '${dst_file}' exists with different content!"
      conflict_count=$((conflict_count + 1))
    fi
  else
    new_files=$((new_files + 1))
  fi
done < <(find "${SRC_STORAGE}" -type f -print0)

if [[ ${conflict_count} -gt 0 ]]; then
  log_error "Storage migration halted: ${conflict_count} conflicting file(s) found in destination."
  log_error "Manual review required. The migration script will NEVER silently overwrite conflicting persistent data."
  exit 1
fi

log_success "Storage pre-check clean (${matching_files} already identical, ${new_files} files to synchronize)."

if [[ "${EXECUTE}" == "true" ]]; then
  log_info "Synchronizing storage files to '${DST_STORAGE}'..."
  # Copy preserving timestamps and permissions, without overwriting unless identical
  cp -R -p -n "${SRC_STORAGE}/"* "${DST_STORAGE}/" 2>/dev/null || true

  # Verify critical paths and permissions
  chmod -R 775 "${DST_STORAGE}/framework" "${DST_STORAGE}/logs" 2>/dev/null || true
  log_success "Persistent storage synchronized into '${DST_STORAGE}'."
else
  log_info "[DRY RUN] Would copy ${new_files} files to '${DST_STORAGE}' preserving timestamps and permissions."
fi

# ── Step 4: Baseline Release Creation & Safe .next Copy ───────────────────────
log_step "Step 4/5: Baseline Release Creation & .next Symlink Dereferencing..."

SOURCE_NEXT="${APP_DIR}/.next"
if [[ ! -e "${SOURCE_NEXT}" && ! -L "${SOURCE_NEXT}" ]]; then
  log_error "Source Next.js path '${SOURCE_NEXT}' does not exist!"
  exit 1
fi

RESOLVED_BUILD=""
if [[ -L "${SOURCE_NEXT}" ]]; then
  RESOLVED_BUILD=$(resolve_realpath "${SOURCE_NEXT}")
  if [[ -z "${RESOLVED_BUILD}" || ! -d "${RESOLVED_BUILD}" ]]; then
    log_error "DANGLING SYMLINK: Source .next '${SOURCE_NEXT}' points to non-existent directory '${RESOLVED_BUILD:-none}'!"
    exit 1
  fi
  log_info "Resolved source .next symlink to physical directory: ${RESOLVED_BUILD}"
elif [[ -d "${SOURCE_NEXT}" ]]; then
  RESOLVED_BUILD="${SOURCE_NEXT}"
  log_info "Source .next is already a real directory: ${RESOLVED_BUILD}"
else
  log_error "Source .next is neither a directory nor a valid symlink!"
  exit 1
fi

# Validate production Next.js build artifacts in resolved build
log_info "Validating production Next.js build artifacts in '${RESOLVED_BUILD}'..."
for art in "BUILD_ID" "build-manifest.json" "static/chunks"; do
  if [[ ! -e "${RESOLVED_BUILD}/${art}" ]]; then
    log_error "INVALID NEXT.JS BUILD: Missing required artifact '${art}' in '${RESOLVED_BUILD}'!"
    exit 1
  fi
done

chunk_count=$(find "${RESOLVED_BUILD}/static/chunks" -maxdepth 1 -name "*.js" 2>/dev/null | wc -l)
if [[ "${chunk_count}" -lt 1 ]]; then
  log_error "INVALID NEXT.JS BUILD: No static chunk scripts found in '${RESOLVED_BUILD}/static/chunks'!"
  exit 1
fi
log_success "Next.js build artifacts validated (${chunk_count} static chunk files ready)."

# Create baseline release directory
git_sha=$(git -C "${APP_DIR}" rev-parse --short HEAD 2>/dev/null || echo "baseline")
timestamp=$(date -u '+%Y%m%d_%H%M%S')
BASELINE_ID="${MIGRATE_BASELINE_ID:-}"
if [[ -z "${BASELINE_ID}" && -f "${RELEASES_DIR}/CURRENT_RELEASE" ]]; then
  existing_id=$(cat "${RELEASES_DIR}/CURRENT_RELEASE" 2>/dev/null || true)
  if [[ -n "${existing_id}" && -d "${RELEASES_DIR}/${existing_id}" ]]; then
    BASELINE_ID="${existing_id}"
  fi
fi
[[ -z "${BASELINE_ID}" ]] && BASELINE_ID="release_${timestamp}_${git_sha}"
BASELINE_DIR="${RELEASES_DIR}/${BASELINE_ID}"

log_info "Target Baseline Release: ${BASELINE_ID}"
log_info "Target Directory:        ${BASELINE_DIR}"

if [[ "${EXECUTE}" == "true" ]]; then
  if [[ -d "${BASELINE_DIR}" ]]; then
    if [[ -f "${BASELINE_DIR}/.next/BUILD_ID" && (-f "${BASELINE_DIR}/backend/public/index.php" || -f "${BASELINE_DIR}/backend/artisan") ]]; then
      log_warn "Baseline release directory '${BASELINE_DIR}' already exists and contains valid artifacts."
      log_info "Preserving existing baseline release without re-copying (idempotent)."
    else
      log_error "CONFLICT: Target baseline directory '${BASELINE_DIR}' exists but is incomplete or invalid!"
      log_error "Aborting migration to prevent data corruption. Manual review required."
      exit 1
    fi
  else
    mkdir -p "${BASELINE_DIR}"
    mkdir -p "${BASELINE_DIR}/backend"
    mkdir -p "${BASELINE_DIR}/.next"

    # Copy backend source (excluding legacy storage/env)
    log_info "Copying backend application source into baseline release..."
    (cd "${APP_DIR}/backend" && tar -cf - .) | (cd "${BASELINE_DIR}/backend" && tar -xf -)
    rm -rf "${BASELINE_DIR}/backend/storage" "${BASELINE_DIR}/backend/.env"

    # Dereference and copy resolved .next build into a real directory (including hidden files!)
    log_info "Copying resolved Next.js build into baseline release as a real directory (including dotfiles)..."
    (cd "${RESOLVED_BUILD}" && tar -cf - .) | (cd "${BASELINE_DIR}/.next" && tar -xf -)

    # Copy root package.json and config files if present
    for cfg in "next.config.ts" "next.config.js" "next.config.mjs" "package.json" "package-lock.json" "tsconfig.json"; do
      [[ -f "${APP_DIR}/${cfg}" ]] && cp -p "${APP_DIR}/${cfg}" "${BASELINE_DIR}/"
    done

    # Copy scripts/ into baseline release for admin proxy and tooling
    if [[ -d "${APP_DIR}/scripts" ]]; then
      log_info "Copying scripts/ into baseline release..."
      mkdir -p "${BASELINE_DIR}/scripts"
      (cd "${APP_DIR}/scripts" && tar -cf - .) | (cd "${BASELINE_DIR}/scripts" && tar -xf -)
    fi

    # Copy public/ into baseline release for static assets
    if [[ -d "${APP_DIR}/public" ]]; then
      log_info "Copying public/ into baseline release..."
      mkdir -p "${BASELINE_DIR}/public"
      (cd "${APP_DIR}/public" && tar -cf - .) | (cd "${BASELINE_DIR}/public" && tar -xf -)
    fi

    # Symlink node_modules for Next.js runtime
    if [[ -d "${APP_DIR}/node_modules" ]]; then
      ln -sfn "${APP_DIR}/node_modules" "${BASELINE_DIR}/node_modules"
    fi

    # Wire shared symlinks
    log_info "Wiring shared persistent storage and environment symlinks..."
    ln -sfn "${DST_STORAGE}" "${BASELINE_DIR}/backend/storage"
    ln -sfn "${SHARED_DIR}/backend.env" "${BASELINE_DIR}/backend/.env"
    [[ -f "${SHARED_DIR}/.env.production" ]] && ln -sfn "${SHARED_DIR}/.env.production" "${BASELINE_DIR}/.env.production"
    [[ -f "${SHARED_DIR}/.env.local" ]] && ln -sfn "${SHARED_DIR}/.env.local" "${BASELINE_DIR}/.env.local"

    # Write immutable compiled ReleaseIdentity.php and release metadata
    baseline_build_id=""
    [[ -f "${BASELINE_DIR}/.next/BUILD_ID" ]] && baseline_build_id=$(cat "${BASELINE_DIR}/.next/BUILD_ID" 2>/dev/null | tr -d '\r\n')

    mkdir -p "${BASELINE_DIR}/backend/app/Support"
    cat << PHP > "${BASELINE_DIR}/backend/app/Support/ReleaseIdentity.php"
<?php

namespace App\Support;

/**
 * ReleaseIdentity
 *
 * Immutable, compile-time release metadata baked into baseline release.
 * Class constants represent bytecode compiled into OPcache memory.
 */
class ReleaseIdentity
{
    public const COMMIT_SHA = '${git_sha}';
    public const RELEASE_ID = '${BASELINE_ID}';
    public const BUILD_ID = '${baseline_build_id}';
    public const BUILT_AT = '${timestamp}';

    private static ?array \$memoized = null;

    public static function commitSha(): ?string
    {
        return self::COMMIT_SHA !== '' ? self::COMMIT_SHA : null;
    }

    public static function releaseId(): ?string
    {
        return self::RELEASE_ID !== '' ? self::RELEASE_ID : null;
    }

    public static function buildId(): ?string
    {
        return self::BUILD_ID !== '' ? self::BUILD_ID : null;
    }

    public static function builtAt(): ?string
    {
        return self::BUILT_AT !== '' ? self::BUILT_AT : null;
    }

    public static function get(): array
    {
        if (self::\$memoized !== null) {
            return self::\$memoized;
        }

        if (self::COMMIT_SHA !== '' && self::RELEASE_ID !== '') {
            self::\$memoized = [
                'commit_sha' => self::COMMIT_SHA,
                'release_id' => self::RELEASE_ID,
                'build_id' => self::BUILD_ID !== '' ? self::BUILD_ID : null,
                'built_at' => self::BUILT_AT !== '' ? self::BUILT_AT : null,
                'source' => 'compiled_constant',
            ];
            return self::\$memoized;
        }

        \$physicalBackendDir = dirname(__DIR__, 2);
        \$candidates = [
            \$physicalBackendDir . '/RELEASE_METADATA.json',
            dirname(\$physicalBackendDir) . '/RELEASE_METADATA.json',
        ];

        foreach (\$candidates as \$file) {
            if (is_file(\$file)) {
                \$content = @file_get_contents(\$file);
                if (\$content !== false) {
                    \$json = json_decode(\$content, true);
                    if (is_array(\$json) && !empty(\$json['commit_sha'])) {
                        self::\$memoized = [
                            'commit_sha' => (string) (\$json['commit_sha'] ?? ''),
                            'release_id' => (string) (\$json['release_id'] ?? ''),
                            'build_id' => !empty(\$json['build_id']) ? (string) \$json['build_id'] : null,
                            'built_at' => !empty(\$json['deployed_at']) ? (string) \$json['deployed_at'] : (!empty(\$json['created_at']) ? (string) \$json['created_at'] : null),
                            'source' => 'physical_release_metadata',
                        ];
                        return self::\$memoized;
                    }
                }
            }
        }

        self::\$memoized = [
            'commit_sha' => null,
            'release_id' => null,
            'build_id' => null,
            'built_at' => null,
            'source' => 'unversioned',
        ];
        return self::\$memoized;
    }

    public static function resetForTesting(): void
    {
        self::\$memoized = null;
    }
}
PHP

    cat << JSON > "${BASELINE_DIR}/RELEASE_METADATA.json"
{
  "release_id": "${BASELINE_ID}",
  "commit_sha": "${git_sha}",
  "frontend_sha": "${git_sha}",
  "backend_sha": "${git_sha}",
  "build_id": "${baseline_build_id}",
  "created_at": "${timestamp}",
  "is_baseline": true
}
JSON
    cp -p "${BASELINE_DIR}/RELEASE_METADATA.json" "${BASELINE_DIR}/backend/RELEASE_METADATA.json"

    # Verify baseline release integrity
    if [[ -L "${BASELINE_DIR}/.next" ]]; then
      log_error "BASELINE CORRUPTION: ${BASELINE_DIR}/.next is a symlink instead of a real directory!"
      exit 1
    fi
    if [[ ! -f "${BASELINE_DIR}/.next/BUILD_ID" || ! -f "${BASELINE_DIR}/.next/build-manifest.json" ]]; then
      log_error "BASELINE CORRUPTION: ${BASELINE_DIR}/.next missing expected build manifests!"
      exit 1
    fi

    # Verify hidden file preservation
    src_dotfiles=$(find "${RESOLVED_BUILD}" -name ".*" ! -name "." ! -name ".." 2>/dev/null | wc -l)
    dst_dotfiles=$(find "${BASELINE_DIR}/.next" -name ".*" ! -name "." ! -name ".." 2>/dev/null | wc -l)
    if [[ ${src_dotfiles} -gt 0 && ${dst_dotfiles} -lt ${src_dotfiles} ]]; then
      log_error "BASELINE CORRUPTION: Hidden files were dropped during .next copy (${src_dotfiles} source vs ${dst_dotfiles} destination)!"
      exit 1
    fi
    log_success "Baseline release created and verified in ${BASELINE_DIR} (${dst_dotfiles} hidden entries and manifests intact)."
  fi
else
  log_info "[DRY RUN] Would create baseline release directory '${BASELINE_DIR}' with dereferenced .next build (including dotfiles)."
fi

# ── Step 5: Atomic Root Symlink Setup ─────────────────────────────────────────
log_step "Step 5/5: Atomic Root Symlink Pointer Setup..."

if [[ "${EXECUTE}" == "true" ]]; then
  log_info "Atomically pointing '${CURRENT_LINK}' -> '${BASELINE_DIR}'..."
  atomic_symlink_swap "${BASELINE_DIR}" "${CURRENT_LINK}"
  echo "${BASELINE_ID}" > "${RELEASES_DIR}/CURRENT_RELEASE"

  # Ensure proper application user ownership if running as root
  if [[ "$(id -u)" -eq 0 ]]; then
    chown -R ayaan:ayaan "${SHARED_DIR}" "${RELEASES_DIR}" 2>/dev/null || true
    chown -h ayaan:ayaan "${CURRENT_LINK}" 2>/dev/null || true
  fi

  log_success "Root symlink 'current' atomically created pointing to baseline release."
else
  log_info "[DRY RUN] Would atomically link '${CURRENT_LINK}' -> '${BASELINE_DIR}'."
fi

echo ""
echo "=========================================================="
if [[ "${EXECUTE}" == "true" ]]; then
  echo "✔ MIGRATION COMPLETED SUCCESSFULLY!"
  echo "  Active Release: ${BASELINE_ID}"
  echo "  Root Pointer:   ${CURRENT_LINK} -> ${BASELINE_DIR}"
  echo "  Shared Storage: ${DST_STORAGE}"
  echo ""
  echo "Next Required Steps (Manual Service Reconfiguration):"
  echo "  1. Update Nginx root to: /var/www/ayaan/current/backend/public"
  echo "  2. Update Nginx /storage/ alias to: /var/www/ayaan/shared/storage/app/public/"
  echo "  3. Update PM2 cwd to: /var/www/ayaan/current (ayaan-customer, ayaan-admin)"
  echo "  4. Update Supervisor command to: php /var/www/ayaan/current/backend/artisan queue:work ..."
  echo "  5. Reload Nginx, PM2, and Supervisor."
else
  echo "✔ DRY-RUN AUDIT COMPLETED CLEANLY!"
  echo "  Zero files modified. All source files and symlinks remain intact."
  echo "  To execute migration: scripts/migrate-to-shared-release.sh --execute"
fi
echo "=========================================================="
exit 0

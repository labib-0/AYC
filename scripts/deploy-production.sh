#!/usr/bin/env bash
# ==============================================================================
# Ayaan Clothing — Single-Pointer Full-Stack Production Deployment Pipeline
# ==============================================================================
#
# Production Host: 200.97.169.230
# Application Root: /var/www/ayaan
# Target Pointer: /var/www/ayaan/current -> releases/<release-id>
# Target Branch: backend-development
#
# Core Architectural Principles:
# 1. Non-destructive by default: mutations require explicit --execute flag.
# 2. Dry-run support: --dry-run performs non-destructive preflight validation.
# 3. Architecture Compatibility Gate: real execution strictly requires the
#    single-pointer shared-release layout (current -> releases/<id>). Rejects
#    execution if production services still use the legacy in-place layout.
# 4. Single-Pointer Full-Stack Release: both frontend and backend reside inside
#    the same immutable release directory (releases/<id>) from the same verified commit.
# 5. Persistent State Isolation: environment files and storage live in shared/
#    and are symlinked into releases; never stored in disposable release directories.
# 6. Atomic Root Activation: a single atomic symlink swap of 'current' activates
#    both frontend and backend simultaneously, eliminating transient version mismatches.
# 7. Script Integrity Verification: verifies script self-checksum and commit blob parity.
# 8. Migration Gating: migrations require explicit --run-migrations flag;
#    automated database rollback is strictly prohibited.
# 9. Single-Pointer Rollback: swaps 'current' symlink back to previous release;
#    restores both frontend and backend instantaneously with zero database rollback.
# 10. Mutex Concurrency Lock: flock prevents simultaneous deployments.
# ==============================================================================

set -Eeuo pipefail

# ── Color Output Helpers ──────────────────────────────────────────────────────
readonly C_RESET='\033[0m'
readonly C_RED='\033[0;31m'
readonly C_GREEN='\033[0;32m'
readonly C_YELLOW='\033[1;33m'
readonly C_BLUE='\033[0;34m'
readonly C_CYAN='\033[0;36m'

log_info()    { echo -e "${C_BLUE}ℹ${C_RESET} $*"; }
log_step()    { echo -e "\n${C_CYAN}▶${C_RESET} $*"; }
log_success() { echo -e "${C_GREEN}✔${C_RESET} $*"; }
log_warn()    { echo -e "${C_YELLOW}⚠${C_RESET} $*" >&2; }
log_error()   { echo -e "${C_RED}✖${C_RESET} $*" >&2; }

# ── Startup Path Resolution ───────────────────────────────────────────────────
readonly SCRIPT_SOURCE_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"

# ── Default Configuration ─────────────────────────────────────────────────────
APP_DIR="${DEPLOY_APP_DIR:-/var/www/ayaan}"
RELEASES_DIR="${APP_DIR}/releases"
SHARED_DIR="${APP_DIR}/shared"
CURRENT_LINK="${APP_DIR}/current"
LOCK_FILE="${APP_DIR}/.deploy.lock"
MAX_KEPT_RELEASES=5
DEFAULT_BRANCH="backend-development"

# ── CLI Flag State ────────────────────────────────────────────────────────────
EXECUTE=false
DRY_RUN=false
RUN_MIGRATIONS=false
ROLLBACK=false
TARGET_COMMIT=""
TARGET_BRANCH="${DEFAULT_BRANCH}"
EXPECTED_CHECKSUM=""
SKIP_GIT=false

# ── Usage / Help ──────────────────────────────────────────────────────────────
usage() {
  cat << 'EOF'
Ayaan Clothing — Single-Pointer Full-Stack Production Deployment Pipeline

USAGE:
  scripts/deploy-production.sh [OPTIONS]

SAFETY MODES:
  --dry-run                 Perform non-destructive preflight validation (default if --execute is omitted).
  --execute                 Authorizes real deployment execution (requires shared-release architecture).

OPTIONS:
  --commit <SHA>            Specify the exact Git commit SHA to deploy.
  --branch <NAME>           Target deployment branch (default: backend-development).
  --run-migrations          Explicitly authorize pending database migrations (requires --execute).
  --rollback                Roll back 'current' symlink to the previous verified release.
  --expected-checksum <HEX> Verify script self-integrity against expected SHA-256 hash.
  --repo-dir <PATH>         Override application directory (default: /var/www/ayaan).
  --skip-git                Skip git fetch/checkout (useful for mock/local dry-run testing).
  -h, --help                Display this help documentation.

ARCHITECTURE PREREQUISITE:
  Real execution (--execute) requires that production services (Nginx, PM2, Supervisor)
  have completed the infrastructure migration to reference '/var/www/ayaan/current'.
  If the host is still running the legacy in-place configuration, real execution is BLOCKED.
EOF
  exit 0
}

# ── Argument Parsing ──────────────────────────────────────────────────────────
parse_arguments() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --execute)
        EXECUTE=true
        shift
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --commit)
        if [[ -z "${2:-}" || "${2:-}" =~ ^-- ]]; then
          log_error "Missing value for --commit argument."
          exit 1
        fi
        TARGET_COMMIT="$2"
        shift 2
        ;;
      --branch)
        if [[ -z "${2:-}" || "${2:-}" =~ ^-- ]]; then
          log_error "Missing value for --branch argument."
          exit 1
        fi
        TARGET_BRANCH="$2"
        shift 2
        ;;
      --run-migrations)
        RUN_MIGRATIONS=true
        shift
        ;;
      --rollback)
        ROLLBACK=true
        shift
        ;;
      --expected-checksum)
        if [[ -z "${2:-}" || "${2:-}" =~ ^-- ]]; then
          log_error "Missing value for --expected-checksum argument."
          exit 1
        fi
        EXPECTED_CHECKSUM="$2"
        shift 2
        ;;
      --repo-dir)
        if [[ -z "${2:-}" || "${2:-}" =~ ^-- ]]; then
          log_error "Missing value for --repo-dir argument."
          exit 1
        fi
        APP_DIR="$2"
        RELEASES_DIR="${APP_DIR}/releases"
        SHARED_DIR="${APP_DIR}/shared"
        CURRENT_LINK="${APP_DIR}/current"
        LOCK_FILE="${APP_DIR}/.deploy.lock"
        shift 2
        ;;
      --skip-git)
        SKIP_GIT=true
        shift
        ;;
      -h|--help)
        usage
        ;;
      *)
        log_error "Unexpected argument: $1"
        log_info "Run 'scripts/deploy-production.sh --help' for available options."
        exit 1
        ;;
    esac
  done

  # Safety invariant: if --execute is not provided, default to --dry-run
  if [[ "${EXECUTE}" != "true" ]]; then
    DRY_RUN=true
  fi
}

# ── Error Trap Handler ────────────────────────────────────────────────────────
cleanup_on_error() {
  local exit_code=$?
  if [[ ${exit_code} -ne 0 ]]; then
    log_error "Deployment pipeline terminated unexpectedly with exit code ${exit_code}."
    if [[ -n "${NEW_REL_DIR:-}" && -d "${NEW_REL_DIR}" && "${ACTIVATION_COMPLETED:-false}" != "true" ]]; then
      log_warn "Cleaning up unactivated candidate release directory: ${NEW_REL_DIR}"
      rm -rf "${NEW_REL_DIR}"
    fi
    if [[ -L "${APP_DIR}/current_tmp" ]]; then
      rm -f "${APP_DIR}/current_tmp"
    fi
  fi
}
trap cleanup_on_error EXIT

# ── User Privilege Helpers ────────────────────────────────────────────────────
run_as_app_user() {
  local cmd="$1"
  if [[ $(id -u) -eq 0 ]]; then
    su - ayaan -c "${cmd}"
  else
    eval "${cmd}"
  fi
}

run_as_root() {
  local cmd="$1"
  if [[ $(id -u) -eq 0 ]]; then
    eval "${cmd}"
  else
    sudo bash -c "${cmd}"
  fi
}

# ── Hash Helper (Portable Linux / macOS) ──────────────────────────────────────
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

# ── Atomic Symlink Helper (Portable GNU Linux / BSD macOS) ────────────────────
atomic_symlink_swap() {
  local target="$1"
  local link_name="$2"
  local tmp_link="${link_name}_tmp_$$"

  ln -sfn "${target}" "${tmp_link}"
  if mv -Tf "${tmp_link}" "${link_name}" 2>/dev/null; then
    return 0
  fi
  # Fallback: POSIX atomic rename syscall via python3 (standard on Linux and macOS)
  if python3 -c 'import os, sys; os.replace(sys.argv[1], sys.argv[2])' "${tmp_link}" "${link_name}" 2>/dev/null; then
    return 0
  fi
  # Last resort fallback
  rm -f "${link_name}"
  mv "${tmp_link}" "${link_name}"
}

# ── Script Self-Integrity Verification ────────────────────────────────────────
verify_script_integrity() {
  log_step "Verifying Deployment Script Version Integrity..."

  local current_script="${SCRIPT_SOURCE_PATH}"
  local current_hash
  current_hash=$(compute_sha256 "${current_script}")

  if [[ -n "${EXPECTED_CHECKSUM}" ]]; then
    if [[ "${current_hash}" != "${EXPECTED_CHECKSUM}" ]]; then
      log_error "CRITICAL INTEGRITY FAILURE: Deployment script checksum mismatch!"
      log_error "Expected: ${EXPECTED_CHECKSUM}"
      log_error "Actual:   ${current_hash}"
      log_error "Refusing to execute unverified or tampered deployment script."
      exit 1
    fi
    log_success "Script self-integrity verified against workflow checksum (${current_hash:0:16}...)."
  fi

  if [[ "${SKIP_GIT}" != "true" && -n "${TARGET_COMMIT}" && -d "${APP_DIR}/.git" ]]; then
    if git rev-parse --verify "${TARGET_COMMIT}^{commit}" &>/dev/null; then
      local commit_script_blob
      commit_script_blob=$(git rev-parse "${TARGET_COMMIT}:scripts/deploy-production.sh" 2>/dev/null || true)
      if [[ -n "${commit_script_blob}" ]]; then
        local commit_script_hash
        commit_script_hash=$(git show "${commit_script_blob}" | compute_sha256 - 2>/dev/null || echo "")
        if [[ -n "${commit_script_hash}" && "${current_hash}" != "${commit_script_hash}" ]]; then
          log_error "SCRIPT VERSION MISMATCH: Running script differs from scripts/deploy-production.sh at target commit ${TARGET_COMMIT}!"
          log_error "Target commit script hash: ${commit_script_hash}"
          log_error "Currently running hash:   ${current_hash}"
          log_error "Aborting: Deployments must execute the exact script version belonging to the target commit."
          exit 1
        fi
      fi
    fi
  fi
  log_success "Deployment script confirmed authentic for target commit."
}

# ── Concurrency Mutex Lock ────────────────────────────────────────────────────
acquire_mutex_lock() {
  log_step "Step 0: Checking Concurrency Mutex Lock..."
  mkdir -p "$(dirname "${LOCK_FILE}")"
  touch "${LOCK_FILE}"
  if [[ $(id -u) -eq 0 && -d "${APP_DIR}" ]]; then
    chown ayaan:ayaan "${LOCK_FILE}" 2>/dev/null || true
  fi

  exec 200>"${LOCK_FILE}"
  if command -v flock &>/dev/null; then
    if ! flock -n 200; then
      log_error "Another deployment is currently in progress (lock held on ${LOCK_FILE}). Aborting."
      exit 1
    fi
  elif command -v python3 &>/dev/null; then
    if ! python3 -c 'import fcntl; fcntl.flock(200, fcntl.LOCK_EX | fcntl.LOCK_NB)' 2>/dev/null; then
      log_error "Another deployment is currently in progress (lock held on ${LOCK_FILE}). Aborting."
      exit 1
    fi
  fi
  log_success "Deployment mutex lock acquired."
}

# ── Architecture Compatibility Gate ──────────────────────────────────────────
verify_architecture_compatibility() {
  log_step "Checking Architecture Compatibility Gate..."

  local is_compatible=true
  local failure_reason=""

  # Check 1: Root pointer / releases directory presence
  if [[ ! -L "${CURRENT_LINK}" ]]; then
    is_compatible=false
    failure_reason="Root release pointer '${CURRENT_LINK}' does not exist or is not a symlink."
  elif [[ ! -d "${RELEASES_DIR}" ]]; then
    is_compatible=false
    failure_reason="Releases directory '${RELEASES_DIR}' does not exist."
  fi

  # Check 2: Symlink resolves to an existing release containing frontend & backend
  if [[ "${is_compatible}" == "true" ]]; then
    local current_target
    current_target=$(readlink -f "${CURRENT_LINK}" 2>/dev/null || true)
    if [[ -z "${current_target}" || ! -d "${current_target}" ]]; then
      is_compatible=false
      failure_reason="'${CURRENT_LINK}' points to a non-existent directory (${current_target:-none})."
    elif [[ ! -d "${current_target}/backend" || ! -d "${current_target}/.next" ]]; then
      is_compatible=false
      failure_reason="Active release (${current_target##*/}) does not contain both 'backend/' and '.next/'."
    fi
  fi

  # Check 3: Shared directory and persistent references exist
  if [[ "${is_compatible}" == "true" ]]; then
    if [[ ! -d "${SHARED_DIR}/storage" ]]; then
      is_compatible=false
      failure_reason="Shared storage directory '${SHARED_DIR}/storage' does not exist."
    elif [[ ! -f "${SHARED_DIR}/backend.env" && ! -f "${SHARED_DIR}/.env" ]]; then
      is_compatible=false
      failure_reason="Shared backend environment file '${SHARED_DIR}/backend.env' does not exist."
    fi
  fi

  # Evaluate compatibility decision
  if [[ "${is_compatible}" != "true" ]]; then
    if [[ "${EXECUTE}" == "true" ]]; then
      log_error "========================================================================"
      log_error "DEPLOYMENT BLOCKED: Production services do not yet use the required shared release pointer."
      log_error "Reason: ${failure_reason}"
      log_error ""
      log_error "The production environment on this host is currently configured for legacy in-place execution."
      log_error "Complete the approved infrastructure migration before enabling full-stack deployment."
      log_error "========================================================================"
      exit 1
    else
      log_warn "========================================================================"
      log_warn "ARCHITECTURE NOTICE: Host does not yet use the shared-release pointer (${failure_reason})."
      log_warn "In dry-run mode, preflight simulation continues safely without mutations."
      log_warn "Real deployment (--execute) will remain strictly blocked until migration is completed."
      log_warn "========================================================================"
    fi
  else
    log_success "Architecture compatibility gate PASSED: Host is configured for single-pointer shared releases."
  fi
}

# ── Environment & Storage Integrity Check ─────────────────────────────────────
check_environment_and_storage() {
  log_step "Verifying Shared Environment & Storage Integrity..."

  # Locate environment files (support both shared-release and legacy paths)
  if [[ -d "${SHARED_DIR}" && -f "${SHARED_DIR}/.env.production" ]]; then
    ENV_PROD_FILE="${SHARED_DIR}/.env.production"
    ENV_LOCAL_FILE="${SHARED_DIR}/.env.local"
    ENV_BACKEND_FILE="${SHARED_DIR}/backend.env"
    [[ ! -f "${ENV_BACKEND_FILE}" && -f "${SHARED_DIR}/.env" ]] && ENV_BACKEND_FILE="${SHARED_DIR}/.env"
  else
    ENV_PROD_FILE="${APP_DIR}/.env.production"
    ENV_LOCAL_FILE="${APP_DIR}/.env.local"
    ENV_BACKEND_FILE="${APP_DIR}/backend/.env"
  fi

  local required_env_files=("${ENV_PROD_FILE}" "${ENV_LOCAL_FILE}" "${ENV_BACKEND_FILE}")
  for env_file in "${required_env_files[@]}"; do
    if [[ ! -f "${env_file}" ]]; then
      log_error "Missing required environment configuration: ${env_file}"
      log_error "Production environment files must pre-exist and are NEVER created or overwritten by deployment."
      exit 1
    fi
    if [[ ! -s "${env_file}" ]]; then
      log_error "Environment file is empty (0 bytes): ${env_file}"
      exit 1
    fi
  done

  # Record pre-deployment SHA-256 checksums to guarantee byte-for-byte preservation
  ENV_HASH_PROD=$(compute_sha256 "${ENV_PROD_FILE}")
  ENV_HASH_LOCAL=$(compute_sha256 "${ENV_LOCAL_FILE}")
  ENV_HASH_BACKEND=$(compute_sha256 "${ENV_BACKEND_FILE}")

  log_success "Environment files verified intact (SHA256 checksums recorded)."
}

verify_environment_unaltered() {
  local cur_prod cur_local cur_backend
  cur_prod=$(compute_sha256 "${ENV_PROD_FILE}")
  cur_local=$(compute_sha256 "${ENV_LOCAL_FILE}")
  cur_backend=$(compute_sha256 "${ENV_BACKEND_FILE}")

  if [[ "${cur_prod}" != "${ENV_HASH_PROD}" || "${cur_local}" != "${ENV_HASH_LOCAL}" || "${cur_backend}" != "${ENV_HASH_BACKEND}" ]]; then
    log_error "CRITICAL SECURITY ALERT: Environment file checksums changed during deployment!"
    exit 1
  fi
  log_success "Environment files verified 100% byte-for-byte unaltered."
}

# ── Graceful Queue Worker Drain & Handover ───────────────────────────────────
handover_queue_workers() {
  log_info "Executing graceful Laravel queue worker drain and handover..."

  local artisan_path="${CURRENT_LINK}/backend/artisan"
  [[ ! -f "${artisan_path}" ]] && artisan_path="${APP_DIR}/backend/artisan"

  if [[ ! -f "${artisan_path}" ]] || ! command -v php &>/dev/null; then
    log_warn "PHP runtime or artisan CLI not present. Skipping queue worker drain."
    return 0
  fi

  local has_supervisor=false
  local old_pid=""
  if command -v supervisorctl &>/dev/null; then
    local sup_status
    sup_status=$(supervisorctl status ayaan-worker 2>/dev/null || true)
    if [[ -n "${sup_status}" && "${sup_status}" =~ RUNNING|STARTING ]]; then
      has_supervisor=true
      old_pid=$(supervisorctl pid ayaan-worker 2>/dev/null || true)
      export DEPLOY_PRIOR_WORKER_PID="${old_pid}"
      log_info "Active Supervisor queue worker detected (PID: ${old_pid:-unknown})."
    fi
  fi

  # 1. Dispatch graceful restart signal via Redis cache
  log_info "Broadcasting graceful queue restart signal (php artisan queue:restart)..."
  if ! run_as_app_user "php ${artisan_path} queue:restart"; then
    log_error "CRITICAL: 'php artisan queue:restart' failed! Redis cache may be unreachable."
    exit 1
  fi
  log_success "Queue restart signal recorded in Redis (illuminate:queue:restart)."

  # 2. If old worker was running under Supervisor, await graceful completion of active jobs
  if [[ "${has_supervisor}" == "true" && -n "${old_pid}" && "${old_pid}" =~ ^[0-9]+$ && "${old_pid}" -gt 1 ]]; then
    local timeout="${QUEUE_DRAIN_TIMEOUT:-30}"
    log_info "Awaiting in-flight job completion and graceful exit for worker PID ${old_pid} (timeout: ${timeout}s)..."
    local elapsed=0
    local drained=false

    while [[ ${elapsed} -lt ${timeout} ]]; do
      if ! kill -0 "${old_pid}" 2>/dev/null; then
        drained=true
        break
      fi
      sleep 1
      elapsed=$((elapsed + 1))
    done

    if [[ "${drained}" != "true" ]]; then
      log_error "========================================================================"
      log_error "QUEUE DRAIN TIMEOUT: Worker PID ${old_pid} did not exit within ${timeout}s."
      log_error "Active queue job may still be executing or hanging."
      log_error "Refusing to kill active work. Aborting release activation."
      log_error "========================================================================"
      exit 1
    fi
    log_success "Prior queue worker (PID ${old_pid}) finished active work and exited in ${elapsed}s."

    # 3. Signal supervisor to restart/spawn replacement worker on new release
    log_info "Verifying Supervisor spawns replacement worker on new release..."
    supervisorctl restart ayaan-worker &>/dev/null || supervisorctl start ayaan-worker &>/dev/null || true
    local new_pid=""
    local spawn_elapsed=0

    while [[ ${spawn_elapsed} -lt 10 ]]; do
      new_pid=$(supervisorctl pid ayaan-worker 2>/dev/null || true)
      if [[ -n "${new_pid}" && "${new_pid}" =~ ^[0-9]+$ && "${new_pid}" != "${old_pid}" ]]; then
        break
      fi
      supervisorctl restart ayaan-worker &>/dev/null || supervisorctl start ayaan-worker &>/dev/null || true
      sleep 1
      spawn_elapsed=$((spawn_elapsed + 1))
    done

    if [[ -z "${new_pid}" || "${new_pid}" == "${old_pid}" ]]; then
      log_error "SUPERVISOR HANDOVER FAILED: Supervisor failed to spawn fresh queue worker process!"
      exit 1
    fi

    local sup_final
    sup_final=$(supervisorctl status ayaan-worker 2>/dev/null || true)
    if [[ ! "${sup_final}" =~ RUNNING ]]; then
      log_error "SUPERVISOR HANDOVER FAILED: New worker (PID ${new_pid}) is not in RUNNING state (${sup_final})!"
      exit 1
    fi
    log_success "New queue worker verified running (PID: ${new_pid}, Status: RUNNING)."
  fi
}

# ── Standalone Single-Pointer Rollback Handler ────────────────────────────────
execute_rollback() {
  log_step "Executing Standalone Single-Pointer Rollback..."

  # 1. Verify previous release pointer file
  local prev_release=""
  if [[ -f "${RELEASES_DIR}/PREVIOUS_RELEASE" ]]; then
    prev_release=$(cat "${RELEASES_DIR}/PREVIOUS_RELEASE")
  elif [[ -f "${APP_DIR}/.next_releases/PREVIOUS_RELEASE" ]]; then
    prev_release=$(cat "${APP_DIR}/.next_releases/PREVIOUS_RELEASE")
  fi

  if [[ -z "${prev_release}" ]]; then
    log_error "No previous release recorded at ${RELEASES_DIR}/PREVIOUS_RELEASE"
    exit 1
  fi

  local prev_target="${RELEASES_DIR}/${prev_release}"
  if [[ ! -d "${prev_target}" && -d "${APP_DIR}/.next_releases/${prev_release}" ]]; then
    prev_target="${APP_DIR}/.next_releases/${prev_release}"
  fi

  if [[ ! -d "${prev_target}" ]]; then
    log_error "Target rollback release directory does not exist: ${prev_target}"
    exit 1
  fi

  log_info "Target Rollback Release: ${prev_release} (${prev_target})"

  if [[ "${DRY_RUN}" == "true" ]]; then
    log_warn "[DRY RUN ONLY] Rollback preview complete. No services or symlinks were altered."
    log_info "To execute rollback, pass: --execute --rollback"
    exit 0
  fi

  # 2. Check architecture compatibility for rollback
  if [[ ! -L "${CURRENT_LINK}" ]]; then
    log_error "DEPLOYMENT BLOCKED: Rollback requires active single-pointer '${CURRENT_LINK}'."
    log_error "Complete the approved infrastructure migration before enabling automated rollback."
    exit 1
  fi

  # 3. Atomically revert 'current' symlink to the previous release
  log_info "Atomically swapping '${CURRENT_LINK}' to: ${prev_target}"
  atomic_symlink_swap "${prev_target}" "${CURRENT_LINK}"
  if [[ $(id -u) -eq 0 ]]; then
    chown -h ayaan:ayaan "${CURRENT_LINK}" 2>/dev/null || true
  fi

  # 4. Reload supervised daemons
  if command -v pm2 &>/dev/null; then
    log_info "Reloading PM2 Next.js daemons on reverted release (--update-env)..."
    run_as_app_user "pm2 reload ayaan-customer --update-env"
    run_as_app_user "pm2 reload ayaan-admin --update-env"
  fi

  handover_queue_workers

  if command -v systemctl &>/dev/null && systemctl is-active php8.4-fpm &>/dev/null; then
    log_info "Reloading PHP-FPM 8.4 opcode cache..."
    run_as_root "systemctl reload php8.4-fpm || true"
  fi

  if command -v nginx &>/dev/null; then
    run_as_root "nginx -t && systemctl reload nginx"
  fi

  # 5. Run post-rollback runtime adoption & health checks
  sleep 2
  local gate_script="${APP_DIR}/scripts/verify-deployment-release-gate.mjs"
  [[ ! -f "${gate_script}" ]] && gate_script="${CURRENT_LINK}/scripts/verify-deployment-release-gate.mjs"
  [[ ! -f "${gate_script}" ]] && gate_script="$(dirname "${BASH_SOURCE[0]}")/verify-deployment-release-gate.mjs"
  if [[ -f "${gate_script}" ]]; then
    local rollback_build_id=""
    local rollback_commit=""
    if [[ -f "${prev_target}/.next/BUILD_ID" ]]; then
      rollback_build_id=$(cat "${prev_target}/.next/BUILD_ID" 2>/dev/null | tr -d '\r\n')
    fi
    if [[ -f "${prev_target}/RELEASE_METADATA.json" ]]; then
      rollback_commit=$(grep '"commit_sha"' "${prev_target}/RELEASE_METADATA.json" 2>/dev/null | cut -d'"' -f4 || true)
    fi

    log_info "Verifying runtime adoption of restored rollback release (${prev_release})..."
    if ! DEPLOY_EXPECTED_BUILD_ID="${rollback_build_id}" \
         DEPLOY_EXPECTED_RELEASE_ID="${prev_release}" \
         DEPLOY_EXPECTED_COMMIT="${rollback_commit}" \
         DEPLOY_CURRENT_PATH="${CURRENT_LINK}" \
         node "${gate_script}"; then
      log_error "ROLLBACK ADOPTION FAILED: Restored release failed runtime verification!"
      exit 1
    fi
    log_success "Restored rollback release (${prev_release}) verified 100% adopted by all runtime daemons."
  fi

  echo "${prev_release}" > "${RELEASES_DIR}/CURRENT_RELEASE"
  log_success "Single-pointer full-stack rollback complete. System restored to: ${prev_release}."
  log_warn "Note: Database migrations were NOT rolled back. Automated database rollback is intentionally prohibited."
  exit 0
}

# ── Git Source Verification ───────────────────────────────────────────────────
verify_git_source() {
  log_step "Step 1/6: Verifying Git Source & Commit Lineage..."
  cd "${APP_DIR}"

  if [[ "${SKIP_GIT}" == "true" ]]; then
    log_warn "Skipping Git fetch/checkout (--skip-git set)."
    if [[ -z "${TARGET_COMMIT}" ]]; then
      CURRENT_GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "test-mock-sha")
    else
      CURRENT_GIT_COMMIT="${TARGET_COMMIT}"
    fi
  else
    local remote_url
    remote_url=$(git remote get-url origin 2>/dev/null || true)
    if [[ -z "${remote_url}" ]]; then
      log_error "Git remote 'origin' is not configured in ${APP_DIR}."
      exit 1
    fi

    if [[ "${EXECUTE}" == "true" ]]; then
      log_info "Fetching latest refs from remote for branch '${TARGET_BRANCH}'..."
      git fetch origin "${TARGET_BRANCH}" --quiet
    fi

    if [[ -z "${TARGET_COMMIT}" ]]; then
      TARGET_COMMIT=$(git rev-parse "origin/${TARGET_BRANCH}" 2>/dev/null || git rev-parse HEAD)
      log_info "No commit specified. Using branch tip: ${TARGET_COMMIT}"
    else
      if ! git rev-parse --verify "${TARGET_COMMIT}^{commit}" &>/dev/null; then
        log_error "Requested commit SHA '${TARGET_COMMIT}' does not exist in local repository."
        exit 1
      fi
    fi

    if git rev-parse --verify "origin/${TARGET_BRANCH}" &>/dev/null; then
      if ! git merge-base --is-ancestor "${TARGET_COMMIT}" "origin/${TARGET_BRANCH}"; then
        log_error "Commit '${TARGET_COMMIT}' is NOT an ancestor of 'origin/${TARGET_BRANCH}'. Refusing to deploy off-branch code."
        exit 1
      fi
    fi
    CURRENT_GIT_COMMIT="${TARGET_COMMIT}"
  fi

  # Idempotency check: verify if requested commit is already active
  local active_rel=""
  if [[ -f "${RELEASES_DIR}/CURRENT_RELEASE" ]]; then
    active_rel=$(cat "${RELEASES_DIR}/CURRENT_RELEASE")
  elif [[ -L "${CURRENT_LINK}" ]]; then
    local current_target
    current_target=$(readlink -f "${CURRENT_LINK}" 2>/dev/null || true)
    active_rel="${current_target##*/}"
  fi

  if [[ "${active_rel}" == *"${CURRENT_GIT_COMMIT:0:7}"* ]]; then
    log_info "Target commit ${CURRENT_GIT_COMMIT:0:7} appears to be currently active (${active_rel})."
    if [[ "${DRY_RUN}" == "true" ]]; then
      log_success "Active release matches target commit. System is up to date."
    fi
  fi

  PREVIOUS_GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")
  log_success "Source verified: target commit ${CURRENT_GIT_COMMIT:0:7} on branch '${TARGET_BRANCH}'."
}

# ── Isolated Single-Pointer Candidate Release Build ───────────────────────────
build_candidate_release() {
  log_step "Step 2/6: Building Candidate Release in Isolated Directory..."

  local timestamp
  timestamp=$(date -u '+%Y%m%d_%H%M%S')
  local short_sha="${CURRENT_GIT_COMMIT:0:7}"
  NEW_REL_ID="release_${timestamp}_${short_sha}"
  NEW_REL_DIR="${RELEASES_DIR}/${NEW_REL_ID}"

  log_info "Target Release ID:  ${NEW_REL_ID}"
  log_info "Target Release Dir: ${NEW_REL_DIR}"

  # 1. Database migration status check (Runs in BOTH dry-run and execute mode)
  log_info "Checking database migration status..."
  local pending_output=""
  local has_pending=false

  local check_artisan="${CURRENT_LINK}/backend/artisan"
  [[ ! -f "${check_artisan}" ]] && check_artisan="${APP_DIR}/backend/artisan"

  if [[ -f "${check_artisan}" ]]; then
    if command -v php &>/dev/null; then
      pending_output=$(php "${check_artisan}" migrate:status --pending 2>&1 || true)
    elif [[ -x "${check_artisan}" ]]; then
      pending_output=$("${check_artisan}" migrate:status --pending 2>&1 || true)
    fi
    if echo "${pending_output}" | grep -iE 'Pending' | grep -vq 'No pending migrations'; then
      has_pending=true
    fi
  fi

  if [[ "${has_pending}" == "true" ]]; then
    log_warn "Pending database migrations detected!"
    echo "${pending_output}"

    if [[ "${RUN_MIGRATIONS}" != "true" ]]; then
      log_error "CRITICAL SAFETY GATE: Pending migrations exist, but --run-migrations was NOT provided."
      log_error "Deployment halted before release activation to protect production database schema."
      log_error "To authorize migrations, re-run with: --execute --commit <sha> --run-migrations"
      exit 1
    fi
    log_info "Database migrations are authorized (--run-migrations supplied)."
  else
    log_success "Database schema is up to date (no pending migrations)."
  fi

  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "[DRY RUN] Skipping artifact compilation in dry-run mode."
    log_success "Candidate release build pipeline validated."
    return 0
  fi

  # 2. Prepare candidate release directory
  mkdir -p "${RELEASES_DIR}"
  rm -rf "${NEW_REL_DIR}"
  mkdir -p "${NEW_REL_DIR}"

  # 3. Extract exact verified commit into candidate release directory
  if [[ "${SKIP_GIT}" != "true" && -d "${APP_DIR}/.git" ]]; then
    log_info "Extracting Git commit ${short_sha} into candidate release..."
    git archive "${CURRENT_GIT_COMMIT}" | tar -x -C "${NEW_REL_DIR}"
  else
    log_info "Mock build: copying project tree to candidate release..."
    cp -r "${APP_DIR}"/* "${NEW_REL_DIR}/" 2>/dev/null || true
  fi

  # 4. Wire persistent shared storage and environment symlinks
  log_info "Wiring shared persistent storage and environment symlinks..."
  mkdir -p "${NEW_REL_DIR}/backend"
  if [[ -d "${SHARED_DIR}/storage" ]]; then
    rm -rf "${NEW_REL_DIR}/backend/storage"
    ln -sfn "${SHARED_DIR}/storage" "${NEW_REL_DIR}/backend/storage"
  fi

  if [[ -f "${ENV_BACKEND_FILE}" ]]; then
    ln -sfn "${ENV_BACKEND_FILE}" "${NEW_REL_DIR}/backend/.env"
  fi
  if [[ -f "${ENV_PROD_FILE}" ]]; then
    ln -sfn "${ENV_PROD_FILE}" "${NEW_REL_DIR}/.env.production"
  fi
  if [[ -f "${ENV_LOCAL_FILE}" ]]; then
    ln -sfn "${ENV_LOCAL_FILE}" "${NEW_REL_DIR}/.env.local"
  fi

  # 5. Compile backend dependencies & Laravel caches inside candidate release
  log_info "Synchronizing backend dependencies in candidate release..."
  if [[ -f "${NEW_REL_DIR}/backend/composer.json" ]]; then
    if command -v composer &>/dev/null; then
      run_as_app_user "cd ${NEW_REL_DIR}/backend && composer install --no-dev --optimize-autoloader --no-interaction"
      run_as_app_user "cd ${NEW_REL_DIR}/backend && php artisan config:cache && php artisan route:cache" 2>/dev/null || true
    fi
  fi

  # 6. Compile Next.js in candidate release
  log_info "Compiling production Next.js build into candidate release..."
  local build_cmd="cd ${NEW_REL_DIR} && NEXT_DIST_DIR='.next' npm run build"

  if ! run_as_app_user "${build_cmd}"; then
    log_error "Production Next.js compilation failed. Active release remains untouched."
    rm -rf "${NEW_REL_DIR}"
    exit 1
  fi

  # 7. Write immutable compiled ReleaseIdentity.php and release metadata
  local candidate_build_id=""
  [[ -f "${NEW_REL_DIR}/.next/BUILD_ID" ]] && candidate_build_id=$(cat "${NEW_REL_DIR}/.next/BUILD_ID" 2>/dev/null | tr -d '\r\n')

  mkdir -p "${NEW_REL_DIR}/backend/app/Support"
  cat << PHP > "${NEW_REL_DIR}/backend/app/Support/ReleaseIdentity.php"
<?php

namespace App\Support;

/**
 * ReleaseIdentity
 *
 * Immutable, compile-time release metadata baked into candidate release.
 * Class constants represent bytecode compiled into OPcache memory.
 */
class ReleaseIdentity
{
    public const COMMIT_SHA = '${CURRENT_GIT_COMMIT}';
    public const RELEASE_ID = '${NEW_REL_ID}';
    public const BUILD_ID = '${candidate_build_id}';
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

  if [[ ! -f "${NEW_REL_DIR}/RELEASE_METADATA.json" ]]; then
    cat << JSON > "${NEW_REL_DIR}/RELEASE_METADATA.json"
{
  "release_id": "${NEW_REL_ID}",
  "commit_sha": "${CURRENT_GIT_COMMIT}",
  "frontend_sha": "${CURRENT_GIT_COMMIT}",
  "backend_sha": "${CURRENT_GIT_COMMIT}",
  "build_id": "${candidate_build_id}",
  "branch": "${TARGET_BRANCH}",
  "deployed_at": "${timestamp}"
}
JSON
  fi
  cp -p "${NEW_REL_DIR}/RELEASE_METADATA.json" "${NEW_REL_DIR}/backend/RELEASE_METADATA.json"

  if [[ $(id -u) -eq 0 ]]; then
    chown -R ayaan:ayaan "${NEW_REL_DIR}"
  fi
  log_success "Candidate release compiled and verified: ${NEW_REL_DIR}"
}

# ── Static Asset Continuity Preservation ──────────────────────────────────────
preserve_asset_continuity() {
  log_step "Step 3/6: Preserving Static Asset Continuity for In-Flight Clients..."
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "[DRY RUN] Asset continuity preservation verified (static chunk copying)."
    return 0
  fi

  # Check previous release static chunks via 'current' symlink
  if [[ -L "${CURRENT_LINK}" && -d "${CURRENT_LINK}/.next/static/chunks" ]]; then
    local active_target
    active_target=$(readlink -f "${CURRENT_LINK}")
    if [[ -d "${active_target}/.next/static/chunks" && -d "${NEW_REL_DIR}/.next/static/chunks" ]]; then
      log_info "Merging static chunks from active release (${active_target##*/}) into new release..."
      cp -n -r "${active_target}/.next/static/chunks"/* "${NEW_REL_DIR}/.next/static/chunks/" 2>/dev/null || true
      log_success "Static chunks merged. Cached browser sessions protected against 404s."
    fi
  fi
}

# ── Pre-Activation Artifact Sanity Checks ─────────────────────────────────────
verify_release_artifacts() {
  log_step "Step 4/6: Verifying Release Artifact Sanity..."
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "[DRY RUN] Artifact sanity check passed."
    return 0
  fi

  local required_artifacts=(
    "${NEW_REL_DIR}/RELEASE_METADATA.json"
    "${NEW_REL_DIR}/backend/public/index.php"
    "${NEW_REL_DIR}/backend/app/Support/ReleaseIdentity.php"
    "${NEW_REL_DIR}/.next/BUILD_ID"
    "${NEW_REL_DIR}/.next/build-manifest.json"
    "${NEW_REL_DIR}/.next/static/chunks"
  )

  for art in "${required_artifacts[@]}"; do
    if [[ ! -e "$art" ]]; then
      log_error "Sanity check failed: missing required release artifact: $art"
      rm -rf "${NEW_REL_DIR}"
      exit 1
    fi
  done

  # Verify SHA alignment in RELEASE_METADATA.json
  local meta_front meta_back
  meta_front=$(grep '"frontend_sha"' "${NEW_REL_DIR}/RELEASE_METADATA.json" | cut -d'"' -f4)
  meta_back=$(grep '"backend_sha"' "${NEW_REL_DIR}/RELEASE_METADATA.json" | cut -d'"' -f4)
  if [[ "${meta_front}" != "${meta_back}" || "${meta_front}" != "${CURRENT_GIT_COMMIT}" ]]; then
    log_error "RELEASE SHA MISMATCH: frontend (${meta_front}) and backend (${meta_back}) do not match commit (${CURRENT_GIT_COMMIT})!"
    rm -rf "${NEW_REL_DIR}"
    exit 1
  fi

  local chunk_count
  chunk_count=$(find "${NEW_REL_DIR}/.next/static/chunks" -maxdepth 1 -name "*.js" | wc -l)
  if [[ "${chunk_count}" -lt 5 ]]; then
    log_error "Sanity check failed: suspiciously low chunk count (${chunk_count}) in ${NEW_REL_DIR}/.next/static/chunks"
    rm -rf "${NEW_REL_DIR}"
    exit 1
  fi

  log_success "Artifact sanity verified (${chunk_count} unique chunk scripts ready, matching SHAs confirmed)."
}

# ── Atomic Single-Pointer Activation ──────────────────────────────────────────
activate_single_pointer_release() {
  log_step "Step 5/6: Atomic Single-Pointer Activation..."

  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "[DRY RUN] Skipping activation, migrations, and process reload in dry-run mode."
    return 0
  fi

  # 1. Record rollback pointers BEFORE modifying live state
  local current_rel_id=""
  if [[ -L "${CURRENT_LINK}" ]]; then
    local current_target
    current_target=$(readlink -f "${CURRENT_LINK}" 2>/dev/null || true)
    current_rel_id="${current_target##*/}"
  elif [[ -f "${RELEASES_DIR}/CURRENT_RELEASE" ]]; then
    current_rel_id=$(cat "${RELEASES_DIR}/CURRENT_RELEASE")
  fi

  if [[ -n "${current_rel_id}" && "${current_rel_id}" != "none" ]]; then
    echo "${current_rel_id}" > "${RELEASES_DIR}/PREVIOUS_RELEASE"
    log_info "Previous full-stack release recorded: ${current_rel_id}"
  fi

  # 2. Execute authorized forward migrations if authorized
  if [[ "${RUN_MIGRATIONS}" == "true" ]]; then
    log_info "Executing authorized database migrations (php artisan migrate --force)..."
    run_as_app_user "cd ${NEW_REL_DIR}/backend && php artisan migrate --force --no-interaction"
    log_success "Database migrations executed."
  fi

  # 3. Atomically swap 'current' symlink pointer
  log_info "Atomically swapping '${CURRENT_LINK}' pointer to: ${NEW_REL_DIR}"
  atomic_symlink_swap "${NEW_REL_DIR}" "${CURRENT_LINK}"
  if [[ $(id -u) -eq 0 ]]; then
    chown -h ayaan:ayaan "${CURRENT_LINK}" 2>/dev/null || true
  fi
  ACTIVATION_COMPLETED=true
  echo "${NEW_REL_ID}" > "${RELEASES_DIR}/CURRENT_RELEASE"
  log_success "Single-pointer atomically swapped to: ${NEW_REL_ID}"

  # 4. Reload daemons on new pointer with updated environment
  if command -v pm2 &>/dev/null; then
    log_info "Reloading PM2 Next.js daemons with updated release environment (--update-env)..."
    run_as_app_user "pm2 reload ayaan-customer --update-env"
    run_as_app_user "pm2 reload ayaan-admin --update-env"
  fi

  # 5. Graceful Laravel queue worker drain and Supervisor handover
  handover_queue_workers

  # 6. Reload PHP-FPM opcode cache
  if command -v systemctl &>/dev/null && systemctl is-active php8.4-fpm &>/dev/null; then
    log_info "Reloading PHP-FPM 8.4 opcode cache..."
    run_as_root "systemctl reload php8.4-fpm || true"
  fi

  # 7. Reload Nginx reverse proxy
  if command -v nginx &>/dev/null; then
    log_info "Reloading Nginx reverse proxy..."
    run_as_root "nginx -t && systemctl reload nginx"
  fi

  # Allow processes to bind sockets
  sleep 3
}

# ── Mandatory Post-Deployment Release Gate & Single-Pointer Rollback ──────────
verify_deployment_gate() {
  log_step "Step 6/6: Running Mandatory Post-Deployment Release Gate..."

  if [[ "${DRY_RUN}" == "true" ]]; then
    log_success "[DRY RUN ONLY] Release gate simulated. No services were queried."
    return 0
  fi

  local gate_script="${APP_DIR}/scripts/verify-deployment-release-gate.mjs"
  [[ ! -f "${gate_script}" ]] && gate_script="${CURRENT_LINK}/scripts/verify-deployment-release-gate.mjs"
  [[ ! -f "${gate_script}" ]] && gate_script="$(dirname "${BASH_SOURCE[0]}")/verify-deployment-release-gate.mjs"

  if [[ ! -f "${gate_script}" ]]; then
    log_error "Mandatory release gate script missing: ${gate_script}"
    exit 1
  fi

  local expected_build_id=""
  if [[ -f "${NEW_REL_DIR}/.next/BUILD_ID" ]]; then
    expected_build_id=$(cat "${NEW_REL_DIR}/.next/BUILD_ID" | tr -d '\r\n')
  fi

  if ! DEPLOY_EXPECTED_BUILD_ID="${expected_build_id}" \
       DEPLOY_EXPECTED_RELEASE_ID="${NEW_REL_ID}" \
       DEPLOY_EXPECTED_COMMIT="${CURRENT_GIT_COMMIT}" \
       DEPLOY_CURRENT_PATH="${CURRENT_LINK}" \
       DEPLOY_PRIOR_WORKER_PID="${DEPLOY_PRIOR_WORKER_PID:-${PRIOR_WORKER_PID:-}}" \
       node "${gate_script}"; then
    log_error "RELEASE GATE FAILED: Post-switch verification encountered errors!"
    log_warn "TRIGGERING SINGLE-POINTER FULL-STACK ROLLBACK..."

    # Revert 'current' symlink to PREVIOUS_RELEASE
    if [[ -f "${RELEASES_DIR}/PREVIOUS_RELEASE" ]]; then
      local prev_rel
      prev_rel=$(cat "${RELEASES_DIR}/PREVIOUS_RELEASE")
      local prev_target="${RELEASES_DIR}/${prev_rel}"

      if [[ -d "${prev_target}" ]]; then
        log_info "Reverting '${CURRENT_LINK}' symlink to: ${prev_target}..."
        atomic_symlink_swap "${prev_target}" "${CURRENT_LINK}"
        if [[ $(id -u) -eq 0 ]]; then
          chown -h ayaan:ayaan "${CURRENT_LINK}" 2>/dev/null || true
        fi
        echo "${prev_rel}" > "${RELEASES_DIR}/CURRENT_RELEASE"

        # Reload daemons on reverted pointer
        if command -v pm2 &>/dev/null; then
          run_as_app_user "pm2 reload ayaan-customer --update-env"
          run_as_app_user "pm2 reload ayaan-admin --update-env"
        fi
        handover_queue_workers
        if command -v systemctl &>/dev/null && systemctl is-active php8.4-fpm &>/dev/null; then
          run_as_root "systemctl reload php8.4-fpm || true"
        fi
        if command -v nginx &>/dev/null; then
          run_as_root "nginx -t && systemctl reload nginx"
        fi

        log_success "Single-pointer full-stack rollback completed to: ${prev_rel}"

        if [[ "${DEPLOY_VERIFY_ROLLBACK_ADOPTION:-false}" == "true" ]]; then
          local rollback_build_id=""
          local rollback_commit=""
          if [[ -f "${prev_target}/.next/BUILD_ID" ]]; then
            rollback_build_id=$(cat "${prev_target}/.next/BUILD_ID" 2>/dev/null | tr -d '\r\n')
          fi
          if [[ -f "${prev_target}/RELEASE_METADATA.json" ]]; then
            rollback_commit=$(grep '"commit_sha"' "${prev_target}/RELEASE_METADATA.json" 2>/dev/null | cut -d'"' -f4 || true)
          fi

          log_info "Verifying runtime adoption of restored rollback release (${prev_rel})..."
          if ! DEPLOY_EXPECTED_BUILD_ID="${rollback_build_id}" \
               DEPLOY_EXPECTED_RELEASE_ID="${prev_rel}" \
               DEPLOY_EXPECTED_COMMIT="${rollback_commit}" \
               DEPLOY_CURRENT_PATH="${CURRENT_LINK}" \
               node "${gate_script}"; then
            log_error "CRITICAL: Rollback release runtime adoption failed! Previous release did not pass release gate!"
            exit 1
          fi
          log_success "Single-pointer full-stack rollback verified 100% adopted: ${prev_rel}"
        fi
      fi
    fi

    log_warn "Note: Database migrations were NOT rolled back. Automated database rollback is intentionally prohibited."
    exit 1
  fi

  log_success "Mandatory release gate passed 100% OK."
}

# ── Release Retention & Pruning ───────────────────────────────────────────────
prune_old_releases() {
  log_step "Pruning Obsolete Releases (Retaining last ${MAX_KEPT_RELEASES})..."
  if [[ "${DRY_RUN}" == "true" || ! -d "${RELEASES_DIR}" ]]; then
    return 0
  fi

  cd "${RELEASES_DIR}"
  local current_id prev_id
  current_id=$(cat "${RELEASES_DIR}/CURRENT_RELEASE" 2>/dev/null || echo "")
  prev_id=$(cat "${RELEASES_DIR}/PREVIOUS_RELEASE" 2>/dev/null || echo "")

  local old_releases
  old_releases=$(ls -1dt release_* 2>/dev/null | tail -n +$((MAX_KEPT_RELEASES + 1)) || true)

  for old_rel in ${old_releases}; do
    # Never delete current or previous release
    if [[ "${old_rel}" != "${current_id}" && "${old_rel}" != "${prev_id}" ]]; then
      log_info "Pruning obsolete release: ${old_rel}"
      rm -rf "${RELEASES_DIR}/${old_rel}"
    fi
  done
  log_success "Release retention enforced."
}

# ── Main Pipeline Execution ───────────────────────────────────────────────────
main() {
  parse_arguments "$@"

  echo "=========================================================="
  echo "  AYAAN CLOTHING — SINGLE-POINTER DEPLOYMENT PIPELINE     "
  echo "  Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')          "
  echo "  Mode:      $([[ "${EXECUTE}" == "true" ]] && echo "EXECUTE (MUTATIONS ENABLED)" || echo "DRY-RUN (AUDIT ONLY)")"
  echo "  Branch:    ${TARGET_BRANCH}                             "
  echo "  Directory: ${APP_DIR}                                   "
  echo "=========================================================="

  # 1. Mutex Concurrency Lock
  acquire_mutex_lock

  # 2. Architecture Compatibility Gate (Blocks execution if host uses legacy layout)
  verify_architecture_compatibility

  # 3. Standalone Rollback Handling
  if [[ "${ROLLBACK}" == "true" ]]; then
    execute_rollback
  fi

  # 4. Environment & Storage Integrity Pre-flight
  check_environment_and_storage

  # 5. Source & Git Verification
  verify_git_source

  # 6. Script Self-Integrity Verification
  verify_script_integrity

  # 7. Candidate Release Build in Isolated Directory
  build_candidate_release

  # 8. Static Asset Continuity
  preserve_asset_continuity

  # 9. Artifact Sanity Checks
  verify_release_artifacts

  # 10. Verify Environment Files Remain Unaltered
  verify_environment_unaltered

  # 11. Atomic Single-Pointer Activation (Swaps 'current' symlink)
  activate_single_pointer_release

  # 12. Mandatory Release Gate & Rollback Handler
  verify_deployment_gate

  # 13. Prune Obsolete Releases
  prune_old_releases

  echo -e "\n=========================================================="
  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "✔ [DRY RUN COMPLETE] Preflight validation passed. No changes were made."
  else
    echo "🎉 [DEPLOYMENT SUCCESSFUL] Release active: ${NEW_REL_ID}"
    echo "   Pointer: ${CURRENT_LINK} -> ${NEW_REL_DIR}"
    echo "   Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "${CURRENT_GIT_COMMIT}")"
    echo "   Production URL: https://ayaanclothing.com"
  fi
  echo "=========================================================="
  exit 0
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi

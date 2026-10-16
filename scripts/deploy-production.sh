#!/usr/bin/env bash
# ==============================================================================
# Ayaan Clothing — Atomic & Zero-Downtime Production Deployment Pipeline
# ==============================================================================
#
# Prevents recurrence of Next.js build/runtime chunk desynchronization outages.
#
# Invariants:
# 1. Active release (.next) remains untouched and serving traffic during build.
# 2. Builds into an isolated, timestamped release directory in .next_releases/.
# 3. Copies previous release chunks into new static/chunks/ to protect in-flight clients.
# 4. Atomically activates the new build using symlink swap (mv -Tf).
# 5. Reloads PM2 customer and admin daemons only after successful build & activation.
# 6. Runs mandatory post-deployment release gate verifying 100% static asset retrieval.
# 7. Automatically rolls back to the previous known-good release if verification fails.
# 8. Mutex lock prevents concurrent deployments.
# ==============================================================================

set -eo pipefail

APP_DIR="/var/www/ayaan"
BACKEND_DIR="${APP_DIR}/backend"
RELEASES_DIR="${APP_DIR}/.next_releases"
LOCK_FILE="${APP_DIR}/.deploy.lock"
MAX_KEPT_RELEASES=5

cd "${APP_DIR}"

# ── 1. Mutex Concurrency Lock ──────────────────────────────────────────────────
exec 200>"${LOCK_FILE}"
if ! flock -n 200; then
  echo "❌ [DEPLOY ERROR] Another deployment is currently in progress. Aborting." >&2
  exit 1
fi

echo "=========================================================="
echo "  AYAAN CLOTHING — ZERO-DOWNTIME ATOMIC DEPLOYMENT"
echo "  Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "=========================================================="

# ── 2. Handle Standalone Rollback Request ──────────────────────────────────────
if [[ "$1" == "--rollback" ]]; then
  echo "▶ [ROLLBACK] Operator requested rollback to previous release..."
  if [[ ! -f "${RELEASES_DIR}/PREVIOUS_RELEASE" ]]; then
    echo "❌ [ROLLBACK ERROR] No previous release recorded at ${RELEASES_DIR}/PREVIOUS_RELEASE" >&2
    exit 1
  fi

  PREV_RELEASE=$(cat "${RELEASES_DIR}/PREVIOUS_RELEASE")
  PREV_TARGET="${RELEASES_DIR}/${PREV_RELEASE}"

  if [[ ! -d "${PREV_TARGET}" ]]; then
    echo "❌ [ROLLBACK ERROR] Target release directory does not exist: ${PREV_TARGET}" >&2
    exit 1
  fi

  echo "  - Reverting .next symlink to: ${PREV_TARGET}"
  ln -sfn "${PREV_TARGET}" "${APP_DIR}/.next_tmp"
  mv -Tf "${APP_DIR}/.next_tmp" "${APP_DIR}/.next"
  chown -h ayaan:ayaan "${APP_DIR}/.next"

  echo "  - Reloading PM2 Next.js daemons..."
  if [[ $(id -u) -eq 0 ]]; then
    su - ayaan -c "pm2 reload ayaan-customer"
    su - ayaan -c "pm2 reload ayaan-admin"
    systemctl reload nginx
  else
    pm2 reload ayaan-customer
    pm2 reload ayaan-admin
    sudo systemctl reload nginx
  fi

  sleep 2
  echo "  - Running release gate verification on reverted release..."
  node "${APP_DIR}/scripts/verify-deployment-release-gate.mjs"

  echo "${PREV_RELEASE}" > "${RELEASES_DIR}/CURRENT_RELEASE"
  echo "✔ [ROLLBACK COMPLETE] Successfully reverted to release: ${PREV_RELEASE}"
  exit 0
fi

# ── 3. Initialize Releases Infrastructure ─────────────────────────────────────
mkdir -p "${RELEASES_DIR}"
if [[ $(id -u) -eq 0 ]]; then
  chown ayaan:ayaan "${RELEASES_DIR}"
fi

# If .next is currently a physical directory, migrate it safely to the releases archive
if [[ -d "${APP_DIR}/.next" && ! -L "${APP_DIR}/.next" ]]; then
  echo "▶ Migrating existing physical .next directory to immutable releases archive..."
  INITIAL_REL="release_initial_$(date -u +%Y%m%d_%H%M%S)"
  mv "${APP_DIR}/.next" "${RELEASES_DIR}/${INITIAL_REL}"
  ln -sfn "${RELEASES_DIR}/${INITIAL_REL}" "${APP_DIR}/.next"
  if [[ $(id -u) -eq 0 ]]; then
    chown -h ayaan:ayaan "${APP_DIR}/.next"
  fi
  echo "${INITIAL_REL}" > "${RELEASES_DIR}/CURRENT_RELEASE"
  echo "✔ Successfully converted .next to managed release symlink."
fi

CURRENT_REL_ID=$(cat "${RELEASES_DIR}/CURRENT_RELEASE" 2>/dev/null || echo "none")
TIMESTAMP=$(date -u '+%Y%m%d_%H%M%S')
SHORT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "head")
NEW_REL_ID="release_${TIMESTAMP}_${SHORT_SHA}"
NEW_REL_DIR="${RELEASES_DIR}/${NEW_REL_ID}"

echo "  - Current Active Release: ${CURRENT_REL_ID}"
echo "  - Target New Release:     ${NEW_REL_ID}"
echo "  - Current Git Commit:     $(git log -1 --oneline)"

# ── 4. Backend Dependencies & Safe Migrations ─────────────────────────────────
echo -e "\n▶ Step 1/6: Validating Backend Services..."
cd "${BACKEND_DIR}"
if git diff --name-only HEAD@{1} HEAD 2>/dev/null | grep -q "^backend/composer\."; then
  echo "  - Updating backend composer dependencies..."
  if [[ $(id -u) -eq 0 ]]; then
    su - ayaan -c "cd ${BACKEND_DIR} && composer install --no-dev --optimize-autoloader --no-interaction"
  else
    composer install --no-dev --optimize-autoloader --no-interaction
  fi
fi

# Run only forward migrations with --force (never fresh or rollback)
if [[ $(id -u) -eq 0 ]]; then
  su - ayaan -c "cd ${BACKEND_DIR} && php artisan migrate --force --no-interaction && php artisan config:cache && php artisan route:cache"
else
  php artisan migrate --force --no-interaction
  php artisan config:cache
  php artisan route:cache
fi

# Restart supervisor worker cleanly
if command -v supervisorctl &>/dev/null; then
  if [[ $(id -u) -eq 0 ]]; then
    supervisorctl restart ayaan-worker || true
  else
    sudo supervisorctl restart ayaan-worker || true
  fi
fi

# ── 5. Frontend Dependencies & Isolated Staged Build ──────────────────────────
echo -e "\n▶ Step 2/6: Compiling Frontend into Isolated Release Directory..."
cd "${APP_DIR}"

# Install frontend dependencies if package.json changed
if git diff --name-only HEAD@{1} HEAD 2>/dev/null | grep -q "package.*\.json"; then
  echo "  - Installing updated npm packages..."
  if [[ $(id -u) -eq 0 ]]; then
    su - ayaan -c "cd ${APP_DIR} && npm install --omit=dev --no-audit --no-fund"
  else
    npm install --omit=dev --no-audit --no-fund
  fi
fi

# Build into isolated target directory without touching the active .next
echo "  - Compiling production Next.js build into: ${NEW_REL_DIR}"
mkdir -p "${NEW_REL_DIR}"
if [[ $(id -u) -eq 0 ]]; then
  chown -R ayaan:ayaan "${NEW_REL_DIR}"
fi

export NEXT_DIST_DIR=".next_releases/${NEW_REL_ID}"
BUILD_CMD="cd ${APP_DIR} && NEXT_DIST_DIR='${NEXT_DIST_DIR}' npm run build"

if [[ $(id -u) -eq 0 ]]; then
  if ! su - ayaan -c "${BUILD_CMD}"; then
    echo "❌ [BUILD ERROR] Production Next.js build failed. Active release remains untouched." >&2
    rm -rf "${NEW_REL_DIR}"
    exit 1
  fi
else
  if ! eval "${BUILD_CMD}"; then
    echo "❌ [BUILD ERROR] Production Next.js build failed. Active release remains untouched." >&2
    rm -rf "${NEW_REL_DIR}"
    exit 1
  fi
fi

# ── 6. In-Flight Client Continuity (Copy Previous Chunks) ─────────────────────
echo -e "\n▶ Step 3/6: Preserving Static Asset Continuity..."
if [[ -L "${APP_DIR}/.next" && -d "${APP_DIR}/.next/static/chunks" ]]; then
  ACTIVE_TARGET=$(readlink -f "${APP_DIR}/.next")
  if [[ -d "${ACTIVE_TARGET}/static/chunks" ]]; then
    echo "  - Merging static chunks from active release (${ACTIVE_TARGET##*/}) to prevent 404s for cached browsers..."
    cp -n -r "${ACTIVE_TARGET}/static/chunks"/* "${NEW_REL_DIR}/static/chunks/" 2>/dev/null || true
  fi
fi

# ── 7. Pre-Activation Sanity Verification ──────────────────────────────────────
echo -e "\n▶ Step 4/6: Pre-Activation Manifest & Artifact Sanity Check..."
REQUIRED_ARTIFACTS=(
  "${NEW_REL_DIR}/BUILD_ID"
  "${NEW_REL_DIR}/build-manifest.json"
  "${NEW_REL_DIR}/server/app-paths-manifest.json"
  "${NEW_REL_DIR}/static/chunks"
)

for art in "${REQUIRED_ARTIFACTS[@]}"; do
  if [[ ! -e "$art" ]]; then
    echo "❌ [SANITY ERROR] Missing required build artifact: $art" >&2
    rm -rf "${NEW_REL_DIR}"
    exit 1
  fi
done

CHUNK_COUNT=$(find "${NEW_REL_DIR}/static/chunks" -maxdepth 1 -name "*.js" | wc -l)
if [[ "${CHUNK_COUNT}" -lt 5 ]]; then
  echo "❌ [SANITY ERROR] Suspiciously low chunk count (${CHUNK_COUNT}) in ${NEW_REL_DIR}/static/chunks" >&2
  rm -rf "${NEW_REL_DIR}"
  exit 1
fi

if [[ $(id -u) -eq 0 ]]; then
  chown -R ayaan:ayaan "${NEW_REL_DIR}"
fi
echo "✔ Artifact sanity verified: ${CHUNK_COUNT} chunks compiled successfully."

# ── 8. Atomic Symlink Activation & PM2 Daemon Reload ──────────────────────────
echo -e "\n▶ Step 5/6: Atomic Symlink Activation & Zero-Downtime Reload..."
if [[ -n "${CURRENT_REL_ID}" && "${CURRENT_REL_ID}" != "none" ]]; then
  echo "${CURRENT_REL_ID}" > "${RELEASES_DIR}/PREVIOUS_RELEASE"
fi

# Atomic symlink replacement using mv -Tf
ln -sfn "${NEW_REL_DIR}" "${APP_DIR}/.next_tmp"
mv -Tf "${APP_DIR}/.next_tmp" "${APP_DIR}/.next"
if [[ $(id -u) -eq 0 ]]; then
  chown -h ayaan:ayaan "${APP_DIR}/.next"
fi
echo "${NEW_REL_ID}" > "${RELEASES_DIR}/CURRENT_RELEASE"

echo "  - Activating new build in PM2..."
if [[ $(id -u) -eq 0 ]]; then
  su - ayaan -c "pm2 reload ayaan-customer"
  su - ayaan -c "pm2 reload ayaan-admin"
  nginx -t && systemctl reload nginx
else
  pm2 reload ayaan-customer
  pm2 reload ayaan-admin
  sudo nginx -t && sudo systemctl reload nginx
fi

# Allow workers 3 seconds to bind sockets and complete initial startup
sleep 3

# ── 9. Mandatory Post-Deployment Release Gate ──────────────────────────────────
echo -e "\n▶ Step 6/6: Running Mandatory Post-Deployment Release Gate..."
if ! node "${APP_DIR}/scripts/verify-deployment-release-gate.mjs"; then
  echo "❌ [GATE FAILED] Deployment failed post-switch verification!" >&2

  if [[ -f "${RELEASES_DIR}/PREVIOUS_RELEASE" ]]; then
    PREV_REL=$(cat "${RELEASES_DIR}/PREVIOUS_RELEASE")
    echo "🚨 [AUTOMATIC ROLLBACK] Rolling back to previous release: ${PREV_REL}..."
    ln -sfn "${RELEASES_DIR}/${PREV_REL}" "${APP_DIR}/.next_tmp"
    mv -Tf "${APP_DIR}/.next_tmp" "${APP_DIR}/.next"
    if [[ $(id -u) -eq 0 ]]; then
      chown -h ayaan:ayaan "${APP_DIR}/.next"
      su - ayaan -c "pm2 reload ayaan-customer"
      su - ayaan -c "pm2 reload ayaan-admin"
      systemctl reload nginx
    else
      pm2 reload ayaan-customer
      pm2 reload ayaan-admin
      sudo systemctl reload nginx
    fi

    echo "${PREV_REL}" > "${RELEASES_DIR}/CURRENT_RELEASE"
    echo "✔ Rollback completed. System restored to ${PREV_REL}."
  fi
  exit 1
fi

# ── 10. Prune Obsolete Releases (Keep last N) ──────────────────────────────────
echo -e "\n▶ Pruning old releases (retaining last ${MAX_KEPT_RELEASES})..."
cd "${RELEASES_DIR}"
RELEASES_TO_DELETE=$(ls -1dt release_* 2>/dev/null | tail -n +$((MAX_KEPT_RELEASES + 1)) || true)
if [[ -n "${RELEASES_TO_DELETE}" ]]; then
  for old_rel in ${RELEASES_TO_DELETE}; do
    if [[ "${old_rel}" != "${NEW_REL_ID}" && "${old_rel}" != "${CURRENT_REL_ID}" ]]; then
      echo "  - Pruning obsolete: ${old_rel}"
      rm -rf "${RELEASES_DIR}/${old_rel}"
    fi
  done
fi

echo -e "\n=========================================================="
echo "🎉 DEPLOYMENT SUCCESSFUL: ${NEW_REL_ID}"
echo "   Live Domain: https://ayaanclothing.com"
echo "   Verified Chunks: Zero 404/500 errors"
echo "=========================================================="
exit 0

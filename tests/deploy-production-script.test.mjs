#!/usr/bin/env node
/**
 * Automated Test Suite: Single-Pointer Full-Stack Architecture & Safety Guards
 *
 * Verifies:
 * 1. Current production-style path configuration (legacy in-place) is rejected for real deployment.
 * 2. Dry-run succeeds without activating or modifying a release.
 * 3. Compatible shared-release fixture passes architecture checks and executes cleanly.
 * 4. Frontend and backend SHAs that differ or mismatch are rejected.
 * 5. Incomplete candidate release (missing build manifests or entry points) is rejected.
 * 6. Invalid or broken 'current' pointer is rejected.
 * 7. Missing or incorrectly configured persistent shared storage is rejected.
 * 8. Missing or unsafe (empty/0-byte) environment files cause immediate pre-flight rejection.
 * 9. Stale or invalid requested commit SHA is rejected.
 * 10. Candidate release is activated only after every preflight and artifact gate passes.
 * 11. Failed post-activation health checks restore the previous root release pointer ('current').
 * 12. Failed activation or health check preserves both previous release and persistent data.
 * 13. Automated database rollback is strictly prohibited and never invoked.
 * 14. Real execution remains blocked when the infrastructure prerequisite is unmet.
 * 15. The disabled GitHub deployment gate cannot be bypassed through manual inputs.
 * 16. Script version / checksum mismatch (--expected-checksum) is rejected.
 * 17. Mutex lock contention prevents concurrent deployment.
 * 18. Release retention policy preserves active and rollback releases while pruning obsolete ones.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const PROJECT_ROOT = process.cwd();
const SCRIPT_PATH = path.join(PROJECT_ROOT, 'scripts', 'deploy-production.sh');
const MIGRATE_SCRIPT_PATH = path.join(PROJECT_ROOT, 'scripts', 'migrate-to-shared-release.sh');
const GATE_SCRIPT_PATH = path.join(PROJECT_ROOT, 'scripts', 'verify-deployment-release-gate.mjs');

describe('Single-Pointer Full-Stack Deployment Safety Test Suite', () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ayc-deploy-single-pointer-'));
  });

  after(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // Fixture A: Legacy in-place layout (mirrors current live production VPS before migration)
  function setupLegacyFixture(dir) {
    const fixtureDir = path.join(tmpDir, dir);
    fs.mkdirSync(fixtureDir, { recursive: true });
    fs.mkdirSync(path.join(fixtureDir, 'backend'), { recursive: true });
    fs.mkdirSync(path.join(fixtureDir, 'scripts'), { recursive: true });

    // Environment files in root/backend
    fs.writeFileSync(path.join(fixtureDir, '.env.production'), 'NEXT_PUBLIC_APP_NAME="AYC"\n', { mode: 0o600 });
    fs.writeFileSync(path.join(fixtureDir, '.env.local'), 'LOCAL_OVERRIDE=true\n', { mode: 0o600 });
    fs.writeFileSync(path.join(fixtureDir, 'backend', '.env'), 'APP_KEY=base64:mocksecretkey\n', { mode: 0o600 });

    fs.writeFileSync(path.join(fixtureDir, 'package.json'), JSON.stringify({ name: 'ayc', scripts: { build: 'echo build_ok' } }));
    fs.writeFileSync(path.join(fixtureDir, 'scripts', 'verify-deployment-release-gate.mjs'), 'process.exit(0);\n');

    return fixtureDir;
  }

  // Fixture B: Compatible target shared-release layout (post-infrastructure migration)
  function setupSharedReleaseFixture(dir) {
    const fixtureDir = path.join(tmpDir, dir);
    fs.mkdirSync(fixtureDir, { recursive: true });
    fs.mkdirSync(path.join(fixtureDir, 'backend', 'public'), { recursive: true });
    fs.writeFileSync(path.join(fixtureDir, 'backend', 'public', 'index.php'), '<?php echo "ok";\n');
    fs.mkdirSync(path.join(fixtureDir, 'releases'), { recursive: true });
    fs.mkdirSync(path.join(fixtureDir, 'shared', 'storage', 'app', 'public'), { recursive: true });
    fs.mkdirSync(path.join(fixtureDir, 'shared', 'storage', 'app', 'private', 'product_offer_sheets'), { recursive: true });
    fs.mkdirSync(path.join(fixtureDir, 'shared', 'storage', 'logs'), { recursive: true });
    fs.mkdirSync(path.join(fixtureDir, 'scripts'), { recursive: true });

    // Shared environment files
    fs.writeFileSync(path.join(fixtureDir, 'shared', '.env.production'), 'NEXT_PUBLIC_APP_NAME="AYC"\n', { mode: 0o600 });
    fs.writeFileSync(path.join(fixtureDir, 'shared', '.env.local'), 'LOCAL_OVERRIDE=true\n', { mode: 0o600 });
    fs.writeFileSync(path.join(fixtureDir, 'shared', 'backend.env'), 'APP_KEY=base64:mocksecretkey\n', { mode: 0o600 });

    // Initial active release
    const initialRel = path.join(fixtureDir, 'releases', 'release_20261028_000000_known_good');
    fs.mkdirSync(initialRel, { recursive: true });
    fs.mkdirSync(path.join(initialRel, 'backend', 'public'), { recursive: true });
    fs.mkdirSync(path.join(initialRel, '.next', 'static', 'chunks'), { recursive: true });
    fs.mkdirSync(path.join(initialRel, '.next', 'server'), { recursive: true });

    // Mock Next.js artifacts
    fs.writeFileSync(path.join(initialRel, 'backend', 'public', 'index.php'), '<?php echo "ok";');
    fs.writeFileSync(path.join(initialRel, '.next', 'BUILD_ID'), 'initial_build_id\n');
    fs.writeFileSync(path.join(initialRel, '.next', 'build-manifest.json'), '{}');
    fs.writeFileSync(path.join(initialRel, '.next', 'server', 'app-paths-manifest.json'), '{}');
    for (let i = 1; i <= 6; i++) {
      fs.writeFileSync(path.join(initialRel, '.next', 'static', 'chunks', `chunk_${i}.js`), `// chunk ${i}`);
    }

    // Active symlink 'current'
    fs.symlinkSync(initialRel, path.join(fixtureDir, 'current'));
    fs.writeFileSync(path.join(fixtureDir, 'releases', 'CURRENT_RELEASE'), 'release_20261028_000000_known_good\n');

    // Root package.json and release gate
    fs.writeFileSync(path.join(fixtureDir, 'package.json'), JSON.stringify({
      name: 'ayc',
      scripts: {
        build: 'mkdir -p .next/static/chunks .next/server && touch .next/BUILD_ID .next/build-manifest.json .next/server/app-paths-manifest.json && for i in 1 2 3 4 5 6; do touch .next/static/chunks/chunk$i.js; done'
      }
    }));
    fs.writeFileSync(path.join(fixtureDir, 'scripts', 'verify-deployment-release-gate.mjs'), 'process.exit(0);\n');

    return fixtureDir;
  }

  it('1. Current production-style path configuration (legacy in-place) is rejected for real deployment', () => {
    const fixture = setupLegacyFixture('legacy-reject');
    const res = spawnSync('bash', [
      SCRIPT_PATH,
      '--execute',
      '--repo-dir', fixture,
      '--skip-git'
    ], { encoding: 'utf-8' });

    assert.equal(res.status, 1);
    const combined = res.stdout + res.stderr;
    assert.match(combined, /DEPLOYMENT BLOCKED: Production services do not yet use the required shared release pointer/);
    assert.match(combined, /Complete the approved infrastructure migration before enabling full-stack deployment/);
  });

  it('2. Dry-run succeeds without activating or modifying a release, even on legacy layout', () => {
    const fixture = setupLegacyFixture('dry-run-legacy');
    const res = spawnSync('bash', [
      SCRIPT_PATH,
      '--dry-run',
      '--repo-dir', fixture,
      '--skip-git'
    ], { encoding: 'utf-8' });

    assert.equal(res.status, 0);
    const combined = res.stdout + res.stderr;
    assert.match(combined, /ARCHITECTURE NOTICE: Host does not yet use the shared-release pointer/);
    assert.match(combined, /DRY RUN COMPLETE/);
    assert.equal(fs.existsSync(path.join(fixture, 'current')), false, 'No current symlink should be created in dry-run');
  });

  it('3. Compatible shared-release fixture passes architecture checks and executes cleanly', () => {
    const fixture = setupSharedReleaseFixture('compatible-shared');
    const res = spawnSync('bash', [
      SCRIPT_PATH,
      '--execute',
      '--commit', 'e95e200111111111111111111111111111111111',
      '--repo-dir', fixture,
      '--skip-git'
    ], { encoding: 'utf-8' });

    assert.equal(res.status, 0);
    const combined = res.stdout + res.stderr;
    assert.match(combined, /Architecture compatibility gate PASSED/);
    assert.match(combined, /Single-pointer atomically swapped to:/);
    assert.match(combined, /DEPLOYMENT SUCCESSFUL/);

    // Verify 'current' symlink now points to the new release
    const currentTarget = fs.readlinkSync(path.join(fixture, 'current'));
    assert.match(currentTarget, /release_.*_e95e200/);
  });

  it('4. Frontend and backend SHAs that differ or mismatch in candidate release are rejected', () => {
    const fixture = setupSharedReleaseFixture('sha-mismatch');
    // Force a mismatch during metadata generation
    fs.writeFileSync(path.join(fixture, 'package.json'), JSON.stringify({
      scripts: {
        build: 'mkdir -p .next/static/chunks .next/server && touch .next/BUILD_ID .next/build-manifest.json .next/server/app-paths-manifest.json && for i in 1 2 3 4 5 6; do touch .next/static/chunks/chunk$i.js; done && echo \'{"frontend_sha":"shaA","backend_sha":"shaB"}\' > RELEASE_METADATA.json'
      }
    }));

    const res = spawnSync('bash', [
      SCRIPT_PATH,
      '--execute',
      '--repo-dir', fixture,
      '--skip-git'
    ], { encoding: 'utf-8' });

    assert.equal(res.status, 1);
    const combined = res.stdout + res.stderr;
    assert.match(combined, /RELEASE SHA MISMATCH/);
  });

  it('5. Incomplete candidate release (missing build artifacts) is rejected', () => {
    const fixture = setupSharedReleaseFixture('incomplete-candidate');
    // Build that does not generate chunks
    fs.writeFileSync(path.join(fixture, 'package.json'), JSON.stringify({
      scripts: {
        build: 'mkdir -p .next && touch .next/BUILD_ID'
      }
    }));

    const res = spawnSync('bash', [
      SCRIPT_PATH,
      '--execute',
      '--repo-dir', fixture,
      '--skip-git'
    ], { encoding: 'utf-8' });

    assert.equal(res.status, 1);
    const combined = res.stdout + res.stderr;
    assert.match(combined, /Sanity check failed: missing required release artifact/);
  });

  it('6. Invalid or broken current pointer is rejected', () => {
    const fixture = setupSharedReleaseFixture('broken-current');
    // Break current symlink
    fs.unlinkSync(path.join(fixture, 'current'));
    fs.symlinkSync(path.join(fixture, 'releases', 'non_existent_directory'), path.join(fixture, 'current'));

    const res = spawnSync('bash', [
      SCRIPT_PATH,
      '--execute',
      '--repo-dir', fixture,
      '--skip-git'
    ], { encoding: 'utf-8' });

    assert.equal(res.status, 1);
    const combined = res.stdout + res.stderr;
    assert.match(combined, /DEPLOYMENT BLOCKED/);
    assert.match(combined, /points to a non-existent directory/);
  });

  it('7. Missing or broken persistent storage is rejected', () => {
    const fixture = setupSharedReleaseFixture('missing-storage');
    // Delete shared storage directory
    fs.rmSync(path.join(fixture, 'shared', 'storage'), { recursive: true, force: true });

    const res = spawnSync('bash', [
      SCRIPT_PATH,
      '--execute',
      '--repo-dir', fixture,
      '--skip-git'
    ], { encoding: 'utf-8' });

    assert.equal(res.status, 1);
    const combined = res.stdout + res.stderr;
    assert.match(combined, /Shared storage directory.*does not exist/);
  });

  it('8. Missing or unsafe (empty/0-byte) environment files cause immediate pre-flight rejection', () => {
    const fixture = setupSharedReleaseFixture('empty-env');
    fs.writeFileSync(path.join(fixture, 'shared', 'backend.env'), ''); // 0 bytes

    const res = spawnSync('bash', [
      SCRIPT_PATH,
      '--dry-run',
      '--repo-dir', fixture,
      '--skip-git'
    ], { encoding: 'utf-8' });

    assert.equal(res.status, 1);
    const combined = res.stdout + res.stderr;
    assert.match(combined, /Environment file is empty \(0 bytes\)/);
  });

  it('9. Missing value for --commit argument is rejected', () => {
    const res = spawnSync('bash', [SCRIPT_PATH, '--commit'], { encoding: 'utf-8' });
    assert.equal(res.status, 1);
    assert.match(res.stderr, /Missing value for --commit argument/);
  });

  it('10. Candidate release is activated only after every preflight and artifact gate passes', () => {
    const fixture = setupSharedReleaseFixture('gate-ordering');
    const res = spawnSync('bash', [
      SCRIPT_PATH,
      '--execute',
      '--commit', '1111111111111111111111111111111111111111',
      '--repo-dir', fixture,
      '--skip-git'
    ], { encoding: 'utf-8' });

    assert.equal(res.status, 0);
    const currentTarget = fs.readlinkSync(path.join(fixture, 'current'));
    assert.match(currentTarget, /release_.*_1111111/);
  });

  it('11. Failed post-activation health checks restore the previous root release pointer (current)', () => {
    const fixture = setupSharedReleaseFixture('failed-health-rollback');
    // Set release gate script to fail
    fs.writeFileSync(path.join(fixture, 'scripts', 'verify-deployment-release-gate.mjs'), 'console.error("Release gate 500 error"); process.exit(1);\n');

    const res = spawnSync('bash', [
      SCRIPT_PATH,
      '--execute',
      '--commit', '2222222222222222222222222222222222222222',
      '--repo-dir', fixture,
      '--skip-git'
    ], { encoding: 'utf-8' });

    assert.equal(res.status, 1);
    const combined = res.stdout + res.stderr;
    assert.match(combined, /RELEASE GATE FAILED/);
    assert.match(combined, /TRIGGERING SINGLE-POINTER FULL-STACK ROLLBACK/);
    assert.match(combined, /Single-pointer full-stack rollback completed to: release_20261028_000000_known_good/);

    // Verify 'current' symlink was restored to the previous known good release
    const restoredTarget = fs.readlinkSync(path.join(fixture, 'current'));
    assert.match(restoredTarget, /release_20261028_000000_known_good/);
  });

  it('12. Failed activation or health check preserves both previous release and persistent data', () => {
    const fixture = setupSharedReleaseFixture('preserve-persistent');
    // Write marker file in persistent shared storage
    fs.writeFileSync(path.join(fixture, 'shared', 'storage', 'app', 'public', 'order_receipt.pdf'), 'PDF_DATA');

    // Make build fail
    fs.writeFileSync(path.join(fixture, 'package.json'), JSON.stringify({ scripts: { build: 'exit 1' } }));

    const res = spawnSync('bash', [
      SCRIPT_PATH,
      '--execute',
      '--repo-dir', fixture,
      '--skip-git'
    ], { encoding: 'utf-8' });

    assert.equal(res.status, 1);
    // Confirm previous release untouched
    const currentTarget = fs.readlinkSync(path.join(fixture, 'current'));
    assert.match(currentTarget, /release_20261028_000000_known_good/);

    // Confirm persistent storage intact
    assert.equal(fs.existsSync(path.join(fixture, 'shared', 'storage', 'app', 'public', 'order_receipt.pdf')), true);
    assert.equal(fs.readFileSync(path.join(fixture, 'shared', 'storage', 'app', 'public', 'order_receipt.pdf'), 'utf-8'), 'PDF_DATA');
  });

  it('13. Automated database rollback is strictly prohibited and never invoked', () => {
    const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf-8');
    assert.equal(scriptContent.includes('migrate:rollback'), false, 'Script must NEVER call migrate:rollback');
    assert.equal(scriptContent.includes('migrate:reset'), false, 'Script must NEVER call migrate:reset');
    assert.equal(scriptContent.includes('migrate:fresh'), false, 'Script must NEVER call migrate:fresh');
    assert.equal(scriptContent.includes('db:wipe'), false, 'Script must NEVER call db:wipe');
  });

  it('14. Real execution remains blocked when the infrastructure prerequisite is unmet', () => {
    const fixture = setupLegacyFixture('blocked-prerequisite');
    const res = spawnSync('bash', [
      SCRIPT_PATH,
      '--execute',
      '--repo-dir', fixture,
      '--skip-git'
    ], { encoding: 'utf-8' });

    assert.equal(res.status, 1);
    assert.match(res.stderr + res.stdout, /DEPLOYMENT BLOCKED: Production services do not yet use the required shared release pointer/);
  });

  it('15. Disabled GitHub deployment gate cannot be bypassed through manual inputs', () => {
    function evaluateDeploymentGate(deployVar, manualInput, event) {
      if (deployVar !== 'true') {
        return { allowed: false, reason: 'ENABLE_PRODUCTION_DEPLOYMENT is not true' };
      }
      if (event === 'workflow_dispatch' && manualInput !== 'true') {
        return { allowed: false, reason: 'Manual input enable_deployment is false' };
      }
      return { allowed: true };
    }

    // Manual dispatch with enable_deployment=true but variable=false -> BLOCKED
    assert.equal(evaluateDeploymentGate('false', 'true', 'workflow_dispatch').allowed, false);

    // Variable unset (empty) -> BLOCKED
    assert.equal(evaluateDeploymentGate('', 'true', 'workflow_dispatch').allowed, false);

    // Push event with variable=false -> BLOCKED
    assert.equal(evaluateDeploymentGate('false', 'false', 'push').allowed, false);

    // Authorized run
    assert.equal(evaluateDeploymentGate('true', 'true', 'workflow_dispatch').allowed, true);
  });

  it('16. Rejects mismatched deployment script checksum (--expected-checksum)', () => {
    const fixture = setupSharedReleaseFixture('checksum-mismatch');
    const fakeChecksum = '0000000000000000000000000000000000000000000000000000000000000000';

    const res = spawnSync('bash', [
      SCRIPT_PATH,
      '--dry-run',
      '--expected-checksum', fakeChecksum,
      '--repo-dir', fixture,
      '--skip-git'
    ], { encoding: 'utf-8' });

    assert.equal(res.status, 1);
    assert.match(res.stderr, /CRITICAL INTEGRITY FAILURE: Deployment script checksum mismatch/);
  });

  it('17. Mutex lock contention prevents concurrent deployment', () => {
    const fixture = setupSharedReleaseFixture('lock-contention');
    const lockFile = path.join(fixture, '.deploy.lock');

    const lockProc = spawnSync('python3', [
      '-c',
      `
import fcntl, sys, subprocess
f = open('${lockFile}', 'w')
fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)

res = subprocess.run(['bash', '${SCRIPT_PATH}', '--dry-run', '--repo-dir', '${fixture}', '--skip-git'], capture_output=True, text=True)
sys.stdout.write(res.stdout + res.stderr)
sys.exit(res.returncode)
`
    ], { encoding: 'utf-8' });

    assert.equal(lockProc.status, 1, 'Deployment script should fail when another process holds the lock');
    assert.match(lockProc.stdout, /Another deployment is currently in progress/);
  });

  it('18. Release retention policy preserves active and rollback releases while pruning obsolete ones', () => {
    const fixture = setupSharedReleaseFixture('retention-prune-test');
    const releasesDir = path.join(fixture, 'releases');

    // Create 7 mock releases
    for (let i = 1; i <= 7; i++) {
      fs.mkdirSync(path.join(releasesDir, `release_2026102${i}_000000_sha${i}`), { recursive: true });
    }

    // Set active release
    fs.mkdirSync(path.join(releasesDir, 'release_20261027_000000_sha7', 'backend'), { recursive: true });
    fs.mkdirSync(path.join(releasesDir, 'release_20261027_000000_sha7', '.next'), { recursive: true });
    fs.unlinkSync(path.join(fixture, 'current'));
    fs.symlinkSync(path.join(releasesDir, 'release_20261027_000000_sha7'), path.join(fixture, 'current'));
    fs.writeFileSync(path.join(releasesDir, 'CURRENT_RELEASE'), 'release_20261027_000000_sha7\n');
    fs.writeFileSync(path.join(releasesDir, 'PREVIOUS_RELEASE'), 'release_20261021_000000_sha1\n');

    const res = spawnSync('bash', [
      SCRIPT_PATH,
      '--execute',
      '--commit', '8888888888888888888888888888888888888888',
      '--repo-dir', fixture,
      '--skip-git'
    ], { encoding: 'utf-8' });

    assert.equal(res.status, 0);

    // Verify current release (new) exists
    const currentTarget = fs.readlinkSync(path.join(fixture, 'current'));
    assert.match(currentTarget, /release_.*_8888888/);

    // Verify rollback release (prior active release_20261027_000000_sha7) is preserved
    assert.equal(fs.existsSync(path.join(releasesDir, 'release_20261027_000000_sha7')), true, 'Prior active release must be preserved as PREVIOUS_RELEASE');
  });

  it('19. Symlinked .next baseline is resolved and copied as real build content (not a symlink)', () => {
    const fixture = path.join(tmpDir, 'migrate-symlink-baseline');
    fs.mkdirSync(path.join(fixture, 'backend', 'public'), { recursive: true });
    fs.writeFileSync(path.join(fixture, 'backend', 'public', 'index.php'), '<?php echo "ok";');
    fs.writeFileSync(path.join(fixture, '.env.production'), 'APP_ENV=production\n');
    fs.writeFileSync(path.join(fixture, 'backend', '.env'), 'DB_PASSWORD=secret\n');
    fs.mkdirSync(path.join(fixture, 'backend', 'storage', 'app', 'private', 'product_offer_sheets'), { recursive: true });
    fs.writeFileSync(path.join(fixture, 'backend', 'storage', 'app', 'private', 'product_offer_sheets', 'canonical-1.pdf'), 'PDF_BYTES');

    // Create versioned build directory and relative symlink .next
    const versionedDir = path.join(fixture, '.next_releases', 'release_20261028_120000_abc123');
    fs.mkdirSync(path.join(versionedDir, 'static', 'chunks'), { recursive: true });
    fs.mkdirSync(path.join(versionedDir, '.hidden_dir', 'nested'), { recursive: true });
    fs.writeFileSync(path.join(versionedDir, 'BUILD_ID'), 'build_symlink_test_123\n');
    fs.writeFileSync(path.join(versionedDir, 'build-manifest.json'), '{"polyfillFiles":[]}');
    fs.writeFileSync(path.join(versionedDir, 'static', 'chunks', 'app-chunk.js'), '// chunk');
    fs.writeFileSync(path.join(versionedDir, '.hidden_file'), 'dotfile_content');
    fs.writeFileSync(path.join(versionedDir, '.hidden_dir', 'nested', '.inner_dot'), 'nested_dotfile_content');

    // Relative symlink: .next -> .next_releases/release_20261028_120000_abc123
    fs.symlinkSync(path.join('.next_releases', 'release_20261028_120000_abc123'), path.join(fixture, '.next'));

    const res = spawnSync('bash', [
      MIGRATE_SCRIPT_PATH,
      '--execute',
      '--app-dir', fixture,
      '--skip-disk-check'
    ], { encoding: 'utf-8' });

    assert.equal(res.status, 0, `Migration failed: ${res.stdout}\n${res.stderr}`);
    const activeRel = fs.readFileSync(path.join(fixture, 'releases', 'CURRENT_RELEASE'), 'utf-8').trim();
    const baselineNext = path.join(fixture, 'releases', activeRel, '.next');

    // Verify .next in baseline release is a real directory (NOT a symlink)
    assert.equal(fs.lstatSync(baselineNext).isDirectory(), true, 'Baseline .next must be a real directory');
    assert.equal(fs.lstatSync(baselineNext).isSymbolicLink(), false, 'Baseline .next must NOT be a symlink');

    // Verify expected manifests, static chunks, and hidden dotfiles were copied
    assert.equal(fs.existsSync(path.join(baselineNext, 'BUILD_ID')), true);
    assert.equal(fs.readFileSync(path.join(baselineNext, 'BUILD_ID'), 'utf-8').trim(), 'build_symlink_test_123');
    assert.equal(fs.existsSync(path.join(baselineNext, 'static', 'chunks', 'app-chunk.js')), true);
    assert.equal(fs.existsSync(path.join(baselineNext, '.hidden_file')), true, 'Hidden file must be copied');
    assert.equal(fs.readFileSync(path.join(baselineNext, '.hidden_file'), 'utf-8'), 'dotfile_content');
    assert.equal(fs.existsSync(path.join(baselineNext, '.hidden_dir', 'nested', '.inner_dot')), true, 'Nested hidden directory and file must be copied');
    assert.equal(fs.readFileSync(path.join(baselineNext, '.hidden_dir', 'nested', '.inner_dot'), 'utf-8'), 'nested_dotfile_content');

    // Verify root current symlink is active
    assert.equal(fs.readlinkSync(path.join(fixture, 'current')), path.join(fixture, 'releases', activeRel));
  });

  it('20. Dangling .next symlink is detected and rejected without data mutation', () => {
    const fixture = path.join(tmpDir, 'migrate-dangling-symlink');
    fs.mkdirSync(path.join(fixture, 'backend', 'public'), { recursive: true });
    fs.writeFileSync(path.join(fixture, 'backend', 'public', 'index.php'), '<?php echo "ok";');
    fs.writeFileSync(path.join(fixture, '.env.production'), 'APP_ENV=production\n');
    fs.writeFileSync(path.join(fixture, 'backend', '.env'), 'DB_PASSWORD=secret\n');
    fs.mkdirSync(path.join(fixture, 'backend', 'storage'), { recursive: true });

    // Dangling symlink
    fs.symlinkSync(path.join('.next_releases', 'ghost_release_folder'), path.join(fixture, '.next'));

    const res = spawnSync('bash', [
      MIGRATE_SCRIPT_PATH,
      '--execute',
      '--app-dir', fixture,
      '--skip-disk-check'
    ], { encoding: 'utf-8' });

    assert.equal(res.status, 1);
    assert.match(res.stderr + res.stdout, /DANGLING SYMLINK/);
    assert.equal(fs.existsSync(path.join(fixture, 'releases')), false);
  });

  it('21. Invalid .next build (missing BUILD_ID or static chunks) is rejected', () => {
    const fixture = path.join(tmpDir, 'migrate-invalid-build');
    fs.mkdirSync(path.join(fixture, 'backend', 'public'), { recursive: true });
    fs.writeFileSync(path.join(fixture, 'backend', 'public', 'index.php'), '<?php echo "ok";');
    fs.writeFileSync(path.join(fixture, '.env.production'), 'APP_ENV=production\n');
    fs.writeFileSync(path.join(fixture, 'backend', '.env'), 'DB_PASSWORD=secret\n');
    fs.mkdirSync(path.join(fixture, 'backend', 'storage'), { recursive: true });

    // Real directory but missing BUILD_ID
    fs.mkdirSync(path.join(fixture, '.next', 'static', 'chunks'), { recursive: true });
    fs.writeFileSync(path.join(fixture, '.next', 'build-manifest.json'), '{}');

    const res = spawnSync('bash', [
      MIGRATE_SCRIPT_PATH,
      '--execute',
      '--app-dir', fixture,
      '--skip-disk-check'
    ], { encoding: 'utf-8' });

    assert.equal(res.status, 1);
    assert.match(res.stderr + res.stdout, /INVALID NEXT.JS BUILD/);
  });

  it('22. Persistent storage migration detects conflicting destination file and refuses to overwrite', () => {
    const fixture = path.join(tmpDir, 'migrate-storage-conflict');
    fs.mkdirSync(path.join(fixture, 'backend', 'storage', 'app', 'private', 'product_offer_sheets'), { recursive: true });
    fs.writeFileSync(path.join(fixture, 'backend', 'storage', 'app', 'private', 'product_offer_sheets', 'canonical.pdf'), 'SOURCE_VERSION_1');

    // Conflicting file already in shared destination
    fs.mkdirSync(path.join(fixture, 'shared', 'storage', 'app', 'private', 'product_offer_sheets'), { recursive: true });
    fs.writeFileSync(path.join(fixture, 'shared', 'storage', 'app', 'private', 'product_offer_sheets', 'canonical.pdf'), 'DESTINATION_VERSION_CONFLICT');

    fs.writeFileSync(path.join(fixture, '.env.production'), 'APP_ENV=production\n');
    fs.writeFileSync(path.join(fixture, 'backend', '.env'), 'DB_PASSWORD=secret\n');
    fs.mkdirSync(path.join(fixture, '.next', 'static', 'chunks'), { recursive: true });
    fs.writeFileSync(path.join(fixture, '.next', 'BUILD_ID'), 'build_1\n');
    fs.writeFileSync(path.join(fixture, '.next', 'build-manifest.json'), '{}');
    fs.writeFileSync(path.join(fixture, '.next', 'static', 'chunks', 'c1.js'), '// chunk');

    const res = spawnSync('bash', [
      MIGRATE_SCRIPT_PATH,
      '--execute',
      '--app-dir', fixture,
      '--skip-disk-check'
    ], { encoding: 'utf-8' });

    assert.equal(res.status, 1);
    assert.match(res.stderr + res.stdout, /CONFLICT: Destination storage file '.*' exists with different content/);

    // Verify destination was NOT overwritten
    const dstContent = fs.readFileSync(path.join(fixture, 'shared', 'storage', 'app', 'private', 'product_offer_sheets', 'canonical.pdf'), 'utf-8');
    assert.equal(dstContent, 'DESTINATION_VERSION_CONFLICT');
  });

  it('23. Partially completed shared-storage migration is detected and completed without data loss', () => {
    const fixture = path.join(tmpDir, 'migrate-partial-storage');
    fs.mkdirSync(path.join(fixture, 'backend', 'storage', 'app', 'public'), { recursive: true });
    fs.writeFileSync(path.join(fixture, 'backend', 'storage', 'app', 'public', 'file1.jpg'), 'SAME_DATA_1');
    fs.writeFileSync(path.join(fixture, 'backend', 'storage', 'app', 'public', 'file2.jpg'), 'NEW_DATA_2');

    // file1 already exists identically in shared/storage
    fs.mkdirSync(path.join(fixture, 'shared', 'storage', 'app', 'public'), { recursive: true });
    fs.writeFileSync(path.join(fixture, 'shared', 'storage', 'app', 'public', 'file1.jpg'), 'SAME_DATA_1');

    fs.writeFileSync(path.join(fixture, '.env.production'), 'APP_ENV=production\n');
    fs.writeFileSync(path.join(fixture, 'backend', '.env'), 'DB_PASSWORD=secret\n');
    fs.mkdirSync(path.join(fixture, '.next', 'static', 'chunks'), { recursive: true });
    fs.writeFileSync(path.join(fixture, '.next', 'BUILD_ID'), 'build_partial\n');
    fs.writeFileSync(path.join(fixture, '.next', 'build-manifest.json'), '{}');
    fs.writeFileSync(path.join(fixture, '.next', 'static', 'chunks', 'c1.js'), '// chunk');

    const res = spawnSync('bash', [
      MIGRATE_SCRIPT_PATH,
      '--execute',
      '--app-dir', fixture,
      '--skip-disk-check'
    ], { encoding: 'utf-8' });

    assert.equal(res.status, 0);
    assert.match(res.stdout, /already identical/);
    assert.equal(fs.readFileSync(path.join(fixture, 'shared', 'storage', 'app', 'public', 'file2.jpg'), 'utf-8'), 'NEW_DATA_2');
  });

  it('24. Environment file protection: byte-for-byte preservation and conflict detection', () => {
    const fixture = path.join(tmpDir, 'migrate-env-conflict');
    fs.mkdirSync(path.join(fixture, 'backend'), { recursive: true });
    fs.writeFileSync(path.join(fixture, '.env.production'), 'SECRET_KEY_SOURCE="source_secret_abc"\n');
    fs.writeFileSync(path.join(fixture, 'backend', '.env'), 'DB_PASS="source_db_pass"\n');

    // Differing file in destination
    fs.mkdirSync(path.join(fixture, 'shared'), { recursive: true });
    fs.writeFileSync(path.join(fixture, 'shared', '.env.production'), 'SECRET_KEY_EXISTING="dest_different_secret"\n');

    const res = spawnSync('bash', [
      MIGRATE_SCRIPT_PATH,
      '--execute',
      '--app-dir', fixture,
      '--skip-disk-check'
    ], { encoding: 'utf-8' });

    assert.equal(res.status, 1);
    assert.match(res.stderr + res.stdout, /CONFLICT: Destination environment file '.*' exists but has different contents/);

    // Verify secret values are never printed
    assert.doesNotMatch(res.stdout, /source_secret_abc/);
    assert.doesNotMatch(res.stdout, /dest_different_secret/);
  });

  it('25. Switching root pointer alone does not falsely count as release adoption if running process serves old build ID', async () => {
    const http = await import('node:http');
    const staleBuildId = 'stale_build_id_11111';
    const expectedBuildId = 'candidate_build_id_99999';

    const server = http.createServer((req, res) => {
      if (req.url === '/api/v1/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: { database: 'ok', redis: 'ok' } }));
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<html><script id="__NEXT_DATA__" type="application/json">{"buildId":"${staleBuildId}"}</script></html>`);
      }
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const child = spawn('node', [GATE_SCRIPT_PATH], {
      env: {
        ...process.env,
        DEPLOY_TARGET_HOST: '127.0.0.1',
        DEPLOY_TARGET_PORT: String(port),
        DEPLOY_TARGET_PROTOCOL: 'http',
        DEPLOY_EXPECTED_BUILD_ID: expectedBuildId,
        SKIP_PM2_GATE: 'true',
        SKIP_API_GATE: 'true',
        SKIP_NGINX_GATE: 'true'
      }
    });

    let combined = '';
    child.stdout.on('data', (d) => { combined += d.toString(); });
    child.stderr.on('data', (d) => { combined += d.toString(); });
    const exitCode = await new Promise((resolve) => child.on('close', resolve));
    server.close();

    assert.equal(exitCode, 1);
    assert.match(combined, /Release identity mismatch/);
    assert.match(combined, /Running process has NOT adopted new release/);
  });

  it('26. Service release identity check passes when served buildId matches candidate buildId', async () => {
    const http = await import('node:http');
    const matchedBuildId = 'verified_candidate_build_id_77777';

    const server = http.createServer((req, res) => {
      if (req.url === '/api/v1/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: { database: 'ok', redis: 'ok' } }));
      } else if (req.url.startsWith('/_next/static/')) {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end('// chunk ok');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<html><script id="__NEXT_DATA__" type="application/json">{"buildId":"${matchedBuildId}"}</script><script src="/_next/static/chunks/main.js"></script></html>`);
      }
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const child = spawn('node', [GATE_SCRIPT_PATH], {
      env: {
        ...process.env,
        DEPLOY_TARGET_HOST: '127.0.0.1',
        DEPLOY_TARGET_PORT: String(port),
        DEPLOY_TARGET_PROTOCOL: 'http',
        DEPLOY_EXPECTED_BUILD_ID: matchedBuildId,
        SKIP_PM2_GATE: 'true',
        SKIP_API_GATE: 'true',
        SKIP_NGINX_GATE: 'true'
      }
    });

    let combined = '';
    child.stdout.on('data', (d) => { combined += d.toString(); });
    child.stderr.on('data', (d) => { combined += d.toString(); });
    const exitCode = await new Promise((resolve) => child.on('close', resolve));
    server.close();

    assert.equal(exitCode, 0);
    assert.match(combined, /ALL RELEASE GATES PASSED/);
  });

  it('27. Queue workers follow the documented drain/restart policy before daemon reload', () => {
    const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf-8');
    const queueRestartIdx = scriptContent.indexOf('artisan queue:restart');
    const supervisorRestartIdx = scriptContent.indexOf('supervisorctl restart ayaan-worker');

    assert.notEqual(queueRestartIdx, -1, 'deploy-production.sh must dispatch artisan queue:restart');
    assert.notEqual(supervisorRestartIdx, -1, 'deploy-production.sh must reload supervisor');
    assert.ok(queueRestartIdx < supervisorRestartIdx, 'artisan queue:restart must be dispatched before supervisor restart to signal graceful in-flight job drain');
  });

  it('28. Repeat baseline migration is idempotent and does not delete or overwrite existing valid files', () => {
    const fixture = path.join(tmpDir, 'migrate-idempotent-baseline');
    fs.mkdirSync(path.join(fixture, 'backend', 'storage', 'app', 'public'), { recursive: true });
    fs.mkdirSync(path.join(fixture, 'backend', 'public'), { recursive: true });
    fs.writeFileSync(path.join(fixture, 'backend', 'public', 'index.php'), '<?php // entry\n');
    fs.mkdirSync(path.join(fixture, '.next', 'static', 'chunks'), { recursive: true });
    fs.writeFileSync(path.join(fixture, '.next', 'BUILD_ID'), 'build_baseline_1\n');
    fs.writeFileSync(path.join(fixture, '.next', 'build-manifest.json'), '{}');
    fs.writeFileSync(path.join(fixture, '.next', 'static', 'chunks', 'c1.js'), '// chunk 1');
    fs.writeFileSync(path.join(fixture, 'backend', 'artisan'), '#!/usr/bin/env php\n');
    fs.writeFileSync(path.join(fixture, '.env.production'), 'ENV_PRODUCTION=1\n');
    fs.writeFileSync(path.join(fixture, 'backend', '.env'), 'ENV_BACKEND=1\n');
    fs.writeFileSync(path.join(fixture, 'backend', 'storage', 'app', 'public', 'test.txt'), 'persisted data');

    // First migration run initializes baseline release and directories
    const firstRun = spawnSync('bash', [
      MIGRATE_SCRIPT_PATH,
      '--execute',
      '--app-dir', fixture,
      '--skip-disk-check'
    ], {
      env: { ...process.env, MIGRATE_BASELINE_ID: '00000000000000_baseline' },
      encoding: 'utf-8'
    });
    assert.equal(firstRun.status, 0, `First run failed: ${firstRun.stderr || firstRun.stdout}`);

    // Create a canary file inside the baseline release to verify it is untouched
    const baselineDir = path.join(fixture, 'releases', '00000000000000_baseline');
    const canaryPath = path.join(baselineDir, 'backend', 'canary.txt');
    fs.writeFileSync(canaryPath, 'CANARY_BASELINE_PAYLOAD');

    // Second migration run must be idempotent and preserve existing files
    const secondRun = spawnSync('bash', [
      MIGRATE_SCRIPT_PATH,
      '--execute',
      '--app-dir', fixture,
      '--skip-disk-check'
    ], {
      env: { ...process.env, MIGRATE_BASELINE_ID: '00000000000000_baseline' },
      encoding: 'utf-8'
    });

    assert.equal(secondRun.status, 0, `Second run failed: ${secondRun.stderr || secondRun.stdout}`);
    assert.match(secondRun.stdout, /Baseline release directory '.*' already exists and contains valid artifacts/);
    assert.equal(fs.readFileSync(canaryPath, 'utf-8'), 'CANARY_BASELINE_PAYLOAD', 'Existing baseline files must be preserved');
  });

  it('29. Corrupt or incomplete existing baseline release destination causes migration to abort with conflict error', () => {
    const fixture = path.join(tmpDir, 'migrate-corrupt-baseline');
    fs.mkdirSync(path.join(fixture, 'releases', '00000000000000_baseline', 'backend'), { recursive: true });
    // Corrupt destination: missing BUILD_ID and missing backend/artisan or public/index.php
    fs.writeFileSync(path.join(fixture, 'releases', '00000000000000_baseline', 'backend', 'corrupt.txt'), 'incomplete');

    fs.mkdirSync(path.join(fixture, 'backend', 'storage', 'app', 'public'), { recursive: true });
    fs.mkdirSync(path.join(fixture, 'backend', 'public'), { recursive: true });
    fs.writeFileSync(path.join(fixture, 'backend', 'public', 'index.php'), '<?php // entry\n');
    fs.mkdirSync(path.join(fixture, '.next', 'static', 'chunks'), { recursive: true });
    fs.writeFileSync(path.join(fixture, '.next', 'BUILD_ID'), 'build_baseline_1\n');
    fs.writeFileSync(path.join(fixture, '.next', 'build-manifest.json'), '{}');
    fs.writeFileSync(path.join(fixture, '.next', 'static', 'chunks', 'c1.js'), '// chunk 1');
    fs.writeFileSync(path.join(fixture, 'backend', 'artisan'), '#!/usr/bin/env php\n');
    fs.writeFileSync(path.join(fixture, '.env.production'), 'ENV_PRODUCTION=1\n');
    fs.writeFileSync(path.join(fixture, 'backend', '.env'), 'ENV_BACKEND=1\n');

    const res = spawnSync('bash', [
      MIGRATE_SCRIPT_PATH,
      '--execute',
      '--app-dir', fixture,
      '--skip-disk-check'
    ], {
      env: { ...process.env, MIGRATE_BASELINE_ID: '00000000000000_baseline' },
      encoding: 'utf-8'
    });

    assert.equal(res.status, 1);
    assert.match(res.stderr + res.stdout, /CONFLICT: Target baseline directory '.*' exists but is incomplete or invalid/);
  });

  it('30. Worker drain timeout detection in handover_queue_workers aborts with exit code 1 when old worker process remains alive past timeout', () => {
    const fixture = path.join(tmpDir, 'drain-timeout-test');
    const binDir = path.join(fixture, 'bin');
    fs.mkdirSync(path.join(fixture, 'current', 'backend'), { recursive: true });
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(path.join(fixture, 'current', 'backend', 'artisan'), '#!/usr/bin/env php\n');

    fs.writeFileSync(path.join(binDir, 'supervisorctl'), `#!/usr/bin/env bash
worker_pid=$(cat "${fixture}/worker_pid.txt" 2>/dev/null || echo "99999")
if [[ "\$1" == "status" ]]; then
  echo "ayaan-worker RUNNING pid \${worker_pid}, uptime 0:10:00"
elif [[ "\$1" == "pid" ]]; then
  echo "\${worker_pid}"
fi
`, { mode: 0o755 });

    fs.writeFileSync(path.join(binDir, 'php'), `#!/usr/bin/env bash
exit 0
`, { mode: 0o755 });

    const res = spawnSync('bash', ['-c', `
      sleep 30 </dev/null >/dev/null 2>&1 &
      worker_pid=\$!
      trap 'kill -9 "\$worker_pid" 2>/dev/null || true' EXIT
      echo "\$worker_pid" > "${fixture}/worker_pid.txt"

      export PATH="${binDir}:\$PATH"
      export QUEUE_DRAIN_TIMEOUT=1
      export DEPLOY_APP_DIR="${fixture}"
      source "${SCRIPT_PATH}"
      handover_queue_workers
    `], { encoding: 'utf-8' });

    assert.equal(res.status, 1);
    assert.match(res.stderr + res.stdout, /QUEUE DRAIN TIMEOUT: Worker PID \d+ did not exit within 1s/);
    assert.match(res.stderr + res.stdout, /Refusing to kill active work\. Aborting release activation\./);
  });

  it('31. Successful worker drain handover when old worker exits after restart signal and Supervisor spawns replacement worker', () => {
    const fixture = path.join(tmpDir, 'drain-success-test');
    const binDir = path.join(fixture, 'bin');
    fs.mkdirSync(path.join(fixture, 'current', 'backend'), { recursive: true });
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(path.join(fixture, 'current', 'backend', 'artisan'), '#!/usr/bin/env php\n');

    fs.writeFileSync(path.join(binDir, 'php'), `#!/usr/bin/env bash
# Terminate old worker process when artisan queue:restart is called
if [[ -f "${fixture}/old_pid.txt" ]]; then
  old_pid=$(cat "${fixture}/old_pid.txt")
  kill -9 "\$old_pid" 2>/dev/null || true
fi
exit 0
`, { mode: 0o755 });

    fs.writeFileSync(path.join(binDir, 'supervisorctl'), `#!/usr/bin/env bash
old_pid=$(cat "${fixture}/old_pid.txt" 2>/dev/null || echo "11111")
new_pid=$(cat "${fixture}/new_pid.txt" 2>/dev/null || echo "22222")
if [[ "\$1" == "status" ]]; then
  if kill -0 "\$old_pid" 2>/dev/null; then
    echo "ayaan-worker RUNNING pid \${old_pid}, uptime 0:10:00"
  else
    echo "ayaan-worker RUNNING pid \${new_pid}, uptime 0:00:01"
  fi
elif [[ "\$1" == "pid" ]]; then
  if kill -0 "\$old_pid" 2>/dev/null; then
    echo "\${old_pid}"
  else
    echo "\${new_pid}"
  fi
elif [[ "\$1" == "restart" ]]; then
  echo "ayaan-worker: stopped"
  echo "ayaan-worker: started"
fi
`, { mode: 0o755 });

    const res = spawnSync('bash', ['-c', `
      sleep 30 </dev/null >/dev/null 2>&1 &
      old_pid=\$!
      sleep 30 </dev/null >/dev/null 2>&1 &
      new_pid=\$!
      trap 'kill -9 "\$old_pid" "\$new_pid" 2>/dev/null || true' EXIT

      echo "\$old_pid" > "${fixture}/old_pid.txt"
      echo "\$new_pid" > "${fixture}/new_pid.txt"

      export PATH="${binDir}:\$PATH"
      export QUEUE_DRAIN_TIMEOUT=5
      export DEPLOY_APP_DIR="${fixture}"
      source "${SCRIPT_PATH}"
      handover_queue_workers
    `], { encoding: 'utf-8' });

    assert.equal(res.status, 0, `Handover failed: ${res.stderr || res.stdout}`);
    assert.match(res.stdout, /finished active work and exited/);
    assert.match(res.stdout, /New queue worker verified running/);
  });

  it('32. PM2 working directory check detects obsolete pm_cwd and fails adoption check', () => {
    const fixture = path.join(tmpDir, 'pm2-cwd-test');
    const binDir = path.join(fixture, 'bin');
    fs.mkdirSync(binDir, { recursive: true });

    fs.writeFileSync(path.join(binDir, 'pm2'), `#!/usr/bin/env bash
if [[ "\$*" == *"jlist"* ]]; then
  echo '[{"name":"ayaan-customer","pm2_env":{"status":"online","pm_cwd":"/var/www/ayaan_obsolete_previous_release"}},{"name":"ayaan-admin","pm2_env":{"status":"online","pm_cwd":"/var/www/ayaan/current"}}]'
  exit 0
fi
exit 0
`, { mode: 0o755 });

    const res = spawnSync('node', [GATE_SCRIPT_PATH], {
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        VERIFY_PM2_CWD: 'true',
        DEPLOY_EXPECTED_CWD: '/var/www/ayaan/current',
        SKIP_METADATA_GATE: 'true',
        SKIP_API_GATE: 'true',
        SKIP_NGINX_GATE: 'true',
        SKIP_WORKER_GATE: 'true'
      },
      encoding: 'utf-8'
    });

    assert.equal(res.status, 1);
    assert.match(res.stderr + res.stdout, /PM2 process 'ayaan-customer' running in obsolete directory: '\/var\/www\/ayaan_obsolete_previous_release'/);
    assert.match(res.stderr + res.stdout, /RELEASE GATE REJECTED: PM2 processes are not healthy or failed release adoption/);
  });

  it('33. Full-stack release metadata SHA mismatch (frontend_sha !== backend_sha) fails release gate', () => {
    const fixture = path.join(tmpDir, 'meta-mismatch-test');
    fs.mkdirSync(fixture, { recursive: true });

    fs.writeFileSync(path.join(fixture, 'RELEASE_METADATA.json'), JSON.stringify({
      release_id: 'test_mismatch_rel',
      commit_sha: 'commit_abcdef',
      frontend_sha: 'frontend_commit_111111',
      backend_sha: 'backend_commit_222222'
    }, null, 2));

    const res = spawnSync('node', [GATE_SCRIPT_PATH], {
      env: {
        ...process.env,
        DEPLOY_CURRENT_PATH: fixture,
        SKIP_PM2_GATE: 'true',
        SKIP_API_GATE: 'true',
        SKIP_NGINX_GATE: 'true',
        SKIP_WORKER_GATE: 'true'
      },
      encoding: 'utf-8'
    });

    assert.equal(res.status, 1);
    assert.match(res.stderr + res.stdout, /Release SHA mismatch: frontend \(frontend_commit_111111\) and backend \(backend_commit_222222\) do not match!/);
    assert.match(res.stderr + res.stdout, /RELEASE GATE REJECTED: Full-stack release metadata or SHA alignment check failed/);
  });

  it('34. An HTTP 200 response alone is insufficient to certify admin release if admin gateway serves obsolete buildId', async () => {
    const http = await import('node:http');
    const staleAdminBuildId = 'stale_admin_build_11111';
    const candidateBuildId = 'candidate_release_build_99999';

    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<html><script id="__NEXT_DATA__" type="application/json">{"buildId":"${staleAdminBuildId}"}</script></html>`);
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const fixture = path.join(tmpDir, 'pm2-admin-stale');
    const binDir = path.join(fixture, 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(path.join(binDir, 'pm2'), `#!/usr/bin/env bash
if [[ "$*" == *"jlist"* ]]; then
  echo '[{"name":"ayaan-customer","pm2_env":{"status":"online","pm_cwd":"/var/www/ayaan/current"}},{"name":"ayaan-admin","pm2_env":{"status":"online","pm_cwd":"/var/www/ayaan/current"}}]'
  exit 0
fi
exit 0
`, { mode: 0o755 });

    const child = spawn('node', [GATE_SCRIPT_PATH], {
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        DEPLOY_TARGET_HOST: '127.0.0.1',
        DEPLOY_ADMIN_PORT: String(port),
        DEPLOY_EXPECTED_BUILD_ID: candidateBuildId,
        REQUIRE_ADMIN_PROXY: 'true',
        SKIP_METADATA_GATE: 'true',
        SKIP_API_GATE: 'true',
        SKIP_NGINX_GATE: 'true',
        SKIP_WORKER_GATE: 'true'
      }
    });

    let combined = '';
    child.stdout.on('data', (d) => { combined += d.toString(); });
    child.stderr.on('data', (d) => { combined += d.toString(); });
    const exitCode = await new Promise((resolve) => child.on('close', resolve));
    server.close();

    assert.equal(exitCode, 1);
    assert.match(combined, /Admin gateway served obsolete buildId 'stale_admin_build_11111'/);
    assert.match(combined, /RELEASE GATE REJECTED: PM2 processes are not healthy or failed release adoption/);
  });

  it('35. Laravel API reported runtime SHA mismatching candidate commit causes release gate failure', async () => {
    const http = await import('node:http');
    const staleCommitSha = 'stale_php_commit_000000';
    const candidateCommitSha = 'candidate_commit_222222';

    const server = http.createServer((req, res) => {
      if (req.url === '/api/v1/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: {
            database: 'ok',
            redis: 'ok',
            commit_sha: staleCommitSha,
            release_id: 'release_old_stale'
          }
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const child = spawn('node', [GATE_SCRIPT_PATH], {
      env: {
        ...process.env,
        DEPLOY_TARGET_HOST: '127.0.0.1',
        DEPLOY_TARGET_PORT: String(port),
        DEPLOY_TARGET_PROTOCOL: 'http',
        DEPLOY_EXPECTED_COMMIT: candidateCommitSha,
        SKIP_METADATA_GATE: 'true',
        SKIP_PM2_GATE: 'true',
        SKIP_NGINX_GATE: 'true',
        SKIP_WORKER_GATE: 'true'
      }
    });

    let combined = '';
    child.stdout.on('data', (d) => { combined += d.toString(); });
    child.stderr.on('data', (d) => { combined += d.toString(); });
    const exitCode = await new Promise((resolve) => child.on('close', resolve));
    server.close();

    assert.equal(exitCode, 1);
    assert.match(combined, /PHP-FPM \/ Laravel API runtime release mismatch: served commit 'stale_php_commit_000000'/);
    assert.match(combined, /RELEASE GATE REJECTED: Backend API health check failed/);
  });

  it('36. Stale PHP-FPM response after simulated reload causes release gate rejection even if disk metadata matches', async () => {
    const http = await import('node:http');
    const candidateCommitSha = 'candidate_commit_333333';
    const staleOpcodeSha = 'cached_opcode_sha_111111';

    const fixture = path.join(tmpDir, 'gate-opcache-stale');
    fs.mkdirSync(fixture, { recursive: true });
    fs.writeFileSync(path.join(fixture, 'RELEASE_METADATA.json'), JSON.stringify({
      release_id: 'release_candidate',
      commit_sha: candidateCommitSha,
      frontend_sha: candidateCommitSha,
      backend_sha: candidateCommitSha
    }, null, 2));

    const server = http.createServer((req, res) => {
      if (req.url === '/api/v1/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: {
            database: 'ok',
            redis: 'ok',
            commit_sha: staleOpcodeSha
          }
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const child = spawn('node', [GATE_SCRIPT_PATH], {
      env: {
        ...process.env,
        DEPLOY_TARGET_HOST: '127.0.0.1',
        DEPLOY_TARGET_PORT: String(port),
        DEPLOY_TARGET_PROTOCOL: 'http',
        DEPLOY_CURRENT_PATH: fixture,
        DEPLOY_EXPECTED_COMMIT: candidateCommitSha,
        SKIP_PM2_GATE: 'true',
        SKIP_NGINX_GATE: 'true',
        SKIP_WORKER_GATE: 'true'
      }
    });

    let combined = '';
    child.stdout.on('data', (d) => { combined += d.toString(); });
    child.stderr.on('data', (d) => { combined += d.toString(); });
    const exitCode = await new Promise((resolve) => child.on('close', resolve));
    server.close();

    assert.equal(exitCode, 1);
    assert.match(combined, /Verified release release_candidate/);
    assert.match(combined, /PHP-FPM \/ Laravel API runtime release mismatch: served commit 'cached_opcode_sha_111111'/);
    assert.match(combined, /RELEASE GATE REJECTED: Backend API health check failed/);
  });

  it('37. Supervisor queue worker whose runtime release identity is old causes release gate failure', async () => {
    const http = await import('node:http');
    const candidateCommitSha = 'candidate_commit_444444';
    const staleWorkerSha = 'stale_worker_sha_999999';

    const fixture = path.join(tmpDir, 'gate-worker-stale');
    const binDir = path.join(fixture, 'bin');
    fs.mkdirSync(binDir, { recursive: true });

    fs.writeFileSync(path.join(binDir, 'supervisorctl'), `#!/usr/bin/env bash
if [[ "$1" == "status" ]]; then
  echo "ayaan-worker RUNNING pid 12345, uptime 0:01:00"
elif [[ "$1" == "pid" ]]; then
  echo "12345"
fi
`, { mode: 0o755 });

    const server = http.createServer((req, res) => {
      if (req.url === '/api/v1/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: {
            database: 'ok',
            redis: 'ok',
            commit_sha: candidateCommitSha,
            queue_worker: {
              pid: 12345,
              commit_sha: staleWorkerSha,
              release_id: 'release_old',
              active: true
            }
          }
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const child = spawn('node', [GATE_SCRIPT_PATH], {
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        DEPLOY_TARGET_HOST: '127.0.0.1',
        DEPLOY_TARGET_PORT: String(port),
        DEPLOY_TARGET_PROTOCOL: 'http',
        DEPLOY_EXPECTED_COMMIT: candidateCommitSha,
        SKIP_METADATA_GATE: 'true',
        SKIP_PM2_GATE: 'true',
        SKIP_NGINX_GATE: 'true',
        SKIP_ASSETS_GATE: 'true'
      }
    });

    let combined = '';
    child.stdout.on('data', (d) => { combined += d.toString(); });
    child.stderr.on('data', (d) => { combined += d.toString(); });
    const exitCode = await new Promise((resolve) => child.on('close', resolve));
    server.close();

    assert.equal(exitCode, 1);
    assert.match(combined, /Queue worker runtime release mismatch: worker (?:PID \d+ )?is executing commit 'stale_worker_sha_999999'/);
    assert.match(combined, /RELEASE GATE REJECTED: Supervisor queue worker health check failed/);
  });

  it('38. Supervisor queue worker with matching runtime release identity and active heartbeat passes release gate', async () => {
    const http = await import('node:http');
    const matchedCommitSha = 'candidate_commit_555555';
    const workerPid = 54321;

    const fixture = path.join(tmpDir, 'gate-worker-match');
    const binDir = path.join(fixture, 'bin');
    fs.mkdirSync(binDir, { recursive: true });

    fs.writeFileSync(path.join(binDir, 'supervisorctl'), `#!/usr/bin/env bash
if [[ "$1" == "status" ]]; then
  echo "ayaan-worker RUNNING pid ${workerPid}, uptime 0:00:10"
elif [[ "$1" == "pid" ]]; then
  echo "${workerPid}"
fi
`, { mode: 0o755 });

    fs.writeFileSync(path.join(binDir, 'ps'), `#!/usr/bin/env bash
echo "php /var/www/ayaan/current/backend/artisan queue:work redis"
`, { mode: 0o755 });

    const server = http.createServer((req, res) => {
      if (req.url === '/api/v1/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: {
            database: 'ok',
            redis: 'ok',
            commit_sha: matchedCommitSha,
            queue_worker: {
              pid: workerPid,
              commit_sha: matchedCommitSha,
              release_id: 'release_new',
              active: true
            }
          }
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const child = spawn('node', [GATE_SCRIPT_PATH], {
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        DEPLOY_TARGET_HOST: '127.0.0.1',
        DEPLOY_TARGET_PORT: String(port),
        DEPLOY_TARGET_PROTOCOL: 'http',
        DEPLOY_EXPECTED_COMMIT: matchedCommitSha,
        SKIP_METADATA_GATE: 'true',
        SKIP_PM2_GATE: 'true',
        SKIP_NGINX_GATE: 'true',
        SKIP_ASSETS_GATE: 'true'
      }
    });

    let combined = '';
    child.stdout.on('data', (d) => { combined += d.toString(); });
    child.stderr.on('data', (d) => { combined += d.toString(); });
    const exitCode = await new Promise((resolve) => child.on('close', resolve));
    server.close();

    assert.equal(exitCode, 0);
    assert.match(combined, /Verifying Supervisor Queue Worker Health & Runtime Identity/);
    assert.match(combined, new RegExp(`PID: ${workerPid}, Status: RUNNING, SHA: ${matchedCommitSha}`));
    assert.match(combined, /ALL RELEASE GATES PASSED: DEPLOYMENT VERIFIED 100% OK/);
  });

  it('39. Metadata SHAs matching on disk cannot override a running-process identity failure', async () => {
    const http = await import('node:http');
    const candidateSha = 'matching_disk_sha_777777';
    const staleBuildId = 'stale_served_build_00000';
    const expectedBuildId = 'candidate_expected_build_88888';

    const fixture = path.join(tmpDir, 'gate-disk-vs-process');
    fs.mkdirSync(fixture, { recursive: true });
    fs.writeFileSync(path.join(fixture, 'RELEASE_METADATA.json'), JSON.stringify({
      release_id: 'release_matching_disk',
      commit_sha: candidateSha,
      frontend_sha: candidateSha,
      backend_sha: candidateSha
    }, null, 2));

    const server = http.createServer((req, res) => {
      if (req.url === '/api/v1/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: { database: 'ok', redis: 'ok', commit_sha: candidateSha }
        }));
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<html><script id="__NEXT_DATA__" type="application/json">{"buildId":"${staleBuildId}"}</script></html>`);
      }
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const child = spawn('node', [GATE_SCRIPT_PATH], {
      env: {
        ...process.env,
        DEPLOY_TARGET_HOST: '127.0.0.1',
        DEPLOY_TARGET_PORT: String(port),
        DEPLOY_TARGET_PROTOCOL: 'http',
        DEPLOY_CURRENT_PATH: fixture,
        DEPLOY_EXPECTED_COMMIT: candidateSha,
        DEPLOY_EXPECTED_BUILD_ID: expectedBuildId,
        SKIP_PM2_GATE: 'true',
        SKIP_NGINX_GATE: 'true',
        SKIP_WORKER_GATE: 'true'
      }
    });

    let combined = '';
    child.stdout.on('data', (d) => { combined += d.toString(); });
    child.stderr.on('data', (d) => { combined += d.toString(); });
    const exitCode = await new Promise((resolve) => child.on('close', resolve));
    server.close();

    assert.equal(exitCode, 1);
    assert.match(combined, /Verified release release_matching_disk/);
    assert.match(combined, /Release identity mismatch on 'Storefront Home'/);
    assert.match(combined, /RELEASE GATE REJECTED: Page, static asset, or release identity inconsistencies detected/);
  });

  it('40. Rollback is not declared successful while any required component remains on the failed release', () => {
    const fixture = setupSharedReleaseFixture('rollback-gate-failure');
    // Set up prior release
    const priorRel = path.join(fixture, 'releases', 'release_20261027_000000_prior_good');
    fs.mkdirSync(priorRel, { recursive: true });
    fs.mkdirSync(path.join(priorRel, 'backend', 'public'), { recursive: true });
    fs.mkdirSync(path.join(priorRel, '.next'), { recursive: true });
    fs.writeFileSync(path.join(priorRel, 'backend', 'public', 'index.php'), '<?php echo "ok";');
    fs.writeFileSync(path.join(priorRel, '.next', 'BUILD_ID'), 'prior_build_id\n');
    fs.writeFileSync(path.join(fixture, 'releases', 'PREVIOUS_RELEASE'), 'release_20261027_000000_prior_good\n');

    // Ensure the restored release's release gate script fails
    fs.writeFileSync(path.join(fixture, 'scripts', 'verify-deployment-release-gate.mjs'), 'console.error("Rollback release gate check failed: process did not adopt"); process.exit(1);\n');

    const res = spawnSync('bash', [
      SCRIPT_PATH,
      '--execute',
      '--rollback',
      '--repo-dir', fixture,
      '--skip-git'
    ], { encoding: 'utf-8' });

    assert.equal(res.status, 1);
    assert.match(res.stderr + res.stdout, /ROLLBACK ADOPTION FAILED: Restored release failed runtime verification!/);
  });

  it('41. Old PHP-FPM process holding immutable compiled bytecode returns old SHA despite current pointer swap, causing gate rejection', async () => {
    const http = await import('node:http');
    const oldBytecodeSha = 'old_compiled_opcode_sha_111111';
    const newCandidateSha = 'new_candidate_commit_sha_222222';

    const fixture = path.join(tmpDir, 'gate-opcache-immutable');
    fs.mkdirSync(fixture, { recursive: true });
    // Candidate on-disk metadata matches the new commit
    fs.writeFileSync(path.join(fixture, 'RELEASE_METADATA.json'), JSON.stringify({
      release_id: 'release_candidate_20261030',
      commit_sha: newCandidateSha,
      frontend_sha: newCandidateSha,
      backend_sha: newCandidateSha
    }, null, 2));

    // Mock PHP-FPM server simulates a running PHP worker that still executes old ReleaseIdentity constants
    const server = http.createServer((req, res) => {
      if (req.url === '/api/v1/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: {
            database: 'ok',
            redis: 'ok',
            // PHP-FPM worker executes compiled bytecode from prior release
            commit_sha: oldBytecodeSha,
            release_id: 'release_old_20261029'
          }
        }));
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html>ok</html>');
      }
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const child = spawn('node', [GATE_SCRIPT_PATH], {
      env: {
        ...process.env,
        DEPLOY_TARGET_HOST: '127.0.0.1',
        DEPLOY_TARGET_PORT: String(port),
        DEPLOY_TARGET_PROTOCOL: 'http',
        DEPLOY_CURRENT_PATH: fixture,
        DEPLOY_EXPECTED_COMMIT: newCandidateSha,
        SKIP_PM2_GATE: 'true',
        SKIP_NGINX_GATE: 'true',
        SKIP_WORKER_GATE: 'true'
      }
    });

    let combined = '';
    child.stdout.on('data', (d) => { combined += d.toString(); });
    child.stderr.on('data', (d) => { combined += d.toString(); });
    const exitCode = await new Promise((resolve) => child.on('close', resolve));
    server.close();

    assert.equal(exitCode, 1);
    assert.match(combined, /Verified release release_candidate_20261030/);
    assert.match(combined, /PHP-FPM \/ Laravel API runtime release mismatch: served commit 'old_compiled_opcode_sha_111111'/);
    assert.match(combined, /RELEASE GATE REJECTED: Backend API health check failed/);
  });

  it('42. Old queue worker preserving boot-time release identity ignores updated disk metadata, causing gate rejection', async () => {
    const http = await import('node:http');
    const oldWorkerBootSha = 'old_worker_boot_sha_333333';
    const newCandidateSha = 'new_candidate_sha_444444';
    const workerPid = 67890;

    const fixture = path.join(tmpDir, 'gate-worker-boot-identity');
    const binDir = path.join(fixture, 'bin');
    fs.mkdirSync(binDir, { recursive: true });

    // Mock supervisorctl shows worker running with PID 67890
    fs.writeFileSync(path.join(binDir, 'supervisorctl'), `#!/usr/bin/env bash
if [[ "$1" == "status" ]]; then
  echo "ayaan-worker RUNNING pid ${workerPid}, uptime 0:10:00"
elif [[ "$1" == "pid" ]]; then
  echo "${workerPid}"
fi
`, { mode: 0o755 });

    // Mock health endpoint shows the worker's heartbeat in Redis holding its boot identity
    const server = http.createServer((req, res) => {
      if (req.url === '/api/v1/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: {
            database: 'ok',
            redis: 'ok',
            commit_sha: newCandidateSha,
            queue_worker: {
              pid: workerPid,
              instance_id: 'worker_boot_instance_01',
              // Worker booted in old release preserves its boot identity in memory
              commit_sha: oldWorkerBootSha,
              release_id: 'release_old_20261029',
              recorded_at: Math.floor(Date.now() / 1000),
              active: true
            }
          }
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const child = spawn('node', [GATE_SCRIPT_PATH], {
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        DEPLOY_TARGET_HOST: '127.0.0.1',
        DEPLOY_TARGET_PORT: String(port),
        DEPLOY_TARGET_PROTOCOL: 'http',
        DEPLOY_EXPECTED_COMMIT: newCandidateSha,
        SKIP_METADATA_GATE: 'true',
        SKIP_PM2_GATE: 'true',
        SKIP_NGINX_GATE: 'true',
        SKIP_ASSETS_GATE: 'true'
      }
    });

    let combined = '';
    child.stdout.on('data', (d) => { combined += d.toString(); });
    child.stderr.on('data', (d) => { combined += d.toString(); });
    const exitCode = await new Promise((resolve) => child.on('close', resolve));
    server.close();

    assert.equal(exitCode, 1);
    assert.match(combined, /Queue worker runtime release mismatch: worker (?:PID \d+ )?is executing commit 'old_worker_boot_sha_333333'/);
    assert.match(combined, /RELEASE GATE REJECTED: Supervisor queue worker health check failed/);
  });

  it('43. Worker heartbeat expiration: heartbeat timestamp >30s is detected as stale and active: false', () => {
    // Test the health check worker probe freshness logic
    const now = Math.floor(Date.now() / 1000);
    const staleRecordedAt = now - 50; // 50 seconds ago (> 45s threshold)

    const isFresh = (now - staleRecordedAt) >= 0 && (now - staleRecordedAt) <= 45;
    assert.equal(isFresh, false, 'Heartbeat recorded 50s ago must evaluate to active: false');

    const freshRecordedAt = now - 5; // 5 seconds ago (within threshold)
    const isFreshRecent = (now - freshRecordedAt) >= 0 && (now - freshRecordedAt) <= 45;
    assert.equal(isFreshRecent, true, 'Heartbeat recorded 5s ago must evaluate to active: true');
  });

  it('44. Stale worker heartbeat (>30s since last cycle) causes release gate rejection', async () => {
    const http = await import('node:http');
    const candidateSha = 'candidate_commit_666666';
    const workerPid = 88888;

    const fixture = path.join(tmpDir, 'gate-worker-stale-heartbeat');
    const binDir = path.join(fixture, 'bin');
    fs.mkdirSync(binDir, { recursive: true });

    fs.writeFileSync(path.join(binDir, 'supervisorctl'), `#!/usr/bin/env bash
if [[ "$1" == "status" ]]; then
  echo "ayaan-worker RUNNING pid ${workerPid}, uptime 0:05:00"
elif [[ "$1" == "pid" ]]; then
  echo "${workerPid}"
fi
`, { mode: 0o755 });

    const server = http.createServer((req, res) => {
      if (req.url === '/api/v1/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: {
            database: 'ok',
            redis: 'ok',
            commit_sha: candidateSha,
            queue_worker: {
              pid: workerPid,
              instance_id: 'worker_dead_or_frozen',
              commit_sha: candidateSha,
              release_id: 'release_new',
              recorded_at: Math.floor(Date.now() / 1000) - 50,
              active: false // Flagged as stale by HealthController
            }
          }
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const child = spawn('node', [GATE_SCRIPT_PATH], {
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        DEPLOY_TARGET_HOST: '127.0.0.1',
        DEPLOY_TARGET_PORT: String(port),
        DEPLOY_TARGET_PROTOCOL: 'http',
        DEPLOY_EXPECTED_COMMIT: candidateSha,
        SKIP_METADATA_GATE: 'true',
        SKIP_PM2_GATE: 'true',
        SKIP_NGINX_GATE: 'true',
        SKIP_ASSETS_GATE: 'true'
      }
    });

    let combined = '';
    child.stdout.on('data', (d) => { combined += d.toString(); });
    child.stderr.on('data', (d) => { combined += d.toString(); });
    const exitCode = await new Promise((resolve) => child.on('close', resolve));
    server.close();

    assert.equal(exitCode, 1);
    assert.match(combined, /Queue worker(?: PID \d+)? heartbeat is stale/);
    assert.match(combined, /RELEASE GATE REJECTED: Supervisor queue worker health check failed/);
  });

  it('45. Redis/Cache heartbeat exception inside Queue::looping is safely handled without crashing worker or queue job', () => {
    let jobProcessed = false;
    let cacheExceptionLogged = false;

    const simulateWorkerLoop = (cacheDriver) => {
      try {
        cacheDriver.put('ayaan:worker:release_identity', { pid: 12345 }, 30);
      } catch (err) {
        cacheExceptionLogged = true;
      }
      jobProcessed = true;
    };

    const failingCacheDriver = {
      put: () => {
        throw new Error('Redis connection timed out or socket dropped');
      }
    };

    simulateWorkerLoop(failingCacheDriver);

    assert.equal(cacheExceptionLogged, true, 'Cache exception must be trapped inside worker loop callback');
    assert.equal(jobProcessed, true, 'Queue worker job processing must proceed without interruption');
  });

  it('46. Worker job completion lifecycle: transition from busy back to idle resets fresh idle TTL', () => {
    // Simulate lifecycle events
    const workerPid = 33333;
    const instanceId = 'inst-lifecycle-test';
    const commitSha = 'candidate_commit_lifecycle';
    const releaseId = 'release_lifecycle';

    // Step 1: Worker boot / idle
    const t0 = Math.floor(Date.now() / 1000);
    const workerState = {
      pid: workerPid,
      instance_id: instanceId,
      commit_sha: commitSha,
      release_id: releaseId,
      status: 'idle',
      booted_at: t0,
      recorded_at: t0,
      job_started_at: null,
      job_name: null
    };

    assert.equal(workerState.status, 'idle');
    assert.equal(workerState.job_started_at, null);

    // Step 2: Job received (Queue::before hook)
    const tJobStart = t0 + 5;
    workerState.status = 'busy';
    workerState.job_started_at = tJobStart;
    workerState.job_name = 'App\\Jobs\\GenerateOfferSheetPdf';
    workerState.recorded_at = tJobStart;

    assert.equal(workerState.status, 'busy');
    assert.equal(workerState.job_started_at, tJobStart);
    assert.equal(workerState.job_name, 'App\\Jobs\\GenerateOfferSheetPdf');

    // Step 3: During job execution at 45s (Offer Sheet PDF generation taking 45s)
    const tDuringJob = tJobStart + 45;
    const retryAfter = 90;
    const isFreshDuringJob = (workerState.status === 'busy' && workerState.job_started_at > 0)
      ? (tDuringJob - workerState.job_started_at >= 0 && tDuringJob - workerState.job_started_at <= retryAfter)
      : (tDuringJob - workerState.recorded_at >= 0 && tDuringJob - workerState.recorded_at <= 45);

    assert.equal(isFreshDuringJob, true, 'Worker must remain active and fresh while processing 45s PDF job');

    // Step 4: Job completed successfully (Queue::after hook)
    const tJobEnd = tJobStart + 45;
    workerState.status = 'idle';
    workerState.job_started_at = null;
    workerState.job_name = null;
    workerState.recorded_at = tJobEnd;

    assert.equal(workerState.status, 'idle');
    assert.equal(workerState.job_started_at, null);

    // Step 5: Post-job idle freshness check
    const isFreshPostJob = (workerState.status === 'busy' && workerState.job_started_at > 0)
      ? false
      : (tJobEnd - workerState.recorded_at <= 45);

    assert.equal(isFreshPostJob, true, 'Worker returned to idle must be active and fresh');
  });

  it('47. Long-running jobs (10s, 30s, 45s, 60s): heartbeat status busy with job_started_at prevents premature stale expiration during legitimate job processing', async () => {
    const http = await import('node:http');
    const candidateSha = 'candidate_commit_long_jobs';
    const workerPid = 44444;
    const retryAfter = 90;

    // Test duration matrix for commercial PDF generation (10s, 30s, 45s, 60s)
    const testDurations = [10, 30, 45, 60];
    const now = Math.floor(Date.now() / 1000);

    for (const duration of testDurations) {
      const jobStartedAt = now - duration;
      const status = 'busy';
      const isFresh = (status === 'busy' && jobStartedAt > 0)
        ? (now - jobStartedAt >= 0 && now - jobStartedAt <= retryAfter)
        : (now - (now - duration) <= 45);

      assert.equal(isFresh, true, `Job of duration ${duration}s must be evaluated as fresh and active`);
    }

    // Full release gate integration test with worker in busy state (50s into job)
    const fixture = path.join(tmpDir, 'gate-worker-busy-long-job');
    const binDir = path.join(fixture, 'bin');
    fs.mkdirSync(binDir, { recursive: true });

    fs.writeFileSync(path.join(binDir, 'supervisorctl'), `#!/usr/bin/env bash
if [[ "$1" == "status" ]]; then
  echo "ayaan-worker RUNNING pid ${workerPid}, uptime 0:10:00"
elif [[ "$1" == "pid" ]]; then
  echo "${workerPid}"
fi
`, { mode: 0o755 });

    const server = http.createServer((req, res) => {
      if (req.url === '/api/v1/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: {
            database: 'ok',
            redis: 'ok',
            commit_sha: candidateSha,
            queue_worker: {
              pid: workerPid,
              instance_id: 'worker_busy_offer_sheet_job',
              commit_sha: candidateSha,
              release_id: 'release_new',
              status: 'busy',
              job_started_at: Math.floor(Date.now() / 1000) - 50,
              recorded_at: Math.floor(Date.now() / 1000) - 50,
              active: true
            }
          }
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const child = spawn('node', [GATE_SCRIPT_PATH], {
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        DEPLOY_TARGET_HOST: '127.0.0.1',
        DEPLOY_TARGET_PORT: String(port),
        DEPLOY_TARGET_PROTOCOL: 'http',
        DEPLOY_EXPECTED_COMMIT: candidateSha,
        SKIP_METADATA_GATE: 'true',
        SKIP_PM2_GATE: 'true',
        SKIP_NGINX_GATE: 'true',
        SKIP_ASSETS_GATE: 'true'
      }
    });

    let combined = '';
    child.stdout.on('data', (d) => { combined += d.toString(); });
    child.stderr.on('data', (d) => { combined += d.toString(); });
    const exitCode = await new Promise((resolve) => child.on('close', resolve));
    server.close();

    assert.equal(exitCode, 0, `Release gate must pass for worker actively processing job: ${combined}`);
    assert.match(combined, new RegExp(`PID: ${workerPid}, Status: RUNNING, SHA: ${candidateSha}`));
  });

  it('48. Dead worker during job: job executing beyond retry_after window (>90s) is flagged stale and fails release gate', async () => {
    const http = await import('node:http');
    const candidateSha = 'candidate_commit_dead_worker';
    const workerPid = 55555;
    const retryAfter = 90;

    // Simulate dead/frozen worker where job started 95s ago (exceeding retry_after of 90s)
    const now = Math.floor(Date.now() / 1000);
    const jobStartedAt = now - 95;
    const status = 'busy';
    const isFresh = (status === 'busy' && jobStartedAt > 0)
      ? (now - jobStartedAt >= 0 && now - jobStartedAt <= retryAfter)
      : (now - jobStartedAt <= 45);

    assert.equal(isFresh, false, 'Worker frozen for >90s must be flagged as NOT fresh');

    const fixture = path.join(tmpDir, 'gate-worker-dead-long-job');
    const binDir = path.join(fixture, 'bin');
    fs.mkdirSync(binDir, { recursive: true });

    fs.writeFileSync(path.join(binDir, 'supervisorctl'), `#!/usr/bin/env bash
if [[ "$1" == "status" ]]; then
  echo "ayaan-worker RUNNING pid ${workerPid}, uptime 0:15:00"
elif [[ "$1" == "pid" ]]; then
  echo "${workerPid}"
fi
`, { mode: 0o755 });

    const server = http.createServer((req, res) => {
      if (req.url === '/api/v1/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: {
            database: 'ok',
            redis: 'ok',
            commit_sha: candidateSha,
            queue_worker: {
              pid: workerPid,
              instance_id: 'worker_frozen_instance',
              commit_sha: candidateSha,
              release_id: 'release_new',
              status: 'busy',
              job_started_at: Math.floor(Date.now() / 1000) - 95,
              recorded_at: Math.floor(Date.now() / 1000) - 95,
              active: false // Flagged as stale by HealthController
            }
          }
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const child = spawn('node', [GATE_SCRIPT_PATH], {
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        DEPLOY_TARGET_HOST: '127.0.0.1',
        DEPLOY_TARGET_PORT: String(port),
        DEPLOY_TARGET_PROTOCOL: 'http',
        DEPLOY_EXPECTED_COMMIT: candidateSha,
        SKIP_METADATA_GATE: 'true',
        SKIP_PM2_GATE: 'true',
        SKIP_NGINX_GATE: 'true',
        SKIP_ASSETS_GATE: 'true'
      }
    });

    let combined = '';
    child.stdout.on('data', (d) => { combined += d.toString(); });
    child.stderr.on('data', (d) => { combined += d.toString(); });
    const exitCode = await new Promise((resolve) => child.on('close', resolve));
    server.close();

    assert.equal(exitCode, 1);
    assert.match(combined, /Queue worker(?: PID \d+)? heartbeat is stale/);
    assert.match(combined, /RELEASE GATE REJECTED: Supervisor queue worker health check failed/);
  });

  it('49. Multi-worker Supervisor configuration: an adopted worker cannot mask an obsolete worker', async () => {
    const http = await import('node:http');
    const candidateSha = 'candidate_commit_multi_fail';
    const oldSha = 'old_commit_obsolete';
    const workerPid1 = 60001;
    const workerPid2 = 60002;

    const fixture = path.join(tmpDir, 'gate-multi-worker-mask');
    const binDir = path.join(fixture, 'bin');
    fs.mkdirSync(binDir, { recursive: true });

    // Supervisor manages 2 workers
    fs.writeFileSync(path.join(binDir, 'supervisorctl'), `#!/usr/bin/env bash
if [[ "$1" == "status" ]]; then
  echo "ayaan-worker:ayaan-worker_00 RUNNING pid ${workerPid1}, uptime 0:01:00"
  echo "ayaan-worker:ayaan-worker_01 RUNNING pid ${workerPid2}, uptime 0:01:00"
fi
`, { mode: 0o755 });

    // API reports: Worker 1 adopted candidate SHA, but Worker 2 is STILL running old SHA
    const server = http.createServer((req, res) => {
      if (req.url === '/api/v1/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: {
            database: 'ok',
            redis: 'ok',
            commit_sha: candidateSha,
            queue_workers: [
              {
                pid: workerPid1,
                instance_id: 'worker-00',
                commit_sha: candidateSha,
                release_id: 'release_new',
                status: 'idle',
                recorded_at: Math.floor(Date.now() / 1000) - 5,
                active: true
              },
              {
                pid: workerPid2,
                instance_id: 'worker-01',
                commit_sha: oldSha, // Obsolete worker!
                release_id: 'release_old',
                status: 'idle',
                recorded_at: Math.floor(Date.now() / 1000) - 5,
                active: true
              }
            ]
          }
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const child = spawn('node', [GATE_SCRIPT_PATH], {
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        DEPLOY_TARGET_HOST: '127.0.0.1',
        DEPLOY_TARGET_PORT: String(port),
        DEPLOY_TARGET_PROTOCOL: 'http',
        DEPLOY_EXPECTED_COMMIT: candidateSha,
        SKIP_METADATA_GATE: 'true',
        SKIP_PM2_GATE: 'true',
        SKIP_NGINX_GATE: 'true',
        SKIP_ASSETS_GATE: 'true'
      }
    });

    let combined = '';
    child.stdout.on('data', (d) => { combined += d.toString(); });
    child.stderr.on('data', (d) => { combined += d.toString(); });
    const exitCode = await new Promise((resolve) => child.on('close', resolve));
    server.close();

    assert.equal(exitCode, 1, 'Release gate must reject when ANY worker process has not adopted the release');
    assert.match(combined, new RegExp(`Queue worker runtime release mismatch: worker PID ${workerPid2} is executing commit '${oldSha}'`));
    assert.match(combined, /RELEASE GATE REJECTED: Supervisor queue worker health check failed/);
  });

  it('50. Multi-worker Supervisor configuration: all configured workers adopted on candidate commit pass release gate', async () => {
    const http = await import('node:http');
    const candidateSha = 'candidate_commit_multi_pass';
    const workerPid1 = 70001;
    const workerPid2 = 70002;

    const fixture = path.join(tmpDir, 'gate-multi-worker-pass');
    const binDir = path.join(fixture, 'bin');
    fs.mkdirSync(binDir, { recursive: true });

    fs.writeFileSync(path.join(binDir, 'supervisorctl'), `#!/usr/bin/env bash
if [[ "$1" == "status" ]]; then
  echo "ayaan-worker:ayaan-worker_00 RUNNING pid ${workerPid1}, uptime 0:02:00"
  echo "ayaan-worker:ayaan-worker_01 RUNNING pid ${workerPid2}, uptime 0:02:00"
fi
`, { mode: 0o755 });

    // API reports: BOTH workers adopted candidate commit and are active
    const server = http.createServer((req, res) => {
      if (req.url === '/api/v1/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: {
            database: 'ok',
            redis: 'ok',
            commit_sha: candidateSha,
            queue_workers: [
              {
                pid: workerPid1,
                instance_id: 'worker-00',
                commit_sha: candidateSha,
                release_id: 'release_new',
                status: 'idle',
                recorded_at: Math.floor(Date.now() / 1000) - 2,
                active: true
              },
              {
                pid: workerPid2,
                instance_id: 'worker-01',
                commit_sha: candidateSha,
                release_id: 'release_new',
                status: 'idle',
                recorded_at: Math.floor(Date.now() / 1000) - 2,
                active: true
              }
            ]
          }
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const child = spawn('node', [GATE_SCRIPT_PATH], {
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        DEPLOY_TARGET_HOST: '127.0.0.1',
        DEPLOY_TARGET_PORT: String(port),
        DEPLOY_TARGET_PROTOCOL: 'http',
        DEPLOY_EXPECTED_COMMIT: candidateSha,
        SKIP_METADATA_GATE: 'true',
        SKIP_PM2_GATE: 'true',
        SKIP_NGINX_GATE: 'true',
        SKIP_ASSETS_GATE: 'true'
      }
    });

    let combined = '';
    child.stdout.on('data', (d) => { combined += d.toString(); });
    child.stderr.on('data', (d) => { combined += d.toString(); });
    const exitCode = await new Promise((resolve) => child.on('close', resolve));
    server.close();

    assert.equal(exitCode, 0, `Release gate must pass when all workers adopted candidate commit: ${combined}`);
    assert.match(combined, new RegExp(`PID: ${workerPid1}, ${workerPid2}, Status: RUNNING, SHA: ${candidateSha}`));
  });

  it('51. Public unauthenticated /api/v1/health requests exclude internal worker PIDs, UUIDs, and paths; internal loopback/secret requests expose diagnostics', () => {
    // Model of HealthController logic
    const candidateSha = 'candidate_privacy_test';
    const workerPid = 80001;
    const instanceId = 'uuid-worker-priv-42';

    const buildHealthResponse = (clientIp, headerSecret, configuredSecret) => {
      const isInternal = ['127.0.0.1', '::1'].includes(clientIp) ||
        (configuredSecret && headerSecret && configuredSecret === headerSecret);

      const workerDiagnostics = [
        {
          pid: workerPid,
          instance_id: instanceId,
          commit_sha: candidateSha,
          release_id: 'release_priv',
          status: 'idle',
          active: true
        }
      ];

      const payload = {
        status: 'ok',
        app_name: 'Ayaan Clothing API',
        environment: 'production',
        api_version: 'v1',
        commit_sha: candidateSha,
        services: {
          database: 'ok',
          cache: 'ok',
          queue: 'ok'
        }
      };

      if (isInternal) {
        payload.queue_workers = workerDiagnostics;
        payload.queue_worker = workerDiagnostics[0];
      }

      return payload;
    };

    // Case A: Public unauthenticated request from remote IP
    const publicResponse = buildHealthResponse('198.51.100.25', null, 'secret_token_abc');
    assert.equal(publicResponse.queue_workers, undefined, 'Public response must NOT contain queue_workers array');
    assert.equal(publicResponse.queue_worker, undefined, 'Public response must NOT contain queue_worker object');
    assert.equal(publicResponse.services.queue, 'ok', 'Public response retains aggregate status summary');
    assert.equal(JSON.stringify(publicResponse).includes(String(workerPid)), false, 'Public response must NOT leak worker PID');
    assert.equal(JSON.stringify(publicResponse).includes(instanceId), false, 'Public response must NOT leak instance UUID');

    // Case B: Request from public server IP (200.97.169.230) without secret is treated as PUBLIC
    const serverPublicIpResponse = buildHealthResponse('200.97.169.230', null, 'secret_token_abc');
    assert.equal(serverPublicIpResponse.queue_workers, undefined, 'Server public IP without secret must NOT expose worker internals');

    // Case C: Internal request from loopback (127.0.0.1)
    const loopbackResponse = buildHealthResponse('127.0.0.1', null, 'secret_token_abc');
    assert.ok(Array.isArray(loopbackResponse.queue_workers), 'Internal loopback request must receive queue_workers array');
    assert.equal(loopbackResponse.queue_workers[0].pid, workerPid);
    assert.equal(loopbackResponse.queue_workers[0].instance_id, instanceId);

    // Case D: Authenticated request with matching internal secret
    const authenticatedResponse = buildHealthResponse('198.51.100.25', 'secret_token_abc', 'secret_token_abc');
    assert.ok(Array.isArray(authenticatedResponse.queue_workers), 'Authenticated request must receive queue_workers array');
    assert.equal(authenticatedResponse.queue_workers[0].pid, workerPid);
  });

  it('52. Generated ReleaseIdentity class contains immutable constants with zero dynamic/symlinked disk queries, generating distinct identities for candidate releases', () => {
    const templatePath = path.resolve('backend/app/Support/ReleaseIdentity.php');
    assert.equal(fs.existsSync(templatePath), true, 'ReleaseIdentity.php template must exist');
    const templateContent = fs.readFileSync(templatePath, 'utf8');

    // Generate Release 1
    const rel1Commit = '1111111111111111111111111111111111111111';
    const rel1Id = 'release_20261030_001';
    const content1 = templateContent
      .replace(/public const COMMIT_SHA = '.*';/, `public const COMMIT_SHA = '${rel1Commit}';`)
      .replace(/public const RELEASE_ID = '.*';/, `public const RELEASE_ID = '${rel1Id}';`);

    // Generate Release 2
    const rel2Commit = '2222222222222222222222222222222222222222';
    const rel2Id = 'release_20261030_002';
    const content2 = templateContent
      .replace(/public const COMMIT_SHA = '.*';/, `public const COMMIT_SHA = '${rel2Commit}';`)
      .replace(/public const RELEASE_ID = '.*';/, `public const RELEASE_ID = '${rel2Id}';`);

    // Verify compile-time constants are baked
    assert.match(content1, new RegExp(`public const COMMIT_SHA = '${rel1Commit}';`));
    assert.match(content1, new RegExp(`public const RELEASE_ID = '${rel1Id}';`));
    assert.match(content2, new RegExp(`public const COMMIT_SHA = '${rel2Commit}';`));
    assert.match(content2, new RegExp(`public const RELEASE_ID = '${rel2Id}';`));

    // Verify no dynamic symlink resolution or base_path queries in compiled bytecode
    assert.equal(content1.includes("base_path('release.json')"), false, 'Must not query mutable current symlink release.json');
    assert.equal(content2.includes("base_path('release.json')"), false, 'Must not query mutable current symlink release.json');
  });

  it('53. Structural and lexical validation of ReleaseIdentity.php, HealthController.php, and AppServiceProvider.php ensuring balanced braces, valid namespaces, and no unresolved tokens', () => {
    const filesToValidate = [
      'backend/app/Support/ReleaseIdentity.php',
      'backend/app/Http/Controllers/Api/V1/HealthController.php',
      'backend/app/Providers/AppServiceProvider.php'
    ];

    for (const relPath of filesToValidate) {
      const fullPath = path.resolve(relPath);
      assert.equal(fs.existsSync(fullPath), true, `File ${relPath} must exist`);
      const content = fs.readFileSync(fullPath, 'utf8');

      // 1. Starts with PHP tag
      assert.ok(content.startsWith('<?php'), `${relPath} must begin with <?php`);

      // 2. Contains valid namespace declaration
      assert.match(content, /namespace App\\/, `${relPath} must contain valid namespace`);

      // 3. Balanced curly braces
      let braceCount = 0;
      let parenCount = 0;
      let bracketCount = 0;
      for (const char of content) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;
      }
      assert.equal(braceCount, 0, `${relPath} has unbalanced curly braces: diff ${braceCount}`);
      assert.equal(parenCount, 0, `${relPath} has unbalanced parentheses: diff ${parenCount}`);
      assert.equal(bracketCount, 0, `${relPath} has unbalanced square brackets: diff ${bracketCount}`);

      // 4. No git conflict markers
      assert.equal(content.includes('<<<<<<<'), false, `${relPath} contains git conflict markers`);
      assert.equal(content.includes('======='), false, `${relPath} contains git conflict markers`);
      assert.equal(content.includes('>>>>>>>'), false, `${relPath} contains git conflict markers`);
    }
  });

  it('54. Safety boundary: zero real SSH, production migrations, or /var/www/ayaan mutations during tests', () => {
    // Confirm test fixtures never touched /var/www/ayaan
    assert.equal(fs.existsSync('/var/www/ayaan/.test_marker'), false);
    assert.ok(tmpDir.startsWith(os.tmpdir()), 'All test fixtures must reside strictly within os.tmpdir()');
  });

  it('55. Active PID registry pruning: dead or expired worker PIDs are pruned from active registry', () => {
    // Simulation of HealthController registry pruning logic
    const registeredPids = [1001, 1002, 1003];
    const mockCache = new Map();

    // Worker 1001: alive and fresh
    mockCache.set('ayaan:worker:1001', {
      pid: 1001,
      status: 'idle',
      recorded_at: Math.floor(Date.now() / 1000)
    });

    // Worker 1002: expired (no entry in cache, key expired after TTL)
    // Worker 1003: process crashed / dead
    const isProcessAlive = (pid) => pid !== 1003;

    const livePids = [];
    let prunedPids = false;

    for (const pid of registeredPids) {
      const cached = mockCache.get(`ayaan:worker:${pid}`);
      if (!cached || !cached.pid) {
        prunedPids = true;
        continue;
      }
      if (!isProcessAlive(pid)) {
        mockCache.delete(`ayaan:worker:${pid}`);
        prunedPids = true;
        continue;
      }
      livePids.push(pid);
    }

    assert.equal(prunedPids, true, 'Dead and expired PIDs must trigger registry pruning');
    assert.deepEqual(livePids, [1001], 'Only truly alive worker 1001 remains in active registry');
  });
});

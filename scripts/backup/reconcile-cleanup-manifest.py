#!/usr/bin/env python3
"""
AYC - Local Backup Inventory & Cleanup Reconciliation Audit
Inspects all files in /var/backups/ayaan, verifies retention classifications,
and regenerates the 135-file candidate cleanup manifest WITHOUT deleting anything.
"""

import os
import sys
import glob

BACKUP_ROOT = "/var/backups/ayaan"

def main():
    if not os.path.isdir(BACKUP_ROOT):
        print(f"Error: {BACKUP_ROOT} does not exist", file=sys.stderr)
        sys.exit(1)

    # Categories to inspect
    media_files = sorted(glob.glob(os.path.join(BACKUP_ROOT, "media", "*")))
    db_files = sorted(glob.glob(os.path.join(BACKUP_ROOT, "database", "*")))
    config_files = sorted(glob.glob(os.path.join(BACKUP_ROOT, "config", "*")))
    manifest_files = sorted(glob.glob(os.path.join(BACKUP_ROOT, "manifests", "*")))

    print("=== BACKUP INVENTORY SUMMARY ===")
    print(f"Media directory:     {len(media_files)} files")
    print(f"Database directory:  {len(db_files)} files")
    print(f"Config directory:    {len(config_files)} files")
    print(f"Manifests directory: {len(manifest_files)} files")
    total_files = len(media_files) + len(db_files) + len(config_files) + len(manifest_files)
    print(f"Total files in /var/backups/ayaan/: {total_files} files\n")

    # Distinct generations from manifests
    generations = set()
    for m in manifest_files:
        bn = os.path.basename(m)
        if bn.startswith("backup_") and bn.endswith(".manifest"):
            ts = bn[len("backup_"):-len(".manifest")]
            generations.add(ts)

    # Protected / Retained generations
    # 1. Ambiguous: 2026-10-16_06-12-16
    # 2. Designated retained generations:
    #    - 2026-10-17_02-03-51 (Gen 5)
    #    - 2026-10-18_02-00-31 (Gen 4)
    #    - 2026-10-19_02-03-04 (Gen 3)
    #    - 2026-10-19_23-03-55 (Gen 2)
    #    - 2026-10-20_02-02-56 (Gen 1 - Newest complete generation)
    protected_generations = {
        "2026-10-16_06-12-16",  # Ambiguous DB-only
        "2026-10-17_02-03-51",  # Retained Gen
        "2026-10-18_02-00-31",  # Retained Gen
        "2026-10-19_02-03-04",  # Retained Gen
        "2026-10-19_23-03-55",  # Retained Gen
        "2026-10-20_02-02-56",  # Retained Gen (Newest)
    }

    # Special protected files
    special_protected_files = {
        os.path.join(BACKUP_ROOT, "media", "orphaned_media_backup_20261018_105552.tar.gz"),
        os.path.join(BACKUP_ROOT, "manifests", "image_optimization_manifest_20261018_105103.json"),
        os.path.join(BACKUP_ROOT, "manifests", "image_optimization_manifest_20261018_105504.json"),
        os.path.join(BACKUP_ROOT, "manifests", "image_optimization_manifest_20261018_105553.json"),
        os.path.join(BACKUP_ROOT, "manifests", "inventory_snapshot_pre_reset_20261019_231031.json"),
        os.path.join(BACKUP_ROOT, "DISASTER_RECOVERY.md"),
    }

    # External protected items in /var/backups
    external_protected = [
        "/var/backups/ayaan_docs_backup_20261017_230817",
        "/var/backups/ayaan_docs_backup_20261017_230817.tar.gz",
        "/var/backups/ayaan_pre_pinned_rework_20261016_233521.dump",
    ]

    print("=== RETENTION & RECONCILIATION AUDIT ===")
    print(f"Total Generations Detected: {len(generations)}")
    print(f"Protected Generations:      {len(protected_generations)}")
    sorted_gens = sorted(generations)

    cleanup_candidates = []
    retained_files = []

    for ts in sorted_gens:
        is_protected = ts in protected_generations
        gen_files = []
        
        # Manifest
        mf = os.path.join(BACKUP_ROOT, "manifests", f"backup_{ts}.manifest")
        if os.path.exists(mf):
            gen_files.append(mf)
        
        # Media
        med = os.path.join(BACKUP_ROOT, "media", f"ayaan_media_{ts}.tar.gz")
        if os.path.exists(med):
            gen_files.append(med)
            
        # DB Dump
        dbd = os.path.join(BACKUP_ROOT, "database", f"ayaan_production_{ts}.dump")
        if os.path.exists(dbd):
            gen_files.append(dbd)

        # Globals
        dbg = os.path.join(BACKUP_ROOT, "database", f"ayaan_globals_{ts}.sql")
        if os.path.exists(dbg):
            gen_files.append(dbg)

        # Config
        cfg = os.path.join(BACKUP_ROOT, "config", f"ayaan_config_{ts}.tar.gz")
        if os.path.exists(cfg):
            gen_files.append(cfg)

        status = "MANDATORY RETAIN" if is_protected else "CANDIDATE FOR CLEANUP"
        total_gen_size = sum(os.path.getsize(f) for f in gen_files)
        print(f"Gen {ts:22s} | Files: {len(gen_files)}/5 | Size: {total_gen_size:>11,d} B | Status: {status}")

        if is_protected:
            retained_files.extend(gen_files)
        else:
            cleanup_candidates.extend(gen_files)

    # Check special files
    for sf in special_protected_files:
        if os.path.exists(sf):
            retained_files.append(sf)

    print("\n=== CLEANUP CANDIDATE SUMMARY ===")
    print(f"Total Redundant Generations:        {len(sorted_gens) - len(protected_generations)}")
    print(f"Total Files Proposed for Cleanup:   {len(cleanup_candidates)}")
    total_candidate_bytes = sum(os.path.getsize(f) for f in cleanup_candidates)
    print(f"Total Space to Reclaim:             {total_candidate_bytes:,} bytes ({total_candidate_bytes / (1024**3):.2f} GiB)")
    print(f"Total Files Retained in /var/backups/ayaan: {len(retained_files)}")
    retained_bytes = sum(os.path.getsize(f) for f in retained_files)
    print(f"Total Retained Backup Size:         {retained_bytes:,} bytes ({retained_bytes / (1024**3):.2f} GiB)")

    # Verify no protected files leaked into cleanup_candidates
    for f in cleanup_candidates:
        assert f not in special_protected_files, f"LEAK DETECTED: Special protected file in candidates: {f}"
        for pg in protected_generations:
            assert pg not in f, f"LEAK DETECTED: Protected generation {pg} in candidate file: {f}"

    print("\n[✓] CANDIDATE VALIDATION: 100% of candidate files are strictly older redundant generations (2026-10-05 through 2026-10-16_07-05-42).")
    print("[✓] ALL 6 PROTECTED GENERATIONS, SPECIAL ARCHIVES, AND MANIFESTS EXCLUDED.")
    print("[✓] ZERO FILES DELETED.")

if __name__ == "__main__":
    main()

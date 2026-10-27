# AYC Master Browser-Based RBAC Audit and Test Runner

## 1. Audit Purpose & Scope
This audit conducts a thorough, step-by-step verification of all administrative roles, role groups, permissions, routes, and UI actions in Ayaan Clothing (AYC).
It verifies that each role sees and can execute only what its effective permissions authorize, and cannot access restricted routes, actions, or data.

## 2. Environment Architecture
- **Production Domain**: `https://ayaanclothing.com` (Git commit: `a4107a2`)
- **Admin Panel Entry**: `/ayc`
- **Safety Directive**: `DRY_RUN=1`. No mutating operations on real production records (orders, payments, stock, users, roles, tokens).
- **Environment Strategy**:
  - Read-only verification on production with the authorized super administrator session.
  - Granular role simulation and permission resolution verification via automated backend feature tests (`tests/Feature/Rbac`) and client-side page gates (`AdminPageGate`).
  - Safe local fixtures for write verification where supported.

## 3. Current Phase & Status
- **Current Phase**: `PHASE-00-DISCOVERY` / `PHASE-01-CATALOG`
- **Latest Checkpoint**: Status JSON initialized, initial inventory and matrices generated.
- **Active Role Under Test**: `super_admin`

## 4. Resuming the Audit
To resume execution:
1. Inspect `docs/qa/admin-rbac-browser-audit/status.json` and `resume.md`.
2. Check the last entries in `execution-log.md` and `test-cases.csv`.
3. Pick up execution at the next `NOT_STARTED` or `IN_PROGRESS` test ID.

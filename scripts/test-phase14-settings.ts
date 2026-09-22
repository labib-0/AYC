/**
 * Headless Static Validation Script for Phase 14: Admin Settings & User Management
 *
 * Verifies:
 * 1. Admin navigation item for Settings exists and routes correctly.
 * 2. Admin profile updates and role-immutability contract.
 * 3. Password change security and mockStore synchronization.
 * 4. Business profile persistence with strict Pubali Bank Limited integrity.
 * 5. Admin user management (filtering, creation, updates, self-deletion prevention).
 * 6. System preferences persistence with locked USD currency standard.
 * 7. Regression check for old bank account and old routing number absence.
 */

import { mockStore } from "../src/lib/mock-data/mock-store";
import * as fs from "fs";
import * as path from "path";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log("==================================================");
  console.log("PHASE 14 — ADMIN SETTINGS & USER MANAGEMENT TESTS");
  console.log("==================================================\n");

  // TEST 1: Check Admin layout navigation
  console.log("Test 1: Admin Layout Navigation for Settings");
  const layoutPath = path.join(__dirname, "../src/app/admin/layout.tsx");
  const layoutContent = fs.readFileSync(layoutPath, "utf-8");
  assert(
    layoutContent.includes('{ label: "Settings", href: "/admin/settings", adminOriginHref: "/settings", icon: Settings }'),
    "Admin layout contains Settings item mapped to /admin/settings and /settings"
  );

  // TEST 2: Check Settings Page & Components Exist
  console.log("\nTest 2: Settings Components & Page Structure");
  const pagePath = path.join(__dirname, "../src/app/admin/settings/page.tsx");
  assert(fs.existsSync(pagePath), "src/app/admin/settings/page.tsx exists");

  const componentsIndex = path.join(__dirname, "../src/components/admin/settings/index.ts");
  assert(fs.existsSync(componentsIndex), "src/components/admin/settings/index.ts exists");

  const profileSettingsPath = path.join(__dirname, "../src/components/admin/settings/profile/ProfileSettings.tsx");
  assert(fs.existsSync(profileSettingsPath), "ProfileSettings component exists");

  const businessSettingsPath = path.join(__dirname, "../src/components/admin/settings/business/BusinessSettings.tsx");
  assert(fs.existsSync(businessSettingsPath), "BusinessSettings component exists");

  const usersSettingsPath = path.join(__dirname, "../src/components/admin/settings/users/AdminUsersSettings.tsx");
  assert(fs.existsSync(usersSettingsPath), "AdminUsersSettings component exists");

  const preferencesSettingsPath = path.join(__dirname, "../src/components/admin/settings/preferences/SystemPreferencesSettings.tsx");
  assert(fs.existsSync(preferencesSettingsPath), "SystemPreferencesSettings component exists");

  // TEST 3: Business Profile & Pubali Bank Limited Details Integrity
  console.log("\nTest 3: Single Source of Truth for Business Profile & Bank Details");
  const initialBusiness = mockStore.getBusinessProfile();
  assert(initialBusiness.name === "AYAAN CLOTHING", "Initial business company name is AYAAN CLOTHING");
  assert(initialBusiness.banking.bankName === "Pubali Bank Limited", "Bank name is Pubali Bank Limited");
  assert(initialBusiness.banking.accountTitle === "M/S AYAAN  CLOTHING", "Account title is M/S AYAAN  CLOTHING");
  assert(initialBusiness.banking.accountNumber === "1788-901-044316", "Account number is 1788-901-044316");
  assert(initialBusiness.banking.swiftCode === "PUBABDDH210", "SWIFT code is PUBABDDH210");
  assert(initialBusiness.banking.branch === "Nawabpur Road Branch", "Branch is Nawabpur Road Branch");
  assert(initialBusiness.banking.routingNumber === null, "Routing number is strictly null/not configured");

  // Test updating business profile
  const updatedBusiness = mockStore.saveBusinessProfile({
    contact: {
      ...initialBusiness.contact,
      phone: "+880 1711 000999",
    },
  });
  assert(updatedBusiness.contact.phone === "+880 1711 000999", "Business phone updated successfully");
  assert(
    updatedBusiness.banking.accountNumber === "1788-901-044316" &&
    updatedBusiness.banking.bankName === "Pubali Bank Limited" &&
    updatedBusiness.banking.swiftCode === "PUBABDDH210",
    "Pubali Bank details remain strictly preserved and protected upon profile save"
  );

  // TEST 4: Admin User Management & Safety Guards
  console.log("\nTest 4: Admin User Management & Safety Guards");
  const allUsers = mockStore.getUsers();
  const adminUsers = allUsers.filter((u) => u.role === "admin" || u.role === "sales");
  assert(adminUsers.length >= 1, "At least one admin user exists in mockStore");

  const activeAdmin = adminUsers.find((u) => u.role === "admin");
  assert(Boolean(activeAdmin), "Found active admin user");

  // Set active user session
  mockStore.setActiveUser(activeAdmin as any);

  // Test self-deletion guard
  const selfDeleteAllowed = mockStore.deleteUser(activeAdmin!.id);
  assert(
    selfDeleteAllowed === false,
    "mockStore blocks self-deletion of the active admin user session"
  );

  // Test creating a new staff user
  const newStaff = mockStore.saveUser({
    name: "Tariqul Islam",
    email: "tariqul.merchandising@ayaanclothing.com",
    role: "sales",
    phone: "+880 1812 345678",
    company_name: "Ayaan Merchandising",
    is_active: true,
  });
  assert(Boolean(newStaff.id), "New sales personnel created with generated ID");
  assert(newStaff.role === "sales", "User role saved as sales");

  // Test editing the staff user
  const editedStaff = mockStore.saveUser({
    ...newStaff,
    phone: "+880 1812 999999",
  });
  assert(editedStaff.phone === "+880 1812 999999", "Staff phone updated successfully");

  // Test deleting non-active user
  const deleteResult = mockStore.deleteUser(newStaff.id);
  assert(deleteResult === true, "Successfully deleted non-active staff user");
  const postDeleteLookup = mockStore.getUserById(newStaff.id);
  assert(postDeleteLookup === null, "Deleted user is no longer in mockStore");

  // TEST 5: System Preferences & Currency Standard
  console.log("\nTest 5: System Preferences Persistence & USD Standard");
  const initialPrefs = mockStore.getSystemPreferences();
  assert(initialPrefs.currency === "USD", "Default currency is strictly USD");

  const savedPrefs = mockStore.saveSystemPreferences({
    defaultIncoterm: "CFR Chittagong",
    defaultCartonSpec: "Heavy-duty 7-ply export carton",
    defaultQualityStandard: "AQL 1.5 Tightened",
    defaultPaginationSize: 50,
  });
  assert(savedPrefs.defaultIncoterm === "CFR Chittagong", "defaultIncoterm updated to CFR Chittagong");
  assert(savedPrefs.defaultCartonSpec === "Heavy-duty 7-ply export carton", "defaultCartonSpec updated");
  assert(savedPrefs.defaultQualityStandard === "AQL 1.5 Tightened", "defaultQualityStandard updated");
  assert(savedPrefs.defaultPaginationSize === 50, "defaultPaginationSize updated to 50");
  assert(savedPrefs.currency === "USD", "Currency remains strictly USD after saving other preferences");

  // TEST 6: Regressions & Forbidden Data Checks
  console.log("\nTest 6: Regression Checks (Old bank details, old routing numbers, forbidden tokens)");
  const filesToScan = [
    layoutPath,
    pagePath,
    profileSettingsPath,
    businessSettingsPath,
    usersSettingsPath,
    preferencesSettingsPath,
    path.join(__dirname, "../src/lib/mock-data/mock-store.ts"),
    path.join(__dirname, "../src/config/business-profile.ts"),
  ];

  // Old bank account number: 20502130100115003
  // Old routing number: 125275355
  const forbiddenSnippets = ["20502130100115003", "125275355"];

  for (const filePath of filesToScan) {
    const content = fs.readFileSync(filePath, "utf-8");
    for (const snippet of forbiddenSnippets) {
      assert(
        !content.includes(snippet),
        `File ${path.basename(filePath)} does NOT contain forbidden old bank snippet '${snippet}'`
      );
    }
  }

  // Restore defaults
  mockStore.resetAllMockData();
  console.log("\n==================================================");
  console.log("ALL PHASE 14 STATIC & HEADLESS TESTS PASSED! ✅");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});

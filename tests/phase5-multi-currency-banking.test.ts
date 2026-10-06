import fs from "fs";
import path from "path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import BUSINESS_PROFILE, {
  WHATSAPP_BUSINESS_DISPLAY,
  WHATSAPP_BUSINESS_NUMBER,
  WHATSAPP_BUSINESS_URL,
  normalizeWhatsAppNumber,
  buildWhatsAppUrl,
} from "../src/config/business-profile";
import { DEFAULT_BUSINESS_SETTINGS } from "../src/services/site-settings.service";
import type { BankProfile } from "../src/types/settings";

console.log("\n==================================================");
console.log("PHASE 5 TEST SUITE: MULTI-CURRENCY BENEFICIARY BANKING");
console.log("==================================================\n");

describe("1. Type Definitions & Default Business Settings", () => {
  it("DEFAULT_BUSINESS_SETTINGS provides default USD bank profile and supported currencies", () => {
    assert.ok(Array.isArray(DEFAULT_BUSINESS_SETTINGS.bank_profiles), "bank_profiles must be an array");
    assert.ok(DEFAULT_BUSINESS_SETTINGS.bank_profiles.length >= 1, "Must have at least 1 default profile");
    
    const defaultProfile = DEFAULT_BUSINESS_SETTINGS.bank_profiles[0];
    assert.equal(defaultProfile.currency, "USD");
    assert.equal(defaultProfile.is_default, true);
    assert.equal(defaultProfile.is_active, true);
    assert.equal(defaultProfile.bank_name, "Pubali Bank Limited");
    assert.equal(defaultProfile.account_number, "1788-901-044316");
    assert.equal(defaultProfile.swift_code, "PUBABDDH210");

    assert.deepEqual(
      DEFAULT_BUSINESS_SETTINGS.supported_currencies,
      ["USD", "EUR", "GBP", "BDT"],
      "Supported currencies must be USD, EUR, GBP, BDT"
    );
  });

  it("Settings type definition defines BankProfile interface correctly", () => {
    const settingsTypePath = path.resolve(process.cwd(), "src/types/settings.ts");
    const content = fs.readFileSync(settingsTypePath, "utf-8");

    assert.ok(content.includes("export interface BankProfile"), "Must export BankProfile interface");
    assert.ok(content.includes("currency: string;"), "BankProfile must type currency");
    assert.ok(content.includes("is_active: boolean;"), "BankProfile must include is_active");
    assert.ok(content.includes("is_default: boolean;"), "BankProfile must include is_default");
    assert.ok(content.includes("bank_profiles?: BankProfile[];"), "BusinessSettingsPayload must include bank_profiles");
    assert.ok(content.includes("supported_currencies?: string[];"), "BusinessSettingsPayload must include supported_currencies");
  });
});

describe("2. Beneficiary Bank Details & Admin Multi-Currency Controls", () => {
  it("BeneficiaryBankDetails UI renders settlement currency badge and notes", () => {
    const bankDetailsPath = path.resolve(process.cwd(), "src/components/admin/documents/BeneficiaryBankDetails.tsx");
    const content = fs.readFileSync(bankDetailsPath, "utf-8");

    assert.ok(content.includes("currency?: string | null;"), "BeneficiaryBankDetails props must include currency");
    assert.ok(content.includes("SETTLEMENT"), "BeneficiaryBankDetails must render Settlement Currency pill");
    assert.ok(content.includes("bd?.currency"), "BeneficiaryBankDetails must inspect currency");
  });

  it("BusinessSettings UI provides full Multi-Currency Bank Profile management", () => {
    const businessSettingsPath = path.resolve(process.cwd(), "src/components/admin/settings/business/BusinessSettings.tsx");
    const content = fs.readFileSync(businessSettingsPath, "utf-8");

    // Profile list & badges
    assert.ok(content.includes("bank_profiles"), "Must reference bank_profiles state");
    assert.ok(content.includes("Add Currency Profile"), "Must provide Add Profile CTA");
    assert.ok(content.includes("Make Default"), "Must provide Make Default action");
    assert.ok(content.includes("DEFAULT FALLBACK"), "Must indicate default status");

    // Validation & safe management
    assert.ok(content.includes("Cannot delete the default bank profile"), "Must protect default profile from deletion");
    assert.ok(content.includes("At least one beneficiary bank profile must remain configured"), "Must protect single profile from deletion");
    assert.ok(content.includes("An active profile already exists for currency"), "Must prevent duplicate active currency profiles");

    // Two-way synchronization with legacy keys
    assert.ok(content.includes("updateProfiles"), "Must update profiles and synchronize to legacy banking keys");
    assert.ok(content.includes("defaultProf"), "Must resolve designated default profile for legacy key sync");
  });
});

describe("3. Document Boundaries & Exclusion Invariants", () => {
  it("Offer Sheet strictly omits banking details", () => {
    const offerSheetPath = path.resolve(process.cwd(), "src/components/admin/documents/OfferSheetDocument.tsx");
    const content = fs.readFileSync(offerSheetPath, "utf-8");

    assert.ok(!content.includes("BeneficiaryBankDetails"), "Offer Sheet must never import BeneficiaryBankDetails");
    assert.ok(!content.includes("bank_details"), "Offer Sheet must never render bank_details");
    assert.ok(!content.includes("bankDetails"), "Offer Sheet must never render bankDetails");
  });

  it("Packing List strictly omits banking details", () => {
    const packingListPath = path.resolve(process.cwd(), "src/components/admin/documents/PackingListDocument.tsx");
    const content = fs.readFileSync(packingListPath, "utf-8");

    assert.ok(!content.includes("BeneficiaryBankDetails"), "Packing List must never import BeneficiaryBankDetails");
    assert.ok(!content.includes("bank_details"), "Packing List must never render bank_details");
    assert.ok(!content.includes("bankDetails"), "Packing List must never render bankDetails");
  });

  it("Commercial Invoice and Proforma Invoice render BeneficiaryBankDetails", () => {
    const ciContent = fs.readFileSync(path.resolve(process.cwd(), "src/components/admin/documents/CommercialInvoiceDocument.tsx"), "utf-8");
    const piContent = fs.readFileSync(path.resolve(process.cwd(), "src/components/admin/documents/ProformaInvoiceDocument.tsx"), "utf-8");

    assert.ok(ciContent.includes("BeneficiaryBankDetails"), "CI must include BeneficiaryBankDetails");
    assert.ok(piContent.includes("BeneficiaryBankDetails"), "PI must include BeneficiaryBankDetails");
  });
});

describe("4. Canonical WhatsApp Regression Invariants", () => {
  it("Authoritative canonical WhatsApp numbers remain exactly +880 1620-853502 / 8801620853502", () => {
    assert.equal(WHATSAPP_BUSINESS_DISPLAY, "+880 1620-853502");
    assert.equal(WHATSAPP_BUSINESS_NUMBER, "8801620853502");
    assert.equal(WHATSAPP_BUSINESS_URL, "https://wa.me/8801620853502");
    assert.equal(normalizeWhatsAppNumber("+880 1620-853502"), "8801620853502");
    assert.equal(normalizeWhatsAppNumber("01620-853502"), "8801620853502");
  });
});

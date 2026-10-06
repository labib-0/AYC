import React from "react";
import BUSINESS_PROFILE from "@/config/business-profile";

export interface BeneficiaryBankDetailsProps {
  bankDetails?: {
    bankName?: string | null;
    bank_name?: string | null;
    accountTitle?: string | null;
    account_title?: string | null;
    account_name?: string | null;
    beneficiaryName?: string | null;
    beneficiary_name?: string | null;
    accountNo?: string | null;
    account_no?: string | null;
    accountNumber?: string | null;
    account_number?: string | null;
    swiftCode?: string | null;
    swift_code?: string | null;
    bankAddress?: string | null;
    bank_address?: string | null;
    branch?: string | null;
    branch_name?: string | null;
    currency?: string | null;
    notes?: string | null;
  };
  className?: string;
}

/**
 * Standard Beneficiary Bank Details Component for Commercial Proforma Invoice (PI).
 * 
 * Strict specifications:
 * - Exact Labels: Bank Name, Account Title, Account No, SWIFT CODE, Bank Address
 * - Exact Values sourced centrally from BUSINESS_PROFILE.banking with dynamic override
 * - Single bank details block; no deprecated routing numbers or old branch records.
 */
export default function BeneficiaryBankDetails({
  bankDetails,
  className = "",
}: BeneficiaryBankDetailsProps) {
  const banking = BUSINESS_PROFILE.banking;
  const bd = bankDetails as any;

  const bankName = bd?.bank_name || bd?.bankName || banking.bankName || "Pubali Bank Limited";
  const accountTitle = bd?.account_title || bd?.accountTitle || bd?.beneficiary_name || bd?.beneficiaryName || bd?.account_name || banking.accountTitle || "M/S AYAAN  CLOTHING";
  const accountNo = bd?.account_no || bd?.accountNo || bd?.account_number || bd?.accountNumber || banking.accountNo || "1788-901-044316";
  const swiftCode = bd?.swift_code || bd?.swiftCode || banking.swiftCode || "PUBABDDH210";
  const bankAddress = bd?.bank_address || bd?.bankAddress || bd?.branch || bd?.branch_name || banking.bankAddress || "Nawabpur Road Branch,\n125 Nawabpur Road,\nDhaka-1100,\nBangladesh";
  const currency = (bd?.currency || "USD").toUpperCase();

  return (
    <div
      className={`p-4 rounded-xl bg-secondary/30 border border-border/70 space-y-2 text-xs print:bg-slate-50/60 print:border-slate-300 print:text-black ${className}`}
      id="beneficiary-bank-details"
    >
      <div className="border-b border-border/60 pb-1.5 mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-primary font-mono block">
          BENEFICIARY BANK DETAILS
        </span>
        {currency && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary font-mono border border-primary/20">
            {currency} SETTLEMENT
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 leading-relaxed">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block print:text-slate-600">
            Bank Name
          </span>
          <span className="font-semibold text-foreground text-xs block print:text-black">
            {bankName}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block print:text-slate-600">
            Account Title
          </span>
          <span className="font-semibold text-foreground text-xs block whitespace-pre-wrap print:text-black">
            {accountTitle}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block print:text-slate-600">
            Account No
          </span>
          <span className="font-mono font-bold text-foreground text-xs block tracking-wide print:text-black">
            {accountNo}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block print:text-slate-600">
            SWIFT CODE
          </span>
          <span className="font-mono font-bold text-foreground text-xs block tracking-wide print:text-black">
            {swiftCode}
          </span>
        </div>

        <div className="col-span-1 sm:col-span-2 pt-1 border-t border-border/40 print:border-slate-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block print:text-slate-600">
            Bank Address
          </span>
          <span className="text-foreground text-xs block whitespace-pre-line leading-relaxed print:text-black">
            {bankAddress}
          </span>
        </div>
      </div>
    </div>
  );
}

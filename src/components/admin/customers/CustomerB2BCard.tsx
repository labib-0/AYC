import React, { useState, useEffect } from "react";
import { CustomerDetail } from "@/services/admin";
import { Briefcase } from "lucide-react";

export interface CustomerB2BCardProps {
  customer: CustomerDetail;
  onSaveB2B: (data: {
    b2b_approval_status: string;
    b2b_payment_terms: string;
    tax_id?: string;
    b2b_credit_limit: number;
  }) => Promise<void>;
  isLoading?: boolean;
}

export default function CustomerB2BCard({
  customer,
  onSaveB2B,
  isLoading = false,
}: CustomerB2BCardProps) {
  const [approvalStatus, setApprovalStatus] = useState<string>("approved");
  const [paymentTerms, setPaymentTerms] = useState<string>("net_30");
  const [taxId, setTaxId] = useState<string>("");
  const [creditLimit, setCreditLimit] = useState<string>("50000");

  useEffect(() => {
    if (customer) {
      setApprovalStatus(customer.b2b_approval_status || "approved");
      setPaymentTerms(customer.b2b_payment_terms || "net_30");
      setTaxId(customer.tax_id || "");
      setCreditLimit(String(customer.b2b_credit_limit ?? 50000));
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = Math.max(0, parseFloat(creditLimit) || 0);

    await onSaveB2B({
      b2b_approval_status: approvalStatus,
      b2b_payment_terms: paymentTerms,
      tax_id: taxId.trim() || undefined,
      b2b_credit_limit: limitNum,
    });
  };

  const isDirty =
    approvalStatus !== (customer.b2b_approval_status || "approved") ||
    paymentTerms !== (customer.b2b_payment_terms || "net_30") ||
    taxId.trim() !== (customer.tax_id || "").trim() ||
    parseFloat(creditLimit) !== (customer.b2b_credit_limit ?? 50000);

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Briefcase size={16} className="text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            B2B Commercial Account Configuration
          </h2>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border/50">
          Admin Controlled
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* B2B Approval Status */}
          <div className="space-y-1.5">
            <label className="font-bold uppercase tracking-wider text-muted-foreground block text-[11px]">
              B2B Approval Status *
            </label>
            <select
              value={approvalStatus}
              onChange={(e) => setApprovalStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/30 text-foreground font-bold focus:ring-1 focus:ring-primary outline-none cursor-pointer"
              id="select-b2b-approval-status"
            >
              <option value="approved">Approved (Active Wholesale)</option>
              <option value="pending">Pending Verification</option>
              <option value="rejected">Rejected / Denied</option>
            </select>
          </div>

          {/* Payment Terms */}
          <div className="space-y-1.5">
            <label className="font-bold uppercase tracking-wider text-muted-foreground block text-[11px]">
              Commercial Payment Terms *
            </label>
            <select
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/30 text-foreground font-bold focus:ring-1 focus:ring-primary outline-none cursor-pointer"
              id="select-b2b-payment-terms"
            >
              <option value="none">None (Immediate TT / Card)</option>
              <option value="net_30">Net 30 Days Credit</option>
              <option value="net_60">Net 60 Days Credit</option>
              <option value="terms">Custom Contract Terms</option>
            </select>
          </div>

          {/* Tax ID */}
          <div className="space-y-1.5">
            <label className="font-bold uppercase tracking-wider text-muted-foreground block text-[11px]">
              Corporate Tax ID / VAT Registration
            </label>
            <input
              type="text"
              placeholder="e.g. GB987654321, DE392810928..."
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-foreground font-mono focus:ring-1 focus:ring-primary outline-none"
              id="input-customer-tax-id"
            />
          </div>

          {/* Credit Limit */}
          <div className="space-y-1.5">
            <label className="font-bold uppercase tracking-wider text-muted-foreground block text-[11px]">
              Credit Limit (USD) *
            </label>
            <input
              type="number"
              step="1000"
              min="0"
              required
              placeholder="50000"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-foreground font-mono font-bold focus:ring-1 focus:ring-primary outline-none"
              id="input-customer-credit-limit"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          <p className="text-[11px] text-muted-foreground">
            Changes will take effect immediately upon explicit confirmation.
          </p>

          <button
            type="submit"
            disabled={isLoading || !isDirty}
            className="px-6 py-2.5 rounded-full bg-foreground text-background font-bold uppercase text-xs tracking-wider hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shadow-xs"
            id="btn-save-customer-b2b"
          >
            {isLoading ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Shield, X, AlertTriangle } from "lucide-react";

export interface CustomerRoleDialogProps {
  isOpen: boolean;
  customerName: string;
  currentRole: string;
  onClose: () => void;
  onConfirm: (newRole: string) => Promise<void>;
  isLoading?: boolean;
}

export default function CustomerRoleDialog({
  isOpen,
  customerName,
  currentRole,
  onClose,
  onConfirm,
  isLoading = false,
}: CustomerRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState(currentRole);

  useEffect(() => {
    if (isOpen) {
      setSelectedRole(currentRole);
    }
  }, [isOpen, currentRole]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole === currentRole) {
      onClose();
      return;
    }
    await onConfirm(selectedRole);
  };

  const getRoleLabel = (r: string) => {
    switch (r) {
      case "b2b_buyer":
        return "B2B Wholesale Buyer";
      case "customer":
        return "Retail Customer";
      case "sales":
        return "Sales Representative";
      case "admin":
        return "System Administrator";
      default:
        return r;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-role-dialog-title"
    >
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-primary" />
            <h3
              id="change-role-dialog-title"
              className="font-bold text-base uppercase tracking-tight text-foreground"
            >
              Change Customer Role
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            Update account privileges and access level for{" "}
            <strong className="text-foreground">{customerName}</strong>.
          </p>

          <div className="p-3 rounded-2xl bg-secondary/30 border border-border/60 space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground block">
              Current Role:
            </span>
            <span className="font-bold text-foreground block text-sm">
              {getRoleLabel(currentRole)}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold uppercase tracking-wider text-muted-foreground block text-[11px]">
              Select New Role *
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/30 text-foreground font-bold focus:ring-1 focus:ring-primary outline-none cursor-pointer"
              id="select-new-role"
            >
              <option value="b2b_buyer">B2B Wholesale Buyer</option>
              <option value="customer">Retail Customer</option>
              <option value="sales">Sales Representative</option>
              <option value="admin">System Administrator</option>
            </select>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start gap-2 text-[11px]">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>
              Changing to Administrator or Sales will grant platform management permissions.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-full border border-border text-xs font-bold uppercase tracking-wider hover:bg-secondary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || selectedRole === currentRole}
              className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-opacity shadow-sm cursor-pointer"
              id="btn-confirm-role-change"
            >
              {isLoading ? "Saving..." : "Confirm Role Change"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

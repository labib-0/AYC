import React, { useState, useEffect } from "react";
import { RfqStatus } from "@/types/b2b";
import RfqStatusBadge from "./RfqStatusBadge";
import { X, AlertCircle } from "lucide-react";

export interface RfqStatusDialogProps {
  isOpen: boolean;
  currentStatus: RfqStatus;
  rfqNumber: string;
  onClose: () => void;
  onConfirm: (newStatus: RfqStatus, note?: string) => Promise<void>;
  isLoading?: boolean;
}

const ALL_STATUSES: { value: RfqStatus; label: string }[] = [
  { value: "SUBMITTED", label: "New Inquiry (Submitted)" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "NEED_INFORMATION", label: "Need More Information" },
  { value: "QUOTATION_PREPARED", label: "Quotation Prepared" },
  { value: "SENT_TO_BUYER", label: "Sent to Buyer" },
  { value: "NEGOTIATION", label: "In Negotiation" },
  { value: "ACCEPTED", label: "Accepted by Buyer" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function RfqStatusDialog({
  isOpen,
  currentStatus,
  rfqNumber,
  onClose,
  onConfirm,
  isLoading = false,
}: RfqStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<RfqStatus>(currentStatus);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(currentStatus);
      setNote("");
      setError(null);
    }
  }, [isOpen, currentStatus]);

  // Keyboard accessibility: Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStatus === currentStatus) {
      setError("Please select a different status to update.");
      return;
    }

    try {
      setError(null);
      await onConfirm(selectedStatus, note.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update RFQ status.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rfq-status-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-card border border-border rounded-3xl shadow-xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div>
            <h3 id="rfq-status-dialog-title" className="text-base font-bold text-foreground">
              Update RFQ Status
            </h3>
            <span className="text-xs text-muted-foreground font-mono">
              {rfqNumber}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close dialog"
            className="p-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current status display */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40 border border-border/60 text-xs">
          <span className="text-muted-foreground font-bold uppercase tracking-wider">
            Current Status:
          </span>
          <RfqStatusBadge status={currentStatus} size="sm" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* New Status Selection */}
          <div className="space-y-1.5">
            <label
              htmlFor="new-rfq-status-select"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground block"
            >
              Select New Status <span className="text-destructive">*</span>
            </label>
            <select
              id="new-rfq-status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as RfqStatus)}
              disabled={isLoading}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-border bg-card text-foreground focus:ring-1 focus:ring-primary outline-none cursor-pointer font-medium disabled:opacity-50"
            >
              {ALL_STATUSES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Transition Note */}
          <div className="space-y-1.5">
            <label
              htmlFor="rfq-status-note"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground block"
            >
              Audit Reason / Note (Optional)
            </label>
            <textarea
              id="rfq-status-note"
              rows={3}
              placeholder="Add reason for status update or internal export notes..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-secondary/20 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none transition-all resize-none disabled:opacity-50"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/70">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLoading || selectedStatus === currentStatus}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-bold uppercase tracking-wider transition-opacity shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isLoading && <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
              <span>Confirm Status Update</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

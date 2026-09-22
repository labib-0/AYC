"use client";

import React, { useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { MockUserData } from "@/lib/mock-data/mock-users";
import { UserProfile } from "@/types/api";

export interface AdminUserDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: MockUserData | null;
  currentUser: UserProfile | null;
  onConfirm: (user: MockUserData) => Promise<void>;
}

export default function AdminUserDeleteDialog({
  isOpen,
  onClose,
  user,
  currentUser,
  onConfirm,
}: AdminUserDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !user) return null;

  const isSelf = currentUser && String(user.id) === String(currentUser.id);

  const handleConfirm = async () => {
    if (isSelf) return;
    setDeleting(true);
    try {
      await onConfirm(user);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-admin-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
          <AlertTriangle size={24} />
        </div>

        <div>
          <h2 id="delete-admin-title" className="text-base font-bold text-foreground">
            {isSelf ? "Action Not Allowed" : "Deactivate Admin User?"}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
            {isSelf ? (
              <span>You cannot deactivate or delete your own active administrator account.</span>
            ) : (
              <span>
                Are you sure you want to remove <strong className="text-foreground">{user.name}</strong> ({user.email}) from administrative personnel? They will lose access to the Ayaan Clothing Admin portal.
              </span>
            )}
          </p>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            {isSelf ? "Close" : "Cancel"}
          </button>
          {!isSelf && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
            >
              {deleting ? (
                <div className="w-3.5 h-3.5 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 size={13} />
              )}
              <span>{deleting ? "Removing..." : "Remove User"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

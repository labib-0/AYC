"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { UserAddress } from "@/types/api";
import { AddressFormData } from "@/lib/services/address.service";
import AddressForm from "./AddressForm";

interface DashboardAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  editTarget?: UserAddress | null;
  onSubmit: (data: AddressFormData) => Promise<void>;
  isSubmitting?: boolean;
  defaultValues?: Partial<AddressFormData>;
}

export default function DashboardAddressModal({
  isOpen,
  onClose,
  editTarget,
  onSubmit,
  isSubmitting = false,
  defaultValues,
}: DashboardAddressModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isSubmitting]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-address-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-full sm:w-[90vw] md:w-[88vw] lg:w-[85vw] max-w-[1200px] rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-4 sm:py-5 border-b border-slate-100 dark:border-white/10">
          <div>
            <h3
              id="dashboard-address-modal-title"
              className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white"
            >
              {editTarget ? "Edit Shipping Address" : "Add New Shipping Address"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Consignee destination details for export documentation
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-8 overflow-y-auto">
          <AddressForm
            initialData={
              editTarget
                ? {
                    label: editTarget.label,
                    name: editTarget.name || editTarget.contact_name,
                    contact_name: editTarget.contact_name || editTarget.name,
                    company_name: editTarget.company_name,
                    email: editTarget.email,
                    phone: editTarget.phone,
                    address_line_1: editTarget.address_line_1,
                    address_line_2: editTarget.address_line_2,
                    city: editTarget.city,
                    state: editTarget.state,
                    postal_code: editTarget.postal_code,
                    country_code: editTarget.country_code,
                    country: editTarget.country,
                    is_default: editTarget.is_default,
                  }
                : defaultValues || {
                    label: "Office",
                    country_code: "US",
                  }
            }
            onSubmit={(data) => onSubmit(data)}
            onCancel={onClose}
            isSubmitting={isSubmitting}
            submitLabel={editTarget ? "Update Address" : "Save Address"}
          />
        </div>
      </div>
    </div>
  );
}

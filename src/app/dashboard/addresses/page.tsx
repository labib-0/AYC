"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  Plus,
  Star,
  Pencil,
  Trash2,
  Check,
  Building2,
  Phone,
  Mail,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { UserAddress } from "@/types/api";
import { addressService, AddressFormData } from "@/lib/services/address.service";
import { DashboardAddressModal } from "@/components/account/address";

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

interface DeleteModalProps {
  address: UserAddress;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteModal({ address, isDeleting, onClose, onConfirm }: DeleteModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isDeleting]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-address-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={() => {
        if (!isDeleting) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0 border border-red-200 dark:border-red-800/40">
            <Trash2 size={18} className="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3
              id="delete-address-modal-title"
              className="text-base font-bold font-display text-slate-900 dark:text-white"
            >
              Delete Saved Address?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-700 dark:text-slate-200">&ldquo;{address.label || address.address_line_1}&rdquo;</strong>?
              {address.is_default && (
                <span className="block text-amber-600 dark:text-amber-400 font-semibold mt-1">
                  Note: This is your default commercial destination. If deleted, another address will be designated as default.
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all active:scale-[0.98] shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Confirm Delete</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Address Card ─────────────────────────────────────────────────────────────

interface AddressCardProps {
  address: UserAddress;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  isSettingDefault: boolean;
}

function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isSettingDefault,
}: AddressCardProps) {
  const recipientName = address.contact_name || address.name;

  return (
    <div
      className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 sm:p-6 transition-all shadow-xs flex flex-col justify-between relative group ${
        address.is_default
          ? "border-amber-500/60 dark:border-amber-500/50 ring-2 ring-amber-500/10"
          : "border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
      }`}
    >
      <div>
        {/* Card Header: Label & Default Badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold font-display text-slate-900 dark:text-white">
              {address.label || "Delivery Destination"}
            </span>
            {address.is_default && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-full">
                <Star size={10} className="fill-amber-500 text-amber-500" />
                <span>Default Address</span>
              </span>
            )}
          </div>
        </div>

        {/* Contact & Company Details */}
        <div className="space-y-1.5 mb-4">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {recipientName}
          </p>
          {address.company_name && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              <Building2 size={13} className="text-slate-400 shrink-0" />
              <span className="truncate">{address.company_name}</span>
            </div>
          )}
        </div>

        {/* Physical Address Block */}
        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5 leading-relaxed bg-slate-50/80 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-white/5 mb-4">
          <div className="flex items-start gap-1.5">
            <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p>{address.address_line_1}</p>
              {address.address_line_2 && <p>{address.address_line_2}</p>}
              <p>
                {address.city}
                {address.state ? `, ${address.state}` : ""} {address.postal_code}
              </p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {address.country || address.country_code}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Info Footer */}
        <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
          {address.phone && (
            <div className="flex items-center gap-1.5">
              <Phone size={12} className="text-slate-400 shrink-0" />
              <span>{address.phone}</span>
            </div>
          )}
          {address.email && (
            <div className="flex items-center gap-1.5">
              <Mail size={12} className="text-slate-400 shrink-0" />
              <span className="truncate">{address.email}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/10 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all cursor-pointer"
        >
          <Pencil size={12} />
          <span>Edit</span>
        </button>

        {!address.is_default && (
          <button
            type="button"
            onClick={onSetDefault}
            disabled={isSettingDefault}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all cursor-pointer disabled:opacity-50"
          >
            {isSettingDefault ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Star size={12} />
            )}
            <span>Set Default</span>
          </button>
        )}

        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all ml-auto cursor-pointer"
        >
          <Trash2 size={12} />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main Address Book Page ───────────────────────────────────────────────────

export default function AddressBookPage() {
  const { user } = useAuth();
  const userId = String(user?.id || "guest");

  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<UserAddress | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserAddress | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => {
      setToastMsg((cur) => (cur?.text === text ? null : cur));
    }, 4000);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const list = await addressService.getAddresses(userId);
      setAddresses(list);
    } catch {
      showToast("Unable to load saved shipping addresses. Please refresh.", "error");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenNew = () => {
    setEditTarget(null);
    setShowModal(true);
  };

  const handleOpenEdit = (addr: UserAddress) => {
    setEditTarget(addr);
    setShowModal(true);
  };

  const handleSave = async (formData: AddressFormData) => {
    try {
      setIsSubmitting(true);
      const isEditing = Boolean(editTarget);
      await addressService.saveAddress(userId, formData, editTarget?.id);

      const refreshed = await addressService.getAddresses(userId);
      setAddresses(refreshed);

      setShowModal(false);
      setEditTarget(null);
      showToast(isEditing ? "Shipping destination updated successfully." : "New shipping address saved.");
    } catch {
      showToast("Failed to save address. Please check required fields.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await addressService.deleteAddress(userId, deleteTarget.id);
      setAddresses(res.addresses);
      setDeleteTarget(null);
      showToast("Shipping address removed.");
    } catch {
      showToast("Failed to delete address.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetDefault = async (addr: UserAddress) => {
    try {
      setSettingDefaultId(String(addr.id));
      const updated = await addressService.setDefaultAddress(userId, addr.id);
      setAddresses(updated);
      showToast(`Default destination set to "${addr.label || addr.address_line_1}".`);
    } catch {
      showToast("Failed to update default address.", "error");
    } finally {
      setSettingDefaultId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMsg && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200 ${
            toastMsg.type === "success"
              ? "bg-slate-900 text-white border-slate-800 dark:bg-slate-800 dark:border-white/10"
              : "bg-red-600 text-white border-red-500"
          }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={16} className="shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
            Address Book
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your commercial delivery locations, bonded warehouses, and receiving hubs for expedited checkout.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>Add Shipping Destination</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-4 animate-pulse"
            >
              <div className="flex justify-between items-center">
                <div className="h-4 w-28 bg-slate-200 dark:bg-white/10 rounded" />
                <div className="h-4 w-16 bg-slate-200 dark:bg-white/10 rounded-full" />
              </div>
              <div className="h-4 w-40 bg-slate-200 dark:bg-white/10 rounded" />
              <div className="h-16 w-full bg-slate-100 dark:bg-white/5 rounded-xl" />
              <div className="h-8 w-full bg-slate-100 dark:bg-white/5 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && addresses.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-10 sm:p-14 text-center max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <MapPin size={26} />
          </div>
          <div>
            <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">
              No Saved Shipping Addresses
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Add your receiving warehouse, distribution center, or corporate store address to accelerate wholesale checkout and RFQ quotes.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all active:scale-[0.98] cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>Add First Address</span>
          </button>
        </div>
      )}

      {/* Addresses Grid */}
      {!loading && addresses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {addresses.map((addr) => (
            <AddressCard
              key={String(addr.id)}
              address={addr}
              onEdit={() => handleOpenEdit(addr)}
              onDelete={() => setDeleteTarget(addr)}
              onSetDefault={() => handleSetDefault(addr)}
              isSettingDefault={settingDefaultId === String(addr.id)}
            />
          ))}
        </div>
      )}

      {/* Reusable Address Modal */}
      <DashboardAddressModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditTarget(null);
        }}
        editTarget={editTarget}
        onSubmit={handleSave}
        isSubmitting={isSubmitting}
        defaultValues={{
          company_name: user?.company_name || "",
          name: user?.name || "",
          email: user?.email || "",
          phone: user?.phone || "",
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteModal
          address={deleteTarget}
          isDeleting={isDeleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

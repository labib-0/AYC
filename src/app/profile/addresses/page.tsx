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
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { UserAddress } from "@/types/api";
import { addressService, AddressFormData, getCountryName } from "@/lib/services/address.service";
import { DashboardAddressModal } from "@/components/account/address";

// ─── Delete Confirmation Dialog ────────────────────────────────────────────────

interface DeleteDialogProps {
  address: UserAddress;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteDialog({ address, isDeleting, onClose, onConfirm }: DeleteDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
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
            <h3 className="text-base font-bold font-display text-slate-900 dark:text-white">
              Delete Saved Address?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-700 dark:text-slate-300">&ldquo;{address.label || address.address_line_1}&rdquo;</strong>?
              {address.is_default && (
                <span className="block text-amber-600 dark:text-amber-400 font-medium mt-1">
                  Note: This is your default address. If removed, your next saved address will become default.
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-white/10">
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

// ─── Address Card ──────────────────────────────────────────────────────────────

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
  const country = address.country || getCountryName(address.country_code);

  return (
    <div
      className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all ${
        address.is_default
          ? "border-amber-400/80 dark:border-amber-500/50 ring-1 ring-amber-400/30 dark:ring-amber-500/20"
          : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
      }`}
    >
      <div className="space-y-3.5">
        {/* Header: Label & Default Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200 text-xs font-bold">
              <MapPin size={12} className={address.is_default ? "text-amber-500" : "text-slate-400"} />
              {address.label || "Address"}
            </span>

            {address.is_default && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] font-extrabold uppercase tracking-wider border border-amber-200 dark:border-amber-700/50">
                <Star size={10} className="fill-amber-500 text-amber-500" />
                Default Address
              </span>
            )}
          </div>
        </div>

        {/* Address Body */}
        <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
          <div className="font-bold text-sm text-slate-900 dark:text-white">
            {address.name || address.contact_name}
          </div>

          {address.company_name && (
            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200 pt-0.5">
              <Building2 size={12} className="text-slate-400 shrink-0" />
              <span>{address.company_name}</span>
            </div>
          )}

          <div className="pt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>{address.address_line_1}</p>
            {address.address_line_2 && <p>{address.address_line_2}</p>}
            <p>
              {address.city}
              {address.state ? `, ${address.state}` : ""}{" "}
              <span className="font-mono">{address.postal_code}</span>
            </p>
            <p className="font-semibold text-slate-700 dark:text-slate-300">{country}</p>
          </div>

          <div className="pt-2 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-white/[0.05]">
            {address.phone && (
              <div className="flex items-center gap-1.5">
                <Phone size={11} className="text-slate-400 shrink-0" />
                <span>{address.phone}</span>
              </div>
            )}
            {address.email && (
              <div className="flex items-center gap-1.5">
                <Mail size={11} className="text-slate-400 shrink-0" />
                <span>{address.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap pt-3.5 mt-4 border-t border-slate-100 dark:border-white/[0.06]">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-all cursor-pointer"
        >
          <Pencil size={12} />
          <span>Edit</span>
        </button>

        {!address.is_default && (
          <button
            type="button"
            onClick={onSetDefault}
            disabled={isSettingDefault}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-all cursor-pointer disabled:opacity-50"
          >
            {isSettingDefault ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Star size={12} />
            )}
            <span>Set as Default</span>
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

// ─── Main Addresses Page ───────────────────────────────────────────────────────

export default function AddressesPage() {
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
    }, 3500);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const list = await addressService.getAddresses(userId);
      setAddresses(list);
    } catch {
      showToast("Unable to load saved addresses. Please refresh.", "error");
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
      showToast(isEditing ? "Address updated successfully." : "Address saved successfully.");
    } catch {
      showToast("Failed to save address. Please try again.", "error");
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
      showToast("Address deleted successfully.");
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
      showToast("Default address updated.");
    } catch {
      showToast("Failed to update default address.", "error");
    } finally {
      setSettingDefaultId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-white tracking-tight">
            Saved Addresses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your commercial consignee and delivery destinations for quick checkout and export documentation.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] shadow-sm shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>+ Add Address</span>
        </button>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-semibold animate-in fade-in slide-in-from-top-2 ${
            toastMsg.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/40 text-red-800 dark:text-red-300"
          }`}
        >
          {toastMsg.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 size={24} className="animate-spin text-amber-500" />
          <p className="text-xs font-medium text-slate-500">Loading saved addresses...</p>
        </div>
      ) : addresses.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xs flex flex-col items-center justify-center text-center py-12 px-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3.5 border border-amber-200 dark:border-amber-800/40">
            <MapPin size={22} />
          </div>
          <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">
            No saved addresses yet.
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
            Add a shipping address to make checkout faster.
          </p>
          <button
            type="button"
            onClick={handleOpenNew}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            <Plus size={14} />
            <span>+ Add Address</span>
          </button>
        </div>
      ) : (
        /* Address Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses
            .slice()
            .sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0))
            .map((addr) => (
              <AddressCard
                key={addr.id}
                address={addr}
                onEdit={() => handleOpenEdit(addr)}
                onDelete={() => setDeleteTarget(addr)}
                onSetDefault={() => handleSetDefault(addr)}
                isSettingDefault={settingDefaultId === String(addr.id)}
              />
            ))}
        </div>
      )}

      {/* Address Form Modal */}
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
          label: "Office",
          name: user?.name || "",
          contact_name: user?.name || "",
          company_name: (user as any)?.company_name || "",
          email: user?.email || "",
          phone: user?.phone || "",
          country_code: "US",
          is_default: addresses.length === 0,
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteDialog
          address={deleteTarget}
          isDeleting={isDeleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

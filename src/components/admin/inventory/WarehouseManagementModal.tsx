import React, { useState } from "react";
import {
  X,
  Warehouse as WarehouseIcon,
  Plus,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import {
  adminInventoryService,
  Warehouse,
} from "@/services/admin/inventory.service";

export interface WarehouseManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  onRefresh: () => void;
  onSuccess: (message: string) => void;
}

export default function WarehouseManagementModal({
  isOpen,
  onClose,
  warehouses,
  onRefresh,
  onSuccess,
}: WarehouseManagementModalProps) {
  const [view, setView] = useState<"list" | "form">("list");
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [countryCode, setCountryCode] = useState("BD");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOpenCreate = () => {
    setEditingWarehouse(null);
    setName("");
    setCode("");
    setCountryCode("BD");
    setCity("");
    setAddress("");
    setIsActive(true);
    setErrorMessage(null);
    setView("form");
  };

  const handleOpenEdit = (w: Warehouse) => {
    setEditingWarehouse(w);
    setName(w.name);
    setCode(w.code);
    setCountryCode(w.country_code);
    setCity(w.city || "");
    setAddress(w.address || "");
    setIsActive(w.is_active);
    setErrorMessage(null);
    setView("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setErrorMessage("Warehouse name and code are required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (editingWarehouse) {
        await adminInventoryService.updateWarehouse(editingWarehouse.id, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          country_code: countryCode.trim().toUpperCase(),
          city: city.trim() || undefined,
          address: address.trim() || undefined,
          is_active: isActive,
        });

        onSuccess(`Warehouse "${name.trim()}" updated successfully.`);
      } else {
        await adminInventoryService.createWarehouse({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          country_code: countryCode.trim().toUpperCase(),
          city: city.trim() || undefined,
          address: address.trim() || undefined,
          is_active: isActive,
        });

        onSuccess(`Warehouse "${name.trim()}" created successfully.`);
      }

      onRefresh();
      setView("list");
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save warehouse.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="warehouse-modal-title"
    >
      <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl space-y-5 my-8 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <WarehouseIcon size={18} />
            </div>
            <div>
              <h3
                id="warehouse-modal-title"
                className="font-display font-bold text-lg uppercase tracking-tight text-foreground"
              >
                {view === "list"
                  ? "Warehouse Directory"
                  : editingWarehouse
                  ? `Edit Warehouse: ${editingWarehouse.name}`
                  : "Add New Warehouse"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Manage fulfillment locations, stock routing, and export facilities.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {view === "list" ? (
          /* List View */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Active Locations ({warehouses.length})
              </span>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Warehouse</span>
              </button>
            </div>

            <div className="border border-border/70 rounded-2xl divide-y divide-border/60 overflow-hidden bg-card">
              {warehouses.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  No warehouses available.
                </div>
              ) : (
                warehouses.map((w) => (
                  <div
                    key={w.id}
                    className="p-3.5 hover:bg-secondary/20 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">
                          {w.name}
                        </span>
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-secondary text-foreground">
                          {w.code}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            w.is_active
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {w.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mt-1">
                        <MapPin size={12} />
                        <span>
                          {w.city ? `${w.city}, ` : ""}
                          {w.country_code}
                          {w.address ? ` • ${w.address}` : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(w)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-secondary/40 hover:bg-secondary text-foreground text-xs font-bold transition-colors cursor-pointer"
                        title="Edit warehouse details"
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Deletion Policy Notice per Section 37 */}
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/60 text-[11px] text-muted-foreground flex items-center gap-2">
              <ShieldAlert size={14} className="shrink-0 text-muted-foreground" />
              <span>
                Warehouse deletion is intentionally disabled to protect active inventory references and preserve historical stock audit logs.
              </span>
            </div>
          </div>
        ) : (
          /* Create / Edit Form */
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                Warehouse Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Dhaka Central Export Hub"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/30 text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                  Warehouse Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="WH-DHK-01"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/30 text-foreground font-mono uppercase focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                  Country Code *
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="BD"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/30 text-foreground uppercase focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                  City
                </label>
                <input
                  type="text"
                  placeholder="Dhaka"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/30 text-foreground focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                  Facility Address
                </label>
                <input
                  type="text"
                  placeholder="Sector 7, Uttara"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/30 text-foreground focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="wh-is-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={isSubmitting}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
              />
              <label htmlFor="wh-is-active" className="text-xs font-semibold text-foreground cursor-pointer">
                Warehouse is operational and accepting inventory
              </label>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={() => setView("list")}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-full border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Back to List
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !name.trim() || !code.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>{editingWarehouse ? "Update Warehouse" : "Create Warehouse"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Globe, Check } from "lucide-react";
import {
  usePreferences,
  SUPPORTED_LANGUAGES,
} from "@/lib/PreferencesContext";
import { LanguageCode } from "@/lib/translations";

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LanguageCurrencyModal({
  isOpen,
  onClose,
}: LanguageModalProps) {
  const { preferences, updateLanguage, t } = usePreferences();
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(preferences.language);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedLanguage(preferences.language);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, preferences]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectLanguage = (code: LanguageCode) => {
    setSelectedLanguage(code);
    updateLanguage(code);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateLanguage(selectedLanguage);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-[200] transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        className="fixed inset-0 z-[210] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        onClick={onClose}
      >
        <div
          ref={modalRef}
          className="bg-card border border-border w-full max-w-[420px] rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto transition-all transform animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lang-modal-title"
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-2">
            <div>
              <h2
                id="lang-modal-title"
                className="text-xl font-bold font-display text-foreground tracking-tight"
              >
                {t("modal.language_title", "Select Language")}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t("modal.language_subtitle", "Choose your preferred interface language. All transactions and catalog pricing are strictly in USD ($).")}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 -mr-1 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSave} className="p-6 pt-3 flex flex-col gap-4">
            <div className="space-y-2">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-border bg-secondary/30 text-foreground hover:bg-secondary/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Globe size={16} className={isSelected ? "text-primary" : "text-muted-foreground"} />
                      <div>
                        <span className="font-bold text-xs block">{lang.label}</span>
                        <span className="text-xs text-muted-foreground">{lang.native}</span>
                      </div>
                    </div>
                    {isSelected && <Check size={16} className="text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Save Button */}
            <button
              type="submit"
              className="w-full mt-2 bg-foreground text-background font-bold py-3 px-4 rounded-full text-xs uppercase tracking-wider hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
            >
              {t("modal.save_language", "Save Language")}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

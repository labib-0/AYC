"use client";

import React, { useState } from "react";
import {
  HelpCircle,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Save,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { FaqItem, DEFAULT_FAQS } from "@/app/faq/page";
import { homepageService } from "@/services/homepage.service";

interface HomepageFaqManagerProps {
  initialFaqs?: FaqItem[];
  onSaveSuccess?: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  disabled?: boolean;
}

export default function HomepageFaqManager({
  initialFaqs = DEFAULT_FAQS,
  onSaveSuccess,
  showToast,
  disabled = false,
}: HomepageFaqManagerProps) {
  const [faqs, setFaqs] = useState<FaqItem[]>(initialFaqs.length > 0 ? initialFaqs : DEFAULT_FAQS);
  const [savedFaqs, setSavedFaqs] = useState<FaqItem[]>(initialFaqs.length > 0 ? initialFaqs : DEFAULT_FAQS);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState<{ question: string; answer: string }>({ question: "", answer: "" });
  const [isAdding, setIsAdding] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [saving, setSaving] = useState(false);

  const isDirty = JSON.stringify(faqs) !== JSON.stringify(savedFaqs);

  // Add new FAQ
  const handleAddFaq = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      showToast("Please provide both a question and an answer.", "error");
      return;
    }

    const newItem: FaqItem = {
      id: Date.now(),
      question: newQuestion.trim(),
      answer: newAnswer.trim(),
      sort_order: faqs.length + 1,
      is_active: true,
    };

    setFaqs((prev) => [...prev, newItem]);
    setNewQuestion("");
    setNewAnswer("");
    setIsAdding(false);
  };

  // Reordering
  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= faqs.length) return;

    const updated = [...faqs];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    // Re-index sort_order
    const reindexed = updated.map((item, idx) => ({
      ...item,
      sort_order: idx + 1,
    }));
    setFaqs(reindexed);
  };

  // Toggle active status
  const handleToggleActive = (id: string | number) => {
    setFaqs((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_active: !item.is_active } : item))
    );
  };

  // Delete
  const handleDelete = (id: string | number) => {
    setFaqs((prev) => prev.filter((item) => item.id !== id));
  };

  // Start edit
  const startEdit = (item: FaqItem) => {
    setEditingId(item.id);
    setEditForm({ question: item.question, answer: item.answer });
  };

  // Save edit
  const saveEdit = (id: string | number) => {
    if (!editForm.question.trim() || !editForm.answer.trim()) {
      showToast("Question and answer cannot be empty.", "error");
      return;
    }
    setFaqs((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, question: editForm.question.trim(), answer: editForm.answer.trim() } : item
      )
    );
    setEditingId(null);
  };

  // Save changes to backend API / storage
  const handleSave = async () => {
    setSaving(true);
    try {
      await homepageService.syncFaqs(faqs);
      setSavedFaqs(faqs);
      showToast("FAQs saved successfully. Active FAQs updated on storefront.", "success");
      onSaveSuccess?.();
    } catch (err: any) {
      showToast(err?.message || "Failed to save FAQs.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFaqs(savedFaqs);
    setEditingId(null);
    setIsAdding(false);
  };

  return (
    <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-border/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <h2 className="font-display font-bold text-base sm:text-lg text-foreground">
              Frequently Asked Questions (FAQ) Manager
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Create, edit, reorder, or toggle FAQs displayed on the public storefront and linked from the footer.
          </p>
        </div>
        <div
          data-testid="faq-header-actions"
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto self-stretch sm:self-auto"
        >
          {isDirty && (
            <button
              type="button"
              onClick={handleReset}
              disabled={disabled || saving}
              className="px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={disabled || saving || !isDirty}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto ${
              isDirty
                ? "bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
            }`}
          >
            <Save size={13} />
            <span>{saving ? "Saving..." : "Save FAQs"}</span>
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-6 flex flex-col gap-4">
        {/* Add FAQ Button / Form (order-1 on mobile so it appears directly beneath section title; sm:order-2 on desktop) */}
        <div className="order-1 sm:order-2">
          {isAdding ? (
            <div className="p-4 rounded-xl border border-primary/40 bg-secondary/10 space-y-3">
              <h4 className="text-xs font-bold text-foreground">Add New FAQ</h4>
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Question (e.g. Can you supply custom fabric weights?)"
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <textarea
                rows={3}
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                placeholder="Answer detailing your terms, lead time, or capabilities..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setNewQuestion("");
                    setNewAnswer("");
                  }}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddFaq}
                  className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Question</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="w-full py-2.5 min-h-[40px] rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-secondary/30 transition-all text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>Add New FAQ Entry</span>
            </button>
          )}
        </div>

        {/* FAQ List (order-2 on mobile so it appears following action button; sm:order-1 on desktop) */}
        <div className="space-y-3 order-2 sm:order-1">
          {faqs.map((faq, index) => {
            const isEditing = editingId === faq.id;
            return (
              <div
                key={faq.id}
                className={`p-4 rounded-xl border transition-all ${
                  faq.is_active !== false
                    ? "border-border/80 bg-background"
                    : "border-border/40 bg-secondary/20 opacity-70"
                }`}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editForm.question}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, question: e.target.value }))}
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Question"
                    />
                    <textarea
                      rows={3}
                      value={editForm.answer}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, answer: e.target.value }))}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Answer"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                      >
                        <X size={13} />
                        <span>Cancel</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(faq.id)}
                        className="px-3 py-1 text-xs font-bold bg-primary text-primary-foreground rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Check size={13} />
                        <span>Done</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">
                          #{index + 1}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                          {faq.question}
                        </h4>
                        {!faq.is_active && (
                          <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 pl-7">
                        {faq.answer}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Move Up / Down */}
                      <button
                        type="button"
                        onClick={() => handleMove(index, "up")}
                        disabled={index === 0}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <MoveUp size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, "down")}
                        disabled={index === faqs.length - 1}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <MoveDown size={13} />
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => startEdit(faq)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                        title="Edit FAQ"
                      >
                        <Edit2 size={13} />
                      </button>

                      {/* Toggle Active */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(faq.id)}
                        className={`px-2 py-1 text-[11px] font-semibold rounded-lg cursor-pointer ${
                          faq.is_active !== false
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                        title={faq.is_active !== false ? "Disable" : "Enable"}
                      >
                        {faq.is_active !== false ? "Active" : "Inactive"}
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDelete(faq.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-red-500/80 hover:text-red-500 hover:bg-red-500/10 cursor-pointer"
                        title="Delete FAQ"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

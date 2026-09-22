import React, { useState } from "react";
import { Send, AlertCircle } from "lucide-react";

export interface RfqMessageComposerProps {
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
}

export default function RfqMessageComposer({
  onSendMessage,
  isLoading = false,
}: RfqMessageComposerProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean) {
      setError("Please enter a message.");
      return;
    }

    try {
      setError(null);
      await onSendMessage(clean);
      setText(""); // Only clear upon successful send
    } catch (err: unknown) {
      setError((err as Error)?.message || "Unable to send message. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 pt-2 border-t border-border/60">
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 p-2 rounded-xl border border-destructive/20">
          <AlertCircle size={13} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="relative">
        <textarea
          rows={3}
          placeholder="Type an official message or update to the buyer..."
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(null);
          }}
          disabled={isLoading}
          maxLength={1500}
          className="w-full p-3 text-xs rounded-2xl border border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none transition-all resize-none disabled:opacity-50 pr-24"
        />

        <div className="absolute right-2.5 bottom-3 flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
            {text.length}/1500
          </span>

          <button
            type="submit"
            disabled={isLoading || !text.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={12} />
            )}
            <span>Send</span>
          </button>
        </div>
      </div>
    </form>
  );
}

import React from "react";

export default function AdminFooter() {
  return (
    <footer className="border-t border-border/80 bg-card/60 px-4 sm:px-6 py-4 text-center text-xs text-muted-foreground">
      <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground uppercase tracking-wider font-display">
            AYAAN CLOTHING ADMIN
          </span>
          <span className="text-[10px] bg-secondary px-2 py-0.5 rounded text-muted-foreground font-mono">
            v2.4-frontend
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          © 2026 Ayaan Clothing. Internal B2B Export Operations &amp; Management Portal.
        </p>
      </div>
    </footer>
  );
}

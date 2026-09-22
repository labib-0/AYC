import React from "react";

export interface DocumentSignatoryProps {
  title?: string;
  division?: string;
  notes?: string;
  notesTitle?: string;
}

export default function DocumentSignatory({
  title = "Authorized Signatory & Official Stamp",
  division = "Ayaan Clothing Export Division",
  notes,
  notesTitle,
}: DocumentSignatoryProps) {
  return (
    <div className="pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
      {notes ? (
        <div className="space-y-1.5">
          {notesTitle && (
            <span className="font-bold uppercase tracking-wider text-muted-foreground block text-[10px]">
              {notesTitle}
            </span>
          )}
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            {notes}
          </p>
        </div>
      ) : (
        <div />
      )}

      <div className="flex flex-col justify-end items-start sm:items-end text-right">
        <div className="w-48 border-b border-foreground mb-2" />
        <span className="font-bold text-xs uppercase text-foreground">
          {title}
        </span>
        <span className="text-xs text-muted-foreground">
          {division}
        </span>
      </div>
    </div>
  );
}

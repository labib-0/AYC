import React from "react";
import { RfqMessage } from "@/types/b2b";
import { MessageSquare, User, ShieldCheck, Clock } from "lucide-react";

export interface RfqMessageThreadProps {
  messages: RfqMessage[];
  buyerName: string;
}

export default function RfqMessageThread({
  messages,
  buyerName,
}: RfqMessageThreadProps) {
  if (messages.length === 0) {
    return (
      <div className="p-8 text-center space-y-2 rounded-2xl bg-secondary/20 border border-border/50">
        <div className="w-10 h-10 rounded-full bg-secondary text-muted-foreground flex items-center justify-center mx-auto">
          <MessageSquare size={18} />
        </div>
        <p className="text-xs font-bold text-foreground">No messages yet.</p>
        <p className="text-[11px] text-muted-foreground">
          Start the export communication thread with {buyerName} below.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
      {messages.map((msg) => {
        const isAdmin = msg.senderRole === "admin" || msg.senderRole === "sales";
        const formattedTime = msg.createdAt
          ? new Date(msg.createdAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";

        return (
          <div
            key={msg.id}
            className={`flex flex-col ${
              isAdmin ? "items-end" : "items-start"
            } space-y-1`}
          >
            {/* Sender Meta */}
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {isAdmin ? (
                <>
                  <ShieldCheck size={11} className="text-primary" />
                  <span className="font-bold text-foreground">
                    {msg.senderName || "Ayaan Export Sales"}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary font-semibold">
                    Admin
                  </span>
                </>
              ) : (
                <>
                  <User size={11} className="text-muted-foreground" />
                  <span className="font-bold text-foreground">
                    {msg.senderName || buyerName}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-secondary text-muted-foreground font-semibold">
                    Buyer
                  </span>
                </>
              )}
              {formattedTime && (
                <span className="font-mono text-muted-foreground flex items-center gap-0.5 ml-1">
                  <Clock size={9} />
                  {formattedTime}
                </span>
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-2xs ${
                isAdmin
                  ? "bg-primary text-primary-foreground rounded-tr-xs"
                  : "bg-card border border-border/80 text-foreground rounded-tl-xs"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

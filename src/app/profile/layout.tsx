import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

// STF-001: All /profile/* routes now redirect to /dashboard/*.
// This layout is a simple passthrough — the child page components
// execute redirect() at the server level before any client rendering.
export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

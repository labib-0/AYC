import type { Metadata } from "next";
import DashboardLayoutClient from "./DashboardLayoutClient";

export const metadata: Metadata = {
  title: "Customer Portal | AYAAN CLOTHING",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export function getBreadcrumbLabel(pathname: string): string {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname.startsWith("/dashboard/orders/")) return "Order Details";
  if (pathname.startsWith("/dashboard/orders")) return "Orders";
  if (pathname.startsWith("/dashboard/wishlist")) return "Saved Items";
  if (pathname.startsWith("/dashboard/rfq/")) return "RFQ Details";
  if (pathname.startsWith("/dashboard/rfq")) return "RFQ";
  if (pathname.startsWith("/dashboard/quotes/")) return "Quotation Details";
  if (pathname.startsWith("/dashboard/quotes")) return "Commercial Quotes";
  if (pathname.startsWith("/dashboard/reorder")) return "Quick Reorder";
  if (pathname.startsWith("/dashboard/company")) return "Company Profile";
  if (pathname.startsWith("/dashboard/addresses")) return "Address Book";
  if (pathname.startsWith("/dashboard/documents")) return "Document Center";
  if (pathname.startsWith("/dashboard/settings")) return "Profile & Security";
  if (pathname.startsWith("/dashboard/details")) return "Account Details";
  return "Customer Portal";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}

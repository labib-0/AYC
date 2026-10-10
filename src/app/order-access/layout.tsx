import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order Access | AYAAN CLOTHING",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function OrderAccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account | AYAAN CLOTHING",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

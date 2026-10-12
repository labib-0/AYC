import { Metadata } from "next";
import LegalPageContent from "@/components/legal/LegalPageContent";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Review our export-grade commercial terms, quotation validity, inspection protocols, and payment requirements.",
  alternates: {
    canonical: canonicalUrl("/terms-and-conditions"),
  },
};

export default function TermsAndConditionsPage() {
  return <LegalPageContent type="terms_conditions" initialTitle="Terms & Conditions" />;
}

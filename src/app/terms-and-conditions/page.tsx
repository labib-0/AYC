import { Metadata } from "next";
import LegalPageContent from "@/components/legal/LegalPageContent";

export const metadata: Metadata = {
  title: "Terms & Conditions | AYAAN CLOTHING",
  description: "Review our export-grade commercial terms, quotation validity, inspection protocols, and payment requirements.",
};

export default function TermsAndConditionsPage() {
  return <LegalPageContent type="terms_conditions" initialTitle="Terms & Conditions" />;
}

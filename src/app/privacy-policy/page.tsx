import { Metadata } from "next";
import LegalPageContent from "@/components/legal/LegalPageContent";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Privacy Policy | AYAAN CLOTHING",
  description: "Review our privacy policy, commercial data protection standards, and buyer confidentiality principles.",
  alternates: {
    canonical: canonicalUrl("/privacy-policy"),
  },
};

export default function PrivacyPolicyPage() {
  return <LegalPageContent type="privacy_policy" initialTitle="Privacy Policy" />;
}

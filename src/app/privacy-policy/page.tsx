import { Metadata } from "next";
import LegalPageContent from "@/components/legal/LegalPageContent";

export const metadata: Metadata = {
  title: "Privacy Policy | AYAAN CLOTHING",
  description: "Review our privacy policy, commercial data protection standards, and buyer confidentiality principles.",
};

export default function PrivacyPolicyPage() {
  return <LegalPageContent type="privacy_policy" initialTitle="Privacy Policy" />;
}

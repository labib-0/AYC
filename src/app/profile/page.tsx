import { redirect } from "next/navigation";

// STF-001: Consolidated customer portal under /dashboard.
// This redirect preserves bookmarks and indexed URLs.
export default function ProfileRedirectPage() {
  redirect("/dashboard");
}

import { redirect } from "next/navigation";

// STF-001: Consolidated customer portal under /dashboard.
export default function ProfileDetailsRedirect() {
  redirect("/dashboard/settings");
}

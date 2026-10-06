import { redirect } from "next/navigation";

// STF-001: Consolidated customer portal under /dashboard.
// Preserves the dynamic order ID segment in the redirect.
export default async function ProfileOrderDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/orders/${id}`);
}

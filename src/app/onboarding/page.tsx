import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getDashboardSyncSummary } from "@/lib/db/client";
import { requireActiveStore } from "@/lib/routing/require-active-store";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  await requireActiveStore();

  const summary = await getDashboardSyncSummary();

  return (
    <OnboardingFlow
      detectedOrderCount={summary.orderCount}
      storeName={summary.connection?.storeName ?? undefined}
    />
  );
}

import { redirect } from "next/navigation";

import { OnboardingAccessGate } from "@/components/onboarding/onboarding-access-gate";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import {
  getAnalystPreferencesForActiveStore,
  getDashboardSyncSummary,
  getStoreMembershipsForCurrentUser,
  upsertStoreMembershipForUser,
} from "@/lib/db/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const storeId = typeof params.storeId === "string" ? params.storeId : undefined;
  const flow = typeof params.flow === "string" ? params.flow : undefined;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const memberships = user ? await getStoreMembershipsForCurrentUser() : [];
  const activeStoreId = storeId ?? memberships[0]?.storeId;

  if (user && activeStoreId) {
    await upsertStoreMembershipForUser({
      displayName: typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null,
      email: user.email,
      storeId: activeStoreId,
      userId: user.id,
    });
  }

  const summary = activeStoreId ? await getDashboardSyncSummary(activeStoreId) : null;
  const storeName = summary?.connection?.storeName ?? undefined;
  const preferences = activeStoreId ? await getAnalystPreferencesForActiveStore(activeStoreId) : null;

  if (!user) {
    return <OnboardingAccessGate storeId={activeStoreId} storeName={storeName} />;
  }

  if (!activeStoreId) {
    redirect("/connect");
  }

  if (flow !== "setup" || preferences?.completedAt) {
    redirect(`/dashboard?storeId=${activeStoreId}`);
  }

  return <OnboardingFlow detectedOrderCount={summary?.orderCount ?? 0} storeId={activeStoreId} storeName={storeName} />;
}

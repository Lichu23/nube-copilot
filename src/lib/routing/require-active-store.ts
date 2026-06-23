import { redirect } from "next/navigation";

import { getActiveTiendanubeConnection, resolveActiveStoreId } from "@/lib/db/client";

export async function requireActiveStore(storeId?: string) {
  try {
    const resolvedStore = await resolveActiveStoreId(storeId);
    const connection = await getActiveTiendanubeConnection(resolvedStore.storeId);

    if (!connection) {
      redirect("/connect");
    }

    return connection;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("Multiple store memberships found")) {
      redirect("/stores");
    }

    if (message.includes("No store membership found")) {
      redirect("/connect");
    }

    if (message.includes("signed in")) {
      redirect("/login");
    }

    throw error;
  }
}

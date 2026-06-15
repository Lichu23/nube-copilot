import { redirect } from "next/navigation";

import { getActiveTiendanubeConnection } from "@/lib/db/client";

export async function requireActiveStore() {
  const connection = await getActiveTiendanubeConnection();

  if (!connection) {
    redirect("/connect");
  }

  return connection;
}

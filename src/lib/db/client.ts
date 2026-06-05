import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { storeConnections, stores } from "@/lib/db/schema";
import type { TiendanubeStoreMetadata } from "@/lib/tiendanube/types";

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!dbInstance) {
    const client = postgres(process.env.DATABASE_URL, {
      prepare: false,
    });

    dbInstance = drizzle(client);
  }

  return dbInstance;
}

type PersistTiendanubeConnectionInput = TiendanubeStoreMetadata & {
  accessTokenEncrypted: string;
  scopes: string[];
  storeExternalId: string;
};

export async function persistTiendanubeConnection(input: PersistTiendanubeConnectionInput) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [existingStore] = await tx
      .select()
      .from(stores)
      .where(eq(stores.tiendanubeStoreId, input.storeExternalId))
      .limit(1);

    const now = new Date();
    const [store] = existingStore
      ? await tx
          .update(stores)
          .set({
            country: input.country ?? existingStore.country,
            currency: input.currency ?? existingStore.currency,
            name: input.name ?? existingStore.name,
            updatedAt: now,
          })
          .where(eq(stores.id, existingStore.id))
          .returning()
      : await tx
          .insert(stores)
          .values({
            country: input.country ?? null,
            currency: input.currency ?? null,
            name: input.name ?? null,
            tiendanubeStoreId: input.storeExternalId,
          })
          .returning();

    const [existingConnection] = await tx
      .select()
      .from(storeConnections)
      .where(eq(storeConnections.storeId, store.id))
      .limit(1);

    if (existingConnection) {
      await tx
        .update(storeConnections)
        .set({
          accessTokenEncrypted: input.accessTokenEncrypted,
          scopes: input.scopes,
          status: "active",
          updatedAt: now,
        })
        .where(eq(storeConnections.id, existingConnection.id));
    } else {
      await tx.insert(storeConnections).values({
        accessTokenEncrypted: input.accessTokenEncrypted,
        scopes: input.scopes,
        status: "active",
        storeId: store.id,
      });
    }

    return { storeId: store.id };
  });
}

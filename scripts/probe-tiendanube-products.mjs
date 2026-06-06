import { config as loadEnv } from "dotenv";
import { createDecipheriv, createHash } from "node:crypto";
import postgres from "postgres";

loadEnv({ path: ".env.local" });

function getArg(name) {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

function getKey(secret) {
  return createHash("sha256").update(secret).digest();
}

function decryptSecret(value, secret) {
  const [ivPart, tagPart, encryptedPart] = value.split(".");

  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error("Encrypted value has an invalid format.");
  }

  const decipher = createDecipheriv("aes-256-gcm", getKey(secret), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function getApiOrigin() {
  const configuredBase = process.env.TIENDANUBE_API_BASE_URL?.trim();

  if (!configuredBase) {
    return "https://api.tiendanube.com";
  }

  return new URL(configuredBase).origin;
}

async function getConnection(client, requestedStoreId) {
  if (requestedStoreId) {
    const rows = await client`
      select
        sc.access_token_encrypted,
        s.id as store_id,
        s.name as store_name,
        s.tiendanube_store_id as store_external_id
      from store_connections sc
      inner join stores s on s.id = sc.store_id
      where sc.status = 'active'
        and s.id = ${requestedStoreId}
      limit 1
    `;

    return rows[0] ?? null;
  }

  const rows = await client`
    select
      sc.access_token_encrypted,
      s.id as store_id,
      s.name as store_name,
      s.tiendanube_store_id as store_external_id
    from store_connections sc
    inner join stores s on s.id = sc.store_id
    where sc.status = 'active'
    order by sc.updated_at desc
    limit 2
  `;

  if (rows.length > 1) {
    throw new Error("More than one active store found. Pass --storeId=<uuid> explicitly.");
  }

  return rows[0] ?? null;
}

async function probe(accessToken, url) {
  const response = await fetch(url, {
    headers: {
      Authentication: `bearer ${accessToken}`,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": `NubeCopilot Probe (${process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000"})`,
    },
  });

  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  const preview = Array.isArray(body)
    ? body.slice(0, 2).map((item) => ({
        id: item?.id ?? null,
        name: item?.name ?? null,
        published: item?.published ?? null,
        sku: item?.sku ?? null,
        variants: Array.isArray(item?.variants) ? item.variants.length : null,
      }))
    : body;

  return {
    preview,
    status: response.status,
    totalCount: response.headers.get("x-total-count"),
    url,
  };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const encryptionSecret =
    process.env.TIENDANUBE_ENCRYPTION_SECRET?.trim() || process.env.APP_SECRET?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!encryptionSecret) {
    throw new Error("TIENDANUBE_ENCRYPTION_SECRET or APP_SECRET is not configured.");
  }

  const storeId = getArg("storeId");
  const client = postgres(databaseUrl, { prepare: false });

  try {
    const connection = await getConnection(client, storeId);

    if (!connection) {
      throw new Error("No active Tiendanube connection found.");
    }

    const accessToken = decryptSecret(connection.access_token_encrypted, encryptionSecret);
    const apiOrigin = getApiOrigin();
    const externalStoreId = connection.store_external_id;
    const endpoints = [
      `${apiOrigin}/v1/${externalStoreId}/products?page=1&per_page=30&fields=id,name,handle,published,variants`,
      `${apiOrigin}/v1/${externalStoreId}/products?page=1&per_page=30&published=true&fields=id,name,handle,published,variants`,
      `${apiOrigin}/v1/${externalStoreId}/products?page=1&per_page=30&published=false&fields=id,name,handle,published,variants`,
      `${apiOrigin}/2025-03/${externalStoreId}/products?page=1&per_page=30`,
      `${apiOrigin}/2025-03/${externalStoreId}/products?page=1&per_page=30&published=true`,
      `${apiOrigin}/2025-03/${externalStoreId}/products?page=1&per_page=30&published=false`,
    ];

    console.log(
      JSON.stringify(
        {
          store: {
            storeExternalId: externalStoreId,
            storeId: connection.store_id,
            storeName: connection.store_name,
          },
        },
        null,
        2,
      ),
    );

    for (const url of endpoints) {
      const result = await probe(accessToken, url);
      console.log(JSON.stringify(result, null, 2));
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});

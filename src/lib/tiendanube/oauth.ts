import { randomBytes } from "node:crypto";
import { getTiendanubeOAuthConfig } from "@/lib/env/tiendanube";
import { getTiendanubeApiBaseUrl, getTiendanubeApiHeaders } from "@/lib/tiendanube/client";
import type {
  TiendanubeLocalizedField,
  TiendanubeOAuthTokenResponse,
  TiendanubeStoreMetadata,
  TiendanubeStoreResponse,
} from "@/lib/tiendanube/types";

export const TIENDANUBE_OAUTH_STATE_COOKIE = "tn_oauth_state";
export const TIENDANUBE_OAUTH_STATE_TTL_SECONDS = 60 * 10;

export function createTiendanubeOAuthState() {
  return randomBytes(24).toString("hex");
}

export function getTiendanubeAuthorizeUrl() {
  const config = getTiendanubeOAuthConfig();
  const url = new URL(`/apps/${config.clientId}/authorize`, config.authorizeBaseUrl);
  url.searchParams.set("redirect_uri", config.redirectUri);

  return {
    state: createTiendanubeOAuthState(),
    url,
  };
}

export function getTiendanubeRedirectUri() {
  return getTiendanubeOAuthConfig().redirectUri;
}

export async function exchangeCodeForToken(code: string) {
  const config = getTiendanubeOAuthConfig({ requireEncryptionSecret: true });
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Tiendanube token exchange failed with status ${response.status}.`);
  }

  return (await response.json()) as TiendanubeOAuthTokenResponse;
}

function getLocalizedValue(field: TiendanubeLocalizedField, mainLanguage?: string | null) {
  if (typeof field === "string") {
    return field;
  }

  if (!field) {
    return null;
  }

  if (mainLanguage && field[mainLanguage]) {
    return field[mainLanguage];
  }

  if (field.es) {
    return field.es;
  }

  if (field.pt) {
    return field.pt;
  }

  if (field.en) {
    return field.en;
  }

  return Object.values(field).find((value) => Boolean(value)) ?? null;
}

export async function fetchTiendanubeStoreMetadata(
  accessToken: string,
  storeId: string,
): Promise<TiendanubeStoreMetadata> {
  const url = new URL(`${getTiendanubeApiBaseUrl(storeId)}/store`);
  url.searchParams.set("fields", "name,country,main_currency,main_language");

  const response = await fetch(url, {
    headers: getTiendanubeApiHeaders(accessToken),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Tiendanube store metadata fetch failed with status ${response.status}.`);
  }

  const store = (await response.json()) as TiendanubeStoreResponse;

  return {
    country: store.country ?? null,
    currency: store.main_currency ?? null,
    name: getLocalizedValue(store.name ?? null, store.main_language),
  };
}

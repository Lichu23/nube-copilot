import { randomBytes } from "node:crypto";
import { getTiendanubeOAuthConfig } from "@/lib/env/tiendanube";
import type { TiendanubeOAuthTokenResponse } from "@/lib/tiendanube/types";

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

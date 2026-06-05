const DEFAULT_AUTHORIZE_BASE_URL = "https://www.tiendanube.com";
const DEFAULT_TOKEN_URL = "https://www.tiendanube.com/apps/authorize/token";
const OAUTH_CALLBACK_PATH = "/api/tiendanube/oauth/callback";

export type TiendanubeOAuthConfig = {
  authorizeBaseUrl: string;
  clientId: string;
  clientSecret: string;
  encryptionSecret?: string;
  redirectUri: string;
  tokenUrl: string;
};

function requireEnv(name: string, value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new Error(`${name} is not configured.`);
  }

  return trimmed;
}

function getAppBaseUrl() {
  const baseUrl = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  return new URL(baseUrl).toString().replace(/\/$/, "");
}

function getRedirectUri() {
  const explicitRedirectUri = process.env.TIENDANUBE_REDIRECT_URI?.trim();

  if (explicitRedirectUri) {
    return new URL(explicitRedirectUri).toString();
  }

  const appBaseUrl = getAppBaseUrl();

  if (!appBaseUrl) {
    throw new Error("TIENDANUBE_REDIRECT_URI or APP_URL/NEXT_PUBLIC_APP_URL is required.");
  }

  return new URL(OAUTH_CALLBACK_PATH, `${appBaseUrl}/`).toString();
}

export function getTiendanubeOAuthConfig(options?: { requireEncryptionSecret?: boolean }) {
  const encryptionSecret =
    process.env.TIENDANUBE_ENCRYPTION_SECRET?.trim() || process.env.APP_SECRET?.trim();

  if (options?.requireEncryptionSecret && !encryptionSecret) {
    throw new Error("TIENDANUBE_ENCRYPTION_SECRET or APP_SECRET is not configured.");
  }

  return {
    authorizeBaseUrl: process.env.TIENDANUBE_AUTHORIZE_BASE_URL?.trim() || DEFAULT_AUTHORIZE_BASE_URL,
    clientId: requireEnv("TIENDANUBE_CLIENT_ID", process.env.TIENDANUBE_CLIENT_ID),
    clientSecret: requireEnv("TIENDANUBE_CLIENT_SECRET", process.env.TIENDANUBE_CLIENT_SECRET),
    encryptionSecret,
    redirectUri: getRedirectUri(),
    tokenUrl: process.env.TIENDANUBE_TOKEN_URL?.trim() || DEFAULT_TOKEN_URL,
  } satisfies TiendanubeOAuthConfig;
}

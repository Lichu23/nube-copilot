import { NextRequest, NextResponse } from "next/server";
import { persistTiendanubeConnection } from "@/lib/db/client";
import { getTiendanubeOAuthConfig } from "@/lib/env/tiendanube";
import { encryptSecret } from "@/lib/security/encryption";
import {
  exchangeCodeForToken,
  fetchTiendanubeStoreMetadata,
  TIENDANUBE_OAUTH_STATE_COOKIE,
} from "@/lib/tiendanube/oauth";

function buildRedirectUrl(request: NextRequest, search: string) {
  return new URL(`/connect${search}`, request.url);
}

function buildSuccessRedirectUrl(request: NextRequest) {
  return new URL("/dashboard?sync=initial&autoSync=1", request.url);
}

function redirectWithStatus(request: NextRequest, status: "success" | "error", reason?: string) {
  const response = NextResponse.redirect(
    status === "success"
      ? buildSuccessRedirectUrl(request)
      : buildRedirectUrl(request, `?status=${status}&reason=${reason}`),
  );

  response.cookies.set({
    maxAge: 0,
    name: TIENDANUBE_OAUTH_STATE_COOKIE,
    path: "/",
    value: "",
  });

  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get(TIENDANUBE_OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return redirectWithStatus(request, "error", "state");
  }

  try {
    const config = getTiendanubeOAuthConfig({ requireEncryptionSecret: true });
    const token = await exchangeCodeForToken(code);
    const storeMetadata = await fetchTiendanubeStoreMetadata(token.access_token, token.user_id);

    await persistTiendanubeConnection({
      accessTokenEncrypted: encryptSecret(token.access_token, config.encryptionSecret!),
      ...storeMetadata,
      scopes: token.scope.split(",").map((scope) => scope.trim()).filter(Boolean),
      storeExternalId: token.user_id,
    });

    return redirectWithStatus(request, "success");
  } catch {
    return redirectWithStatus(request, "error", "exchange");
  }
}

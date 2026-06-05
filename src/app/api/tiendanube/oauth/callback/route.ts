import { NextRequest, NextResponse } from "next/server";
import { persistTiendanubeConnection } from "@/lib/db/client";
import { getTiendanubeOAuthConfig } from "@/lib/env/tiendanube";
import { encryptSecret } from "@/lib/security/encryption";
import { exchangeCodeForToken, TIENDANUBE_OAUTH_STATE_COOKIE } from "@/lib/tiendanube/oauth";

function buildRedirectUrl(request: NextRequest, search: string) {
  return new URL(`/connect${search}`, request.url);
}

function redirectWithStatus(request: NextRequest, status: "success" | "error", reason?: string) {
  const search = reason ? `?status=${status}&reason=${reason}` : `?status=${status}`;
  const response = NextResponse.redirect(buildRedirectUrl(request, search));

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

    await persistTiendanubeConnection({
      accessTokenEncrypted: encryptSecret(token.access_token, config.encryptionSecret!),
      scopes: token.scope.split(",").map((scope) => scope.trim()).filter(Boolean),
      storeExternalId: token.user_id,
    });

    return redirectWithStatus(request, "success");
  } catch {
    return redirectWithStatus(request, "error", "exchange");
  }
}

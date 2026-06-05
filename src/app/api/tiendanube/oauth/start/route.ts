import { NextRequest, NextResponse } from "next/server";
import { getTiendanubeOAuthConfig } from "@/lib/env/tiendanube";
import {
  getTiendanubeAuthorizeUrl,
  TIENDANUBE_OAUTH_STATE_COOKIE,
  TIENDANUBE_OAUTH_STATE_TTL_SECONDS,
} from "@/lib/tiendanube/oauth";

export async function GET(request: NextRequest) {
  try {
    getTiendanubeOAuthConfig();

    const { state, url } = getTiendanubeAuthorizeUrl();
    url.searchParams.set("state", state);

    const response = NextResponse.redirect(url);
    response.cookies.set({
      httpOnly: true,
      maxAge: TIENDANUBE_OAUTH_STATE_TTL_SECONDS,
      name: TIENDANUBE_OAUTH_STATE_COOKIE,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      value: state,
    });

    return response;
  } catch {
    return NextResponse.redirect(new URL("/connect?status=error&reason=config", request.url));
  }
}

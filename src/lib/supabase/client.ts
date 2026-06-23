"use client";

import { createBrowserClient } from "@supabase/ssr";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase env vars are not configured.");
  }

  return { key, url };
}

export function createSupabaseBrowserClient() {
  const { key, url } = getSupabaseConfig();
  return createBrowserClient(url, key);
}

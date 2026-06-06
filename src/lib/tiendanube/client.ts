export function getTiendanubeApiBaseUrl(storeId: string) {
  return `${process.env.TIENDANUBE_API_BASE_URL ?? "https://api.tiendanube.com/v1"}/${storeId}`;
}

export function getTiendanubeApiHeaders(accessToken: string) {
  const contactUrl = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

  return {
    Authentication: `bearer ${accessToken}`,
    "Content-Type": "application/json",
    "User-Agent": `Tiendanube AI Business Analyst (${contactUrl})`,
  };
}

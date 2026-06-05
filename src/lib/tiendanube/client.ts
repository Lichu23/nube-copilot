export function getTiendanubeApiBaseUrl(storeId: string) {
  return `${process.env.TIENDANUBE_API_BASE_URL ?? "https://api.tiendanube.com/v1"}/${storeId}`;
}

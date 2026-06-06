export type TiendanubeConnectionStatus = "active" | "uninstalled" | "error";

export type TiendanubeOAuthTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  user_id: string;
};

export type TiendanubeLocalizedField = string | Record<string, string | null> | null;

export type TiendanubeStoreResponse = {
  country?: string | null;
  main_currency?: string | null;
  main_language?: string | null;
  name?: TiendanubeLocalizedField;
};

export type TiendanubeStoreMetadata = {
  country?: string | null;
  currency?: string | null;
  name?: string | null;
};

export type TiendanubeProductVariantResponse = {
  id: number | string;
  inventory_levels?: Array<{
    location_id?: string;
    stock?: number | null;
  }> | null;
  price?: string | number | null;
  sku?: string | null;
  stock?: number | null;
};

export type TiendanubeProductResponse = {
  id: number | string;
  handle?: TiendanubeLocalizedField;
  name?: TiendanubeLocalizedField;
  published?: boolean | null;
  variants?: TiendanubeProductVariantResponse[] | null;
};

export type TiendanubeRateLimitInfo = {
  limit: number | null;
  remaining: number | null;
  resetMs: number | null;
};

export type TiendanubeProductSource = "v1" | "2025-03";

export function getLocalizedValue(
  field: TiendanubeLocalizedField,
  preferredLanguage?: string | null,
) {
  if (typeof field === "string") {
    return field;
  }

  if (!field) {
    return null;
  }

  if (preferredLanguage && field[preferredLanguage]) {
    return field[preferredLanguage];
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

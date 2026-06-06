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

export type TiendanubeCustomerResponse = {
  email?: string | null;
  id?: number | string | null;
  name?: string | null;
  phone?: string | null;
};

export type TiendanubeOrderProductResponse = {
  id: number | string;
  name?: string | null;
  price?: string | number | null;
  product_id?: number | string | null;
  quantity?: number | string | null;
  variant_id?: number | string | null;
};

export type TiendanubeOrderResponse = {
  cancelled_at?: string | null;
  contact_email?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  created_at?: string | null;
  currency?: string | null;
  customer?: TiendanubeCustomerResponse | null;
  id: number | string;
  number?: number | string | null;
  paid_at?: string | null;
  payment_status?: string | null;
  products?: TiendanubeOrderProductResponse[] | null;
  shipping_status?: string | null;
  status?: string | null;
  total?: string | number | null;
};

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

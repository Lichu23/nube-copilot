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

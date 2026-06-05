export type TiendanubeConnectionStatus = "active" | "uninstalled" | "error";

export type TiendanubeOAuthTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  user_id: string;
};

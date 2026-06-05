export function getTiendanubeAuthorizeUrl(appId: string, state: string) {
  return `https://www.tiendanube.com/apps/${appId}/authorize?state=${state}`;
}

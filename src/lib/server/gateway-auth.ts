import { getVercelOidcTokenSync } from "@vercel/oidc";

/** Checks credential availability; the Gateway SDK performs authentication. */
export function hasGatewayCredentials(): boolean {
  if (process.env.AI_GATEWAY_API_KEY) return true;
  try {
    // Functions receive OIDC through request context; local development uses an environment variable.
    return Boolean(getVercelOidcTokenSync());
  } catch {
    return false;
  }
}

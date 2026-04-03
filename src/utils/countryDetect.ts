const VALID_COUNTRIES = ["my", "sg", "id", "ph"];

/**
 * Extract country code from a NextRequest's headers.
 * Prefers x-country (set by middleware), falls back to host subdomain.
 */
export function getCountryFromRequest(request: { headers: { get: (name: string) => string | null } }): string {
  const xCountry = request.headers.get("x-country");
  if (xCountry && VALID_COUNTRIES.includes(xCountry)) return xCountry;
  const host = request.headers.get("host") || "";
  const subdomain = host.split(".")[0];
  return VALID_COUNTRIES.includes(subdomain) ? subdomain : "my";
}

/**
 * Extract country code on the client side from hostname subdomain.
 */
export function getClientCountry(): string {
  if (typeof window === "undefined") return "my";
  const subdomain = window.location.hostname.split(".")[0];
  return VALID_COUNTRIES.includes(subdomain) ? subdomain : "my";
}

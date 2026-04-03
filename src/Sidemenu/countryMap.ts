// src/Sidemenu/countryMap.ts
// Maps subdomain country codes to Sidemenu folder names
export const COUNTRY_MAP: Record<string, string> = {
  id: "Indonesia",
  my: "Malaysia",
  sg: "Singapore",
  ph: "Philippines",
};

export function getCountryFolder(countryCode: string): string {
  return COUNTRY_MAP[countryCode] || "Malaysia";
}

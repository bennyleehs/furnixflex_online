// src/context/CountryContext.tsx
"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import countriesData from "@/../public/data/countries.json";
import { getClientCountry } from "@/utils/countryDetect";
import { COUNTRY_MAP } from "@/Sidemenu/countryMap";

// ---- Types ----

interface State {
  name: string;
  cities: string[];
}

export interface CountryInfo {
  code: string; // e.g. "my"
  name: string; // e.g. "Malaysia"
  idd: string; // e.g. "+60"
  timeZone: string; // e.g. "GMT+8"
  currencyName: string; // e.g. "Malaysian Ringgit"
  currency: string; // e.g. "MYR"
  currencySymbol: string; // e.g. "RM"
  states: State[];
}

interface CountryContextType {
  country: CountryInfo;
  isLoading: boolean;
}

// ---- Default (Malaysia) ----

const DEFAULT_COUNTRY: CountryInfo = {
  code: "my",
  name: "Malaysia",
  idd: "+60",
  timeZone: "GMT+8",
  currencyName: "Malaysian Ringgit",
  currency: "MYR",
  currencySymbol: "RM",
  states: [],
};

// ---- Helpers ----

function resolveCountry(code: string): CountryInfo {
  const countryName = COUNTRY_MAP[code] || "Malaysia";
  const raw = (countriesData as any).countries.find(
    (c: any) => c.name === countryName,
  );
  if (!raw) return { ...DEFAULT_COUNTRY, code };
  return {
    code,
    name: raw.name,
    idd: raw.idd,
    timeZone: raw.time_zone,
    currencyName: raw.currency_name,
    currency: raw.currency,
    currencySymbol: raw.currency_symbol,
    states: raw.states || [],
  };
}

// ---- Context ----

const CountryContext = createContext<CountryContextType>({
  country: DEFAULT_COUNTRY,
  isLoading: true,
});

export function CountryProvider({ children }: { children: ReactNode }) {
  const [country, setCountry] = useState<CountryInfo>(DEFAULT_COUNTRY);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const code = getClientCountry(); // reads subdomain
    setCountry(resolveCountry(code));
    setIsLoading(false);
  }, []);

  return (
    <CountryContext.Provider value={{ country, isLoading }}>
      {children}
    </CountryContext.Provider>
  );
}

/** Hook to access country info from any client component. */
export function useCountry(): CountryContextType {
  return useContext(CountryContext);
}

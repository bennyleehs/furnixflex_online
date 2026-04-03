//pool connection - multi-country support via subdomain
import mysql from "mysql2/promise";
import { headers } from "next/headers";

const pools: Record<string, mysql.Pool> = {};

const countryDbConfig: Record<string, { database: string; user: string; password: string }> = {
  my: {
    database: process.env.DATABASE_NAME_MY || "classy_my",
    user: process.env.DATABASE_USER_MY || "root",
    password: process.env.DATABASE_PASSWORD_MY || "",
  },
  sg: {
    database: process.env.DATABASE_NAME_SG || "classy_sg",
    user: process.env.DATABASE_USER_SG || "root",
    password: process.env.DATABASE_PASSWORD_SG || "",
  },
  id: {
    database: process.env.DATABASE_NAME_ID || "classy_id",
    user: process.env.DATABASE_USER_ID || "root",
    password: process.env.DATABASE_PASSWORD_ID || "",
  },
  ph: {
    database: process.env.DATABASE_NAME_PH || "classy_ph",
    user: process.env.DATABASE_USER_PH || "root",
    password: process.env.DATABASE_PASSWORD_PH || "",
  },
};

export function createPool(country?: string): mysql.Pool {
  const key = country && countryDbConfig[country] ? country : "my";

  if (!pools[key]) {
    const config = countryDbConfig[key];
    pools[key] = mysql.createPool({
      host: process.env.DATABASE_HOST,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  return pools[key];
}

export async function getPool(): Promise<mysql.Pool> {
  let country = "my";
  try {
    const h = await headers();
    const xCountry = h.get("x-country");
    if (xCountry) {
      country = xCountry;
    } else {
      // Fallback: detect from host header (for routes excluded from middleware, e.g. api/auth)
      const host = h.get("host") || "";
      const subdomain = host.split(".")[0];
      const validCountries = ["my", "sg", "id", "ph"];
      if (validCountries.includes(subdomain)) {
        country = subdomain;
      }
    }
  } catch {
    // headers() not available outside request context, fallback to "my"
  }
  return createPool(country);
}

export function connect() {
  throw new Error('Function not implemented.');
}

export function execute(arg0: string, arg1: string[]): [any] | PromiseLike<[any]> {
  throw new Error('Function not implemented.');
}

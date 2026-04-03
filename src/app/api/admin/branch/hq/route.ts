import { getPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { NextRequest, NextResponse } from "next/server";
import { getCountryFromRequest } from "@/utils/countryDetect";
import { COUNTRY_MAP } from "@/Sidemenu/countryMap";

export async function GET(req: NextRequest) {
  try {
    const db = await getPool();
    const countryCode = getCountryFromRequest(req);
    const countryName = COUNTRY_MAP[countryCode] || "Malaysia";

    const sql = `
      SELECT
        id, name, ref, idd, phone, email,
        address_line1, address_line2, postcode,
        city, state, country,
        company_name, company_reg,
        bank_name, bank_account, bank_swift,
        time_zone, currencies_code, currencies_symbol,
        status
      FROM branches
      WHERE status = 'HQ' AND country = ?
      LIMIT 1
    `;

    const [rows] = await db.query<RowDataPacket[]>(sql, [countryName]);

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "No HQ branch found for this country" },
        { status: 404 },
      );
    }

    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error("Error fetching HQ branch:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

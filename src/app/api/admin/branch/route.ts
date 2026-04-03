import { getPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/authMiddleware";

async function handler(req: AuthenticatedRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    const db = await getPool();

    let sql = `
      SELECT  
              id,
              name,
              ref,
              idd,
              phone,
              email,
              address_line1,
              address_line2,
              postcode,
              city,
              state,
              country,
              company_name,
              company_reg,
              bank_name,
              bank_account,
              bank_swift,
              time_zone,
              currencies_code,
              currencies_symbol,
              status
      FROM branches
    `;

    if (id) {
      sql += ` WHERE id = ?`;
    }

    // Execute the query
    const [rows] = id
      ? await db.query<RowDataPacket[]>(sql, [id])
      : await db.query<RowDataPacket[]>(sql);

    if (id && rows.length === 0) {
      return NextResponse.json(
        { message: "Branch not found" },
        { status: 404 },
      );
    }

    // Return the raw rows directly
    return NextResponse.json(id ? rows[0] : { listBranch: rows }, {
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching branches:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Export the route handler with authentication middleware
export const GET = withAuth(handler, ["1.0.1", "1.0.2", "1.0.3", "1.0.4", "1.1.1", "1.1.2", "1.1.3", "1.1.4"]);

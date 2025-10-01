import { createPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    //v1.2 -gemini
    const searchParams = request.nextUrl.searchParams;
    const salesUid = searchParams.get("salesUid") || null; // <--- Get the salesUid parameter

    const db = createPool();

    //base variable - WHERE clause
    let whereClause = "WHERE deptName = 'Sales' AND u.status = 'Active'";
    const params: any[] = [];

    // Apply filtering based on salesUid if it exists
    if (salesUid) {
      // Add the UID filter to the WHERE clause
      whereClause += " AND u.uid = ?";
      params.push(salesUid);
    }

    // Construct the SQL query with dynamic WHERE clause
    const sql = `
      SELECT
        u.id,
        u.uid,
        u.name,
        u.status,
        u.deptName,
        (
          SELECT COUNT(*) 
          FROM customers 
          WHERE sales_id = u.id AND status NOT IN ('Job Done', 'Over Budget', 'Drop Interest')
        ) as task_count
      FROM users u
      ${whereClause}
      ORDER BY task_count ASC
    `;

    const [rows] = await db.query<RowDataPacket[]>(sql,params);
    return NextResponse.json(
      {
        employees: rows,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching sales personnel:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch sales personnel",
        error: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

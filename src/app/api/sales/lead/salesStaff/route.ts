import { createPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const db = createPool();

    const sql = `
      SELECT
        u.id,
        u.uid,
        u.name,
        u.status,
        d.name as department_name,
        (
          SELECT COUNT(*) 
          FROM customers1 
          WHERE sales_id = u.id AND status NOT IN ('Job Done', 'Over Budget', 'Drop Interest')
        ) as task_count
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE d.name = 'Sales' AND u.status = "Active"
      ORDER BY task_count ASC
    `;

    // Execute the query
    const [rows] = await db.query<RowDataPacket[]>(sql);

    // Return the formatted response
    return NextResponse.json(
      { 
        employees: rows 
      }, 
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching sales personnel:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch sales personnel",
        error: (error as Error).message 
      }, 
      { status: 500 }
    );
  }
}
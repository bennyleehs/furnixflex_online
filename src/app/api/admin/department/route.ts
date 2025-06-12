import { createPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    const db = createPool();

    let sql = `
        SELECT  
          id, name, ref, status
        FROM departments
    `;

    if (id) {
      sql += ` WHERE id = ?`;
    }

    // Execute the query
    const [rows] = id ? await db.query<RowDataPacket[]>(sql, [id]) : await db.query<RowDataPacket[]>(sql);

    if (id && rows.length === 0) {
      return NextResponse.json({ message: "Department not found" }, { status: 404 });
    }

    // Return the raw rows directly
    return NextResponse.json(id ? rows[0] : { listDepartment: rows }, { status: 200 });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

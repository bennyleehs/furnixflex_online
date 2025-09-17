import { createPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const uid = searchParams.get("uid"); // Add support for uId parameter

  try {
    const db = createPool();

    let sql = `
      SELECT  
        id, uid, name, nric,
        email, phone,
        address_line1, address_line2, postcode,
        city, state, country,
        bank_name, bank_account,
        branchName, deptName, roleName, 
        status
      FROM users
    `;

    // Add WHERE clause based on whether we have an ID or UID
    if (id) {
      sql += ` WHERE id = ?`;
    } else if (uid) {
      sql += ` WHERE uid = ?`;
    } else {
      // When listing all employees, exclude Superadmin
      sql += ` WHERE name != 'SUPERADMIN'`;
    }

    // Execute the query with the appropriate parameter
    const [rows] = id 
      ? await db.query<RowDataPacket[]>(sql, [id])
      : uid 
        ? await db.query<RowDataPacket[]>(sql, [uid])
        : await db.query<RowDataPacket[]>(sql);

    // Check if specific employee was requested but not found
    if ((id || uid) && rows.length === 0) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 },
      );
    }

    // Return the raw rows directly
    return NextResponse.json(id || uid ? rows[0] : { listEmployee: rows }, {
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
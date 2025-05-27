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
        users1.id, users1.uid,
        branches2.name as branch, 
        departments.name as department, 
        roles1.name AS role,
        users1.name, users1.nric,
        users1.email, users1.phone,
        users1.address_line1, users1.address_line2, users1.postcode,
        users1.city, users1.state, users1.country,
        users1.bank_name, users1.bank_account,
        users1.status
      FROM users1
        LEFT JOIN branches2 ON branches2.ref = users1.branchRef
        LEFT JOIN departments ON departments.name = users1.deptName
        LEFT JOIN roles1 ON roles1.name = users1.roleName
    `;

    // Add WHERE clause based on whether we have an ID
    if (id) {
      sql += ` WHERE users1.id = ?`;
    } else {
      // When listing all roles, exclude Superadmin
      sql += ` WHERE users1.name != 'SUPERADMIN'`;
    }

    // Execute the query
    const [rows] = id
      ? await db.query<RowDataPacket[]>(sql, [id])
      : await db.query<RowDataPacket[]>(sql);

    if (id && rows.length === 0) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 },
      );
    }

    // Return the raw rows directly
    return NextResponse.json(id ? rows[0] : { listEmployee: rows }, {
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

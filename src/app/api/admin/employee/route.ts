import { createPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/authMiddleware";

async function handler(req: AuthenticatedRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    const db = createPool();

    let sql = `
      SELECT  
        users.id, users.uid,
        branches.name as branch, 
        departments.name as department, 
        roles.name AS role,
        users.name, users.nric,
        users.email, users.phone,
        users.address_line1, users.address_line2, users.postcode,
        users.city, users.state, users.country,
        users.bank_name, users.bank_account,
        users.status
      FROM users
        LEFT JOIN branches ON branches.ref = users.branchRef
        LEFT JOIN departments ON departments.name = users.deptName
        LEFT JOIN roles ON roles.name = users.roleName
    `;

    // Add WHERE clause based on whether we have an ID
    if (id) {
      sql += ` WHERE users.id = ?`;
    } else {
      // When listing all roles, exclude Superadmin
      sql += ` WHERE users.name != 'SUPERADMIN'`;
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

// Export the route handler with authentication middleware
export const GET = withAuth(handler, [
  "1.0.1",
  "1.0.2",
  "1.0.3",
  "1.0.4",
  "1.4.1",
  "1.4.2",
  "1.4.3",
  "1.4.4",
]);

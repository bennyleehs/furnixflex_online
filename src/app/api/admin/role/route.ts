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
          id, name, status
        FROM roles
    `;

    // Add WHERE clause based on whether we have an ID
    if (id) {
      sql += ` WHERE id = ?`;
    } else {
      // When listing all roles, exclude Superadmin
      sql += ` WHERE name != 'Superadmin'`;
    }

    // Execute the query
    const [rows] = id ? await db.query<RowDataPacket[]>(sql, [id]) : await db.query<RowDataPacket[]>(sql);

    if (id && rows.length === 0) {
      return NextResponse.json({ message: "Role not found" }, { status: 404 });
    }

    // Return the raw rows directly
    return NextResponse.json(id ? rows[0] : { listRole: rows }, { status: 200 });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Export the route handler with authentication middleware
export const GET = withAuth(handler, [
  "1.0.1",
  "1.0.2",
  "1.0.3",
  "1.0.4",
  "1.3.1",
  "1.3.2",
  "1.3.3",
  "1.3.4",
])
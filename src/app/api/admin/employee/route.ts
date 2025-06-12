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
        id, uid, name, nric,
        email, phone,
        address_line1, address_line2, postcode,
        city, state, country,
        bank_name, bank_account,
        branchName, deptName, roleName, 
        status
      FROM users
    `;

    // Add WHERE clause based on whether we have an ID
    if (id) {
      sql += ` WHERE id = ?`;
    } else {
      // When listing all roles, exclude Superadmin
      sql += ` WHERE name != 'SUPERADMIN'`;
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

// PUT function with LEFT JOINs removed
export async function PUT(req: NextRequest) {
  try {
    // Parse the request body
    const data = await req.json();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "Employee ID is required" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!data.uid || !data.name) {
      return NextResponse.json(
        { message: "UID and name are required fields" },
        { status: 400 }
      );
    }

    // Create the database connection
    const db = createPool();

    // Construct the SQL update statement
    const sql = `
      UPDATE users
      SET 
        uid = ?,
        name = ?,
        nric = ?,
        phone = ?,
        email = ?,
        address_line1 = ?,
        address_line2 = ?,
        city = ?,
        state = ?,
        country = ?,
        bank_name = ?,
        bank_account = ?,
        branchRef = ?,
        branchName = ?,
        deptName = ?,
        roleName = ?,
        status = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    // Execute the update query
    const [result] = await db.query(sql, [
      data.uid,
      data.name,
      data.nric || null,
      data.phone || null,
      data.email || null,
      data.address_line1 || null,
      data.address_line2 || null,
      data.city || null,
      data.state || null,
      data.country || null,
      data.bank_name || null,
      data.bank_account || null,
      data.branchRef || null,
      data.branch || null,         // Changed from branchRef to data.branch directly
      data.department || null,
      data.role || null,
      data.status || 'Active',
      id
    ]);

    // Check if the employee was updated
    const resultObj = result as any;
    if (resultObj.affectedRows === 0) {
      return NextResponse.json(
        { message: "Employee not found or no changes made" },
        { status: 404 }
      );
    }

    // Fetch the updated employee to return - update column name to branchName
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT  
        id, uid, name, nric,
        email, phone,
        address_line1, address_line2, postcode,
        city, state, country,
        bank_name, bank_account,
        branchName, deptName, roleName, 
        status
      FROM users
      WHERE id = ?`,
      [id]
    );

    return NextResponse.json(
      { 
        message: "Employee updated successfully", 
        employee: rows[0] 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { message: "Failed to update employee", error: (error as Error).message },
      { status: 500 }
    );
  }
}

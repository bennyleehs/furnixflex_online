import { createPool } from "@/lib/db";
import { NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2/promise"; // Import from mysql2/promise
import { regenerateAccessControl } from "@/lib/regenAccessControl";

export async function POST(request: Request) {
  try {
    const formData = await request.json(); // Parse the JSON body
    const db = createPool();

    const sql = `
      INSERT INTO roles1 (
        name, status,
        created_at, updated_at
      )
      VALUES (
        ?, ?, 
        NOW(), NOW()
      )`;

    const values = [formData["name"], formData["status"]];

    await db.query(sql, values);
    //regenerate the access_control.json
    await regenerateAccessControl();

    return NextResponse.json({
      success: true,
      message: "Role created successfully",
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url); // Parse the request URL
    const id = url.searchParams.get("id"); // Extract the `id` from the query parameters

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Role ID is required for update" },
        { status: 400 },
      );
    }

    const formData = await request.json(); // Parse the JSON body
    const db = createPool();

    const sql = `
      UPDATE roles1
      SET
        name = ?, status = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    const values = [
      formData["name"],
      formData["status"],
      id, // Use the `id` from the URL
    ];

    const [result] = await db.query<ResultSetHeader>(sql, values);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: "Role not found or no changes made" },
        { status: 404 },
      );
    }
    
    //regenerate the access_control.json
    await regenerateAccessControl();

    return NextResponse.json({
      success: true,
      message: "Role updated successfully",
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 },
    );
  }
}

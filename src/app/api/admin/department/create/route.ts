import { createPool } from "@/lib/db";
import { NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2/promise"; // Import from mysql2/promise
import { regenerateAccessControl } from "@/lib/regenAccessControl";

export async function POST(request: Request) {
  try {
    const formData = await request.json(); // Parse the JSON body
    const db = createPool();

    const sql = `
      INSERT INTO departments (
        name, ref, status,
        created_at, updated_at
      )
      VALUES (
        ?, ?, ?, 
        NOW(), NOW()
      )`;

    const values = [formData["name"], formData["ref"], formData["status"]];

    await db.query(sql, values);
    //regenerate the access_control.json
    await regenerateAccessControl();

    return NextResponse.json({
      success: true,
      message: "Department created successfully",
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
        { success: false, error: "Department ID is required for update" },
        { status: 400 },
      );
    }

    const formData = await request.json(); // Parse the JSON body
    const db = createPool();

    const sql = `
      UPDATE departments
      SET
        name = ?, ref = ?, status = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    const values = [
      formData["name"],
      formData["ref"],
      formData["status"],
      id, // Use the `id` from the URL
    ];

    const [result] = await db.query<ResultSetHeader>(sql, values);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: "Branch not found or no changes made" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Branch updated successfully",
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 },
    );
  }
}

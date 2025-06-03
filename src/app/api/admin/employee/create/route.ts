import { createPool } from "@/lib/db";
import { NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2/promise"; // Import from mysql2/promise
import { withAuth, AuthenticatedRequest } from "@/lib/authMiddleware";

async function handlePost(req: AuthenticatedRequest) {
  try {
    const formData = await req.json(); // Parse the JSON body
    const db = createPool();

    const sql = `
      INSERT INTO users (
        name, nric,
        phone, email,
        address_line1, address_line2,
        postcode, city, state, country,
        branchRef, deptName, roleName,
        bank_name, bank_account,
        uid,
        status,
        created_at, updated_at
      )
      VALUES (
        ?, ?, 
        ?, ?, 
        ?, ?,
        ?, ?, ?, ?, 
        ?, ?, ?, 
        ?, ?, 
        ?, 
        ?, 
        NOW(), NOW()
      )`;

    const values = [
      formData["name"],
      formData["nric"],
      formData["phone"],
      formData["email"],
      formData["address_line1"],
      formData["address_line2"],
      formData["postcode"],
      formData["city"],
      formData["state"],
      formData["country"],
      formData["branchRef"],
      formData["deptName"],
      formData["roleName"],
      formData["bank_name"],
      formData["bank_account"],
      formData["uid"],
      formData["status"],
      formData["created_at"],
      formData["updated_at"],
    ];

    await db.query(sql, values);

    return NextResponse.json({
      success: true,
      message: "Branch created successfully",
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 },
    );
  }
}

async function handlePut(req: AuthenticatedRequest) {
  try {
    const url = new URL(req.url); // Parse the request URL
    const id = url.searchParams.get("id"); // Extract the `id` from the query parameters

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Employee ID is required for update" },
        { status: 400 },
      );
    }

    const formData = await req.json(); // Parse the JSON body
    const db = createPool();

    const sql = `
      UPDATE users
      SET
        name = ?, nric = ?,
        phone = ?, email = ?,
        address_line1 = ?, address_line2 = ?,
        postcode = ?, city = ?, state = ?, country = ?,
        bank_name = ?, bank_account = ?,
        branchRef = ?, deptName = ?, roleName = ?,
        uid = ?,
        status = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    const values = [
      formData["name"],
      formData["nric"],
      formData["phone"],
      formData["email"],
      formData["address_line1"],
      formData["address_line2"],
      formData["postcode"],
      formData["city"],
      formData["state"],
      formData["country"],
      formData["bank_name"],
      formData["bank_account"],
      formData["branchRef"],
      formData["deptName"],
      formData["roleName"],
      formData["uid"],
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

// Export the route handlers with authentication and required permissions
export const POST = withAuth(handlePost, [
  "1.0.1",
  "1.0.2",
  "1.0.3",
  "1.4.1",
  "1.4.2",
  "1.4.3",
]);
export const PUT = withAuth(handlePut, ["1.0.1", "1.0.2", "1.4.1", "1.4.2"]);

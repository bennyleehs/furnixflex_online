import { getPool } from "@/lib/db";
import { NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2/promise"; // Import from mysql2/promise
import { regenerateAccessControl } from "@/lib/regenAccessControl";
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';

async function handlePost(req: AuthenticatedRequest) {
  try {
    const formData = await req.json(); // Parse the JSON body
    const db = await getPool();

    const sql = `
      INSERT INTO branches (
        name, ref,
        idd, phone, email,
        address_line1, address_line2,
        postcode, city, state, country,
        company_name, company_reg,
        bank_name, bank_account, bank_swift,
        time_zone, currencies_code, currencies_symbol,
        status,
        created_at, updated_at
      )
      VALUES (
        ?, ?, 
        ?, ?, ?, 
        ?, ?,
        ?, ?, ?, ?, 
        ?, ?,
        ?, ?, ?, 
        ?, ?, ?, 
        ?, 
        NOW(), NOW()
      )`;

    const values = [
      formData["name"],
      formData["ref"],
      formData["idd"],
      formData["phone"],
      formData["email"],
      formData["address_line1"],
      formData["address_line2"],
      formData["postcode"],
      formData["city"],
      formData["state"],
      formData["country"],
      formData["company_name"],
      formData["company_reg"],
      formData["bank_name"],
      formData["bank_account"],
      formData["bank_swift"],
      formData["time_zone"],
      formData["currencies_code"],
      formData["currencies_symbol"],
      formData["status"],
    ];

    await db.query(sql, values);
    //regenerate the access_control.json
    const country = req.headers.get("x-country") || "my";
    await regenerateAccessControl(country);

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
    const id = url.searchParams.get('id'); // Extract the `id` from the query parameters

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Branch ID is required for update" },
        { status: 400 },
      );
    }

    const formData = await req.json(); // Parse the JSON body
    const db = await getPool();

    const sql = `
      UPDATE branches
      SET
        name = ?, ref = ?,
        idd = ?, phone = ?, email = ?,
        address_line1 = ?, address_line2 = ?,
        postcode = ?, city = ?, state = ?, country = ?,
        company_name = ?, company_reg = ?,
        bank_name = ?, bank_account = ?, bank_swift = ?,
        time_zone = ?, currencies_code = ?, currencies_symbol = ?,
        status = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    const values = [
      formData["name"],
      formData["ref"],
      formData["idd"],
      formData["phone"],
      formData["email"],
      formData["address_line1"],
      formData["address_line2"],
      formData["postcode"],
      formData["city"],
      formData["state"],
      formData["country"],
      formData["company_name"],
      formData["company_reg"],
      formData["bank_name"],
      formData["bank_account"],
      formData["bank_swift"],
      formData["time_zone"],
      formData["currencies_code"],
      formData["currencies_symbol"],
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

    //regenerate the access_control.json
    const countryCode = req.headers.get("x-country") || "my";
    await regenerateAccessControl(countryCode);

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
export const POST = withAuth(handlePost,  ["1.0.3","1.1.3"]);
export const PUT = withAuth(handlePut,  ["1.0.2","1.1.2"]);

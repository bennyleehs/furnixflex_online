import { createPool } from "@/lib/db";
import { NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2/promise"; // Import from mysql2/promise
import { regenerateAccessControl } from "@/lib/regenAccessControl";

export async function POST(request: Request) {
  try {
    const formData = await request.json(); // Parse the JSON body
    const db = createPool();

    const sql = `
      INSERT INTO branches2 (
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
    await regenerateAccessControl();

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

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url); // Parse the request URL
    const id = url.searchParams.get("id"); // Extract the `id` from the query parameters

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Branch ID is required for update" },
        { status: 400 },
      );
    }

    const formData = await request.json(); // Parse the JSON body
    const db = createPool();

    const sql = `
      UPDATE branches2
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

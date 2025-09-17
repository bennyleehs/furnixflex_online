// src/app/api/sales-stats/sales-conversion/route.ts
import { createPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const db = createPool();

  // Get the UID, month, and year from URL search parameters
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid");
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  if (!uid || !month || !year) {
    return NextResponse.json(
      { error: "User ID (UID), month, and year are required." },
      { status: 400 },
    );
  }

  try {
    // Find the user ID based on the UID
    const [userRows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE uid = ?",
      [uid],
    );

    if (!userRows || userRows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = userRows[0].id;
    const salesId = userId;

    // Construct the start and end dates for the month
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 1);

    // Convert dates to a format suitable for MySQL
    const startDateFormat = startDate.toISOString().slice(0, 19).replace("T", " ");
    const endDateFormat = endDate.toISOString().slice(0, 19).replace("T", " ");

    const query = `
      SELECT
        SUM(CASE WHEN status = 'Quotation' THEN 1 ELSE 0 END) as quotationLeads,
        SUM(CASE WHEN status = 'Payment' THEN 1 ELSE 0 END) as paymentLeads
      FROM customers
      WHERE
        sales_id = ?
        AND created_at >= ?
        AND created_at < ?;
    `;

    const [results] = await db.query<RowDataPacket[]>(query, [
      salesId,
      startDateFormat,
      endDateFormat,
    ]);

    // The results object will contain the counts
    const data = results[0];

    return NextResponse.json(
      {
        quotationLeads: data.quotationLeads,
        paymentLeads: data.paymentLeads,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Database query failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads data." },
      { status: 500 },
    );
  }
}
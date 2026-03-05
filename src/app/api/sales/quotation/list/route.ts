import { NextResponse } from "next/server";
import { createPool } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);

  // Parse query parameters
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "10");
  const search = url.searchParams.get("search") || "";
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const status = url.searchParams.get("status") || "";
  const salesRep = url.searchParams.get("salesRep") || "";

  // Calculate offset for pagination
  const offset = (page - 1) * pageSize;

  try {
    const pool = createPool();

    // Build the WHERE clause for filtering
    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push(
        `(quotation_number LIKE ? OR customer_name LIKE ? OR customer_contact LIKE ?)`,
      );
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (from) {
      whereConditions.push(`created_at >= ?`);
      queryParams.push(from + " 00:00:00"); // start of day | very beginning of the "from" day
    }

    if (to) {
      whereConditions.push(`created_at <= ?`);
      queryParams.push(`${to} 23:59:59`); // end of day | very last second of the "to" day
    }

    if (status && status !== "all") {
      whereConditions.push(`status = ?`);
      queryParams.push(status);
    }

    if (salesRep) {
      whereConditions.push(`sales_representative = ?`);
      queryParams.push(salesRep);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Query for total count (for pagination)
    const [countResult] = (await pool.query(
      `SELECT COUNT(*) as total FROM quotations ${whereClause}`,
      queryParams,
    )) as [any[], any];

    const total = countResult[0].total;

    // Query for paginated list
    const [quotationRows] = (await pool.query(
      `SELECT 
        q.id, q.task_id, q.quote_ref, q.quotation_number,
        q.customer_name, q.customer_contact, q.customer_email, q.customer_address,
        q.quotation_date, q.valid_until, q.installation_date,
        q.sales_representative, q.sales_uid,
        q.subtotal, q.tax, q.total, 
        q.notes, q.terms, q.status, q.created_at, q.updated_at,

      COALESCE(
        ( SELECT SUM(p.amount_inv)
          FROM payments p
          WHERE p.quotation_number = q.quotation_number
          AND p.received = 1
        ), 0
      ) as paid,

      q.total - COALESCE(
        ( SELECT SUM(p.amount_inv)
          FROM payments p
          WHERE p.quotation_number = q.quotation_number
          AND p.received = 1
        ), 0
      ) as balance,

      COALESCE(
        ( SELECT COUNT(p.id)
          FROM payments p
          WHERE p.quotation_number = q.quotation_number
          AND p.received = 1
        ), 0
      ) as payment_count,

      COALESCE(
        ( SELECT COUNT(p.id)
          FROM payments p
          WHERE p.quotation_number = q.quotation_number
          AND p.received = 1
        ),0
      ) as received_payment_count
       
      FROM quotations q
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
      [...queryParams, pageSize, offset],
    )) as [any[], any];

    // Get unique sales representatives for the filter dropdown
    const [salesRepsRows] = (await pool.query(
      `SELECT DISTINCT sales_representative FROM quotations WHERE sales_representative != '' ORDER BY sales_representative`,
    )) as [any[], any];

    const salesReps = salesRepsRows.map((row) => row.sales_representative);

    return NextResponse.json({
      quotations: quotationRows,
      total,
      salesReps,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching quotations:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotations" },
      { status: 500 },
    );
  }
}

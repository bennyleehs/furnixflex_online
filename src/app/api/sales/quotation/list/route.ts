import { NextResponse } from "next/server";
import { createPool } from "@/lib/db";

// Initialize the pool outside the request handler to reuse connections across requests
const pool = createPool();

// Define privileged roles as a Set for faster O(1) lookups
const PRIVILEGED_ROLES = new Set([
  "Director",
  "Manager",
  "Assistant Manager",
  "Supervisor",
  "Superadmin",
]);

export async function GET(request: Request) {
  const url = new URL(request.url);

  // Pagination
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "10");
  const offset = (page - 1) * pageSize;

  // Filters
  const search = url.searchParams.get("search") || "";
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const status = url.searchParams.get("status") || "";
  const salesRep = url.searchParams.get("salesRep") || "";

  // User access control
  const userUid = url.searchParams.get("userUid") || "";
  const userRole = url.searchParams.get("userRole") || "";
  const canSeeAll = PRIVILEGED_ROLES.has(userRole);

  try {
    const whereConditions: string[] = [];
    const queryParams: any[] = [];

    // 1. Access control
    if (!canSeeAll) {
      if (!userUid) {
        // No UID provided – return empty result immediately
        return NextResponse.json({
          quotations: [],
          total: 0,
          salesReps: [],
          page,
          pageSize,
          totalPages: 0,
        });
      }
      whereConditions.push("q.sales_uid = ?");
      queryParams.push(userUid);
    }

    // 2. Search
    if (search) {
      whereConditions.push(
        `(q.quotation_number LIKE ? OR q.customer_name LIKE ? OR q.customer_contact LIKE ?)`,
      );
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    // 3. Date range
    if (from) {
      whereConditions.push("q.created_at >= ?");
      queryParams.push(from + " 00:00:00");
    }
    if (to) {
      whereConditions.push("q.created_at <= ?");
      queryParams.push(`${to} 23:59:59`);
    }

    // 4. Status
    if (status && status !== "all") {
      whereConditions.push("q.status = ?");
      queryParams.push(status);
    }

    // 5. Sales representative
    if (salesRep) {
      whereConditions.push("q.sales_representative = ?");
      queryParams.push(salesRep);
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    // Sales representatives dropdown filters
    const salesRepsWhereConditions: string[] = [];
    const salesRepsParams: any[] = [];

    if (!canSeeAll && userUid) {
      salesRepsWhereConditions.push("sales_uid = ?");
      salesRepsParams.push(userUid);
    }

    // Always exclude empty sales_representative
    salesRepsWhereConditions.push("sales_representative != ''");

    const salesRepsWhereClause =
      salesRepsWhereConditions.length > 0
        ? "WHERE " + salesRepsWhereConditions.join(" AND ")
        : "";

    // use Promise.all to run these three independent queries at the same time
    const [countResultTuple, quotationRowsTuple, salesRepsRowsTuple] =
      await Promise.all([
        // Query 1: Total Count
        pool.query(
          `SELECT COUNT(*) as total FROM quotations q ${whereClause}`,
          queryParams,
        ),

        // Query 2: Paginated Data
        pool.query(
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
              WHERE p.quotation_number = q.quotation_number AND p.received = 1
            ), 0
          ) as paid,
          COALESCE(
            ( SELECT COUNT(p.id)
              FROM payments p
              WHERE p.quotation_number = q.quotation_number
            ), 0
          ) as payment_count,
          COALESCE(
            ( SELECT COUNT(p.id)
              FROM payments p
              WHERE p.quotation_number = q.quotation_number AND p.received = 1
            ), 0
          ) as received_payment_count
        FROM quotations q
        ${whereClause}
        ORDER BY q.created_at DESC
        LIMIT ? OFFSET ?`,
          [...queryParams, pageSize, offset],
        ),

        // Query 3: Sales Reps Dropdown
        pool.query(
          `SELECT DISTINCT sales_representative 
         FROM quotations 
         ${salesRepsWhereClause} 
         ORDER BY sales_representative`,
          salesRepsParams,
        ),
      ]);

    // Extracting data from the returned tuples
    const countResult = countResultTuple[0] as any[];
    const quotationRows = quotationRowsTuple[0] as any[];
    const salesRepsRows = salesRepsRowsTuple[0] as any[];

    const total = countResult[0].total;
    const salesReps = salesRepsRows.map((row) => row.sales_representative);

    // Calculate balance in JavaScript to save database processing power
    const formattedQuotations = quotationRows.map((q) => ({
      ...q,
      balance: q.total - q.paid,
    }));

    // ---------- Return Results ----------
    return NextResponse.json({
      quotations: formattedQuotations,
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

import { createPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get parameters from URL query
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10";
    const status = searchParams.get("status") || null;
    const search = searchParams.get("search") || null;
    const id = searchParams.get("id") || null;
    const salesUid = searchParams.get("salesUid") || null; // <--- Get the new parameter

    const db = createPool();

    // Build WHERE clause
    let whereClause = "";
    const params: any[] = []; // KEEP THIS DECLARATION

    //v1.2 -gemini
    // If ID is provided, we prioritize it and ignore other filters
    if (id) {
      whereClause = "WHERE c.id = ?";
      params.push(id);
    }

    // Apply salesUid filter first
    if (salesUid) {
      whereClause = "WHERE u.uid = ?"; // Filter by sales person's UID
      params.push(salesUid);
    }

    // Apply 'status filter logic' (check if whereClause exists)
    if (status && status !== "All") {
      whereClause = whereClause
        ? `${whereClause} AND c.status = ?` // Append if salesUid is present
        : "WHERE c.status = ?"; // Start new if salesUid is not present
      params.push(status);
    }

    // Add 'search filter logic' condition to WHERE clause
    if (search) {
      // If already have a WHERE clause, add AND
      whereClause = whereClause ? `${whereClause} AND (` : "WHERE (";

      // Define searchable fields
      const searchFields = [
        "c.name",
        "c.nric",
        "c.phone1",
        "c.phone2",
        "c.email",
        "c.source",
        "c.address_line1",
        "c.address_line2",
        "c.city",
        "c.state",
        "c.country",
        "c.property",
        "c.guard",
        "c.interested",
        "c.add_info",
        "c.created_at",
        "u.name",
      ];

      // Build search conditions
      whereClause += searchFields
        .map((field) => `${field} LIKE ?`)
        .join(" OR ");
      whereClause += ")";

      // Add search parameter for each field
      const searchPattern = `%${search}%`;
      searchFields.forEach(() => params.push(searchPattern));
    }

    // === START: Logic for the 'status count query' (statusCountSql) ===
    // Only need the salesUid filter here, NOT the status or search filter.
    let statusCountWhereClause = "";
    const statusCountParams: any[] = [];

    if (salesUid) {
      statusCountWhereClause = "WHERE u.uid = ?";
      statusCountParams.push(salesUid);
    }
    // === END: Logic for the status count query ===

    // Calculate LIMIT and OFFSET values for pagination
    const limitValue = parseInt(limit);
    const offsetValue = (parseInt(page) - 1) * limitValue;

    // Query to fetch lead data
    const dataSql = `
        SELECT
            c.*,
            u.name AS sales_name, 
            u.uid AS sales_uid,
            u1.name AS assigned_name,
            c.assigned_by
        FROM customers c
        LEFT JOIN users u ON c.sales_id = u.id
        LEFT JOIN users u1 ON c.assigned_by = u1.uid
        ${whereClause}
        ORDER BY c.id DESC
        LIMIT ${limitValue} OFFSET ${offsetValue};
    `;

    // Query to count total leads
    const countSql = `
        SELECT COUNT(*) as total
        FROM customers c
        LEFT JOIN users u ON c.sales_id = u.id
        ${whereClause}
    `;
    //^:  ${whereClause} // Uses the full filter (UID + Status + Search)

    // Query to count leads by status
    const statusCountSql = `
        SELECT c.status, COUNT(*) as count 
        FROM customers c
        LEFT JOIN users u ON c.sales_id = u.id
        ${statusCountWhereClause}
        GROUP BY c.status
    `;
    //^: ${statusCountWhereClause} // Uses only the UID filter

    // Add pagination parameters to the main query parameters
    // params.push((parseInt(page) - 1) * parseInt(limit), parseInt(limit));

    // Execute queries
    const [rows] = await db.query<RowDataPacket[]>(dataSql, params);
    const [countResult] = await db.query<RowDataPacket[]>(countSql, params);
    // const [rows] = await db.query<RowDataPacket[]>(dataSql);
    // const [countResult] = await db.query<RowDataPacket[]>(countSql);
    //^: use dedicated statusCountParams - for status count query
    const [statusCounts] = await db.query<RowDataPacket[]>(
      statusCountSql,
      statusCountParams, // <-- IMPORTANT: Use the dedicated parameters
    );

    // Get total from the count query
    const totalFilteredItems = countResult[0]?.total || 0;

    // Format status counts
    const formattedStatusCounts: Record<string, number> = {};
    statusCounts.forEach((row: any) => {
      formattedStatusCounts[row.status || "null"] = row.count;
    });

    // Calculate total records
    const totalRecords = Object.values(formattedStatusCounts).reduce(
      (sum, count) => sum + count,
      0,
    );

    // Return formatted response
    return NextResponse.json({
      listLead: rows,
      totalCount: totalFilteredItems, // Count for the current filter
      totalRecords: totalRecords, // Count of all records
      statusCounts: formattedStatusCounts,
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

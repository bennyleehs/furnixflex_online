import { createPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get parameters from URL query
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';
    const status = searchParams.get('status') || null;
    const search = searchParams.get('search') || null;
    const id = searchParams.get('id') || null;
    
    const db = createPool();

    // Build WHERE clause
    let whereClause = '';
    const params: any[] = []; // KEEP THIS DECLARATION

    // If ID is provided, we prioritize it and ignore other filters
    if (id) {
      whereClause = 'WHERE c.id = ?';
      params.push(id);
    } else {
      // Apply other filters only if ID is not provided
      if (status && status !== 'All') {
        whereClause = 'WHERE c.status = ?';
        params.push(status);
      }
      
      // Add search condition to WHERE clause
      if (search) {
        // If we already have a WHERE clause, add AND
        whereClause = whereClause ? `${whereClause} AND (` : 'WHERE (';
        
        // Define searchable fields
        const searchFields = [
          'c.name', 'c.nric', 'c.phone1', 'c.phone2', 'c.email',
          'c.address_line1', 'c.address_line2', 'c.city', 'c.state',
          'c.propety', 'c.guard',
          'c.interested', 'c.add_info', 'c.country', 'c.source', 'c.created_at'
        ];
        
        // Build search conditions
        whereClause += searchFields.map(field => `${field} LIKE ?`).join(' OR ');
        whereClause += ')';
        
        // Add search parameter for each field
        const searchPattern = `%${search}%`;
        searchFields.forEach(() => params.push(searchPattern));
      }
    }

    // Calculate LIMIT and OFFSET values
    const limitValue = parseInt(limit);
    const offsetValue = (parseInt(page) - 1) * limitValue;

    // Build SQL queries
    const dataSql = `
      SELECT 
        c.*,
        e.name AS sales_name,
        e.uid AS sales_uid
      FROM customers c
      LEFT JOIN users e ON c.sales_id = e.id
      ${whereClause}
      ORDER BY c.id DESC 
      LIMIT ${limitValue} OFFSET ${offsetValue};
    `;

    // Add a filtered count query to your GET handler
    const countSql = `
      SELECT COUNT(*) AS total
      FROM customers c
      LEFT JOIN users e ON c.sales_id = e.id
      ${whereClause};
    `;
    
    // Status counts query stays the same
    const statusCountSql = `
      SELECT c.status, COUNT(*) as count
      FROM customers c
      GROUP BY c.status;
    `;

    // Execute queries
    const [rows] = await db.query<RowDataPacket[]>(dataSql, params);
    const [countResult] = await db.query<RowDataPacket[]>(countSql, params);
    const [statusCounts] = await db.query<RowDataPacket[]>(statusCountSql);
    
    // Get total from the count query
    const totalFilteredItems = countResult[0]?.total || 0;

    // Format status counts
    const formattedStatusCounts: Record<string, number> = {};
    statusCounts.forEach((row: any) => {
      formattedStatusCounts[row.status || "null"] = row.count;
    });

    // Calculate total records
    const totalRecords = Object.values(formattedStatusCounts).reduce((sum, count) => sum + count, 0);

    // Return formatted response
    return NextResponse.json({
      listLead: rows,
      totalCount: totalFilteredItems, // Count for the current filter
      totalRecords: totalRecords,     // Count of all records
      statusCounts: formattedStatusCounts
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }), 
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

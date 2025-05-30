import { createPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get parameters from URL query
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || null;
    const search = searchParams.get('search') || null;
    const id = searchParams.get('id') || null;
     
    // Calculate offset
    const offset = (page - 1) * limit;
    
    const db = createPool();

    // Build WHERE clause
    let whereClause = '';
    const params: any[] = [];

    // If ID is provided, we prioritize it and ignore other filters
    if (id) {
      whereClause = 'WHERE c.id = ?';
      params.push(id);
    } else {
      // Apply other filters only if ID is not provided
      if (status) {
        whereClause = 'WHERE c.status = ?';
        params.push(status);
      }
      
      // Add search condition to WHERE clause
      if (search) {
        // If we already have a WHERE clause, add AND
        whereClause = whereClause ? `${whereClause} AND (` : 'WHERE (';
        
        // Add search conditions for each searchable column
        // Adjust column names based on your database schema
        whereClause += `
          c.name LIKE ? OR 
          c.nric LIKE ? OR 
          c.phone1 LIKE ? OR 
          c.phone2 LIKE ? OR 
          c.email LIKE ? OR 
          c.address_line1 LIKE ? OR 
          c.address_line2 LIKE ? OR 
          c.city LIKE ? OR 
          c.state LIKE ? OR 
          c.country LIKE ? OR
          c.source LIKE ? OR
          c.interested LIKE ? OR
          c.add_info LIKE ? OR
          e.uid LIKE ? OR
          c.created_at LIKE ?
        )`;
        
        // Add search parameter for each column (with wildcard)
        const searchValue = `%${search}%`;
        for (let i = 0; i < 15; i++) { // Updated to 12 searchable columns
          params.push(searchValue);
        }
      }
    }

    // Query to get paginated data with optional filters
    const dataSql = `
      SELECT 
        c.*,
        e.name AS sales_name,
        e.uid AS sales_uid
      FROM customers c
      LEFT JOIN users e ON c.sales_id = e.id
      ${whereClause}
      ORDER BY c.id DESC 
      LIMIT ? OFFSET ?;
    `;

    // Query to get total count of records with the same filters
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

    // Add parameters for limit and offset
    params.push(limit, offset);

    // Execute queries with appropriate parameters
    const [rows] = await db.query<RowDataPacket[]>(dataSql, params);
    const [countResult] = await db.query<RowDataPacket[]>(countSql, params.slice(0, params.length - 2));
    const [statusCounts] = await db.query<RowDataPacket[]>(statusCountSql);
    
    // Get total count from count query
    const totalCount = countResult[0].total;
    
    // Format status counts into an object for easier consumption
    const statusCountsObj = statusCounts.reduce((acc: Record<string, number>, curr: any) => {
      acc[curr.status] = curr.count;
      return acc;
    }, {});

    return new Response(
      JSON.stringify({ 
        listTask: rows,
        totalCount: totalCount,
        page: page,
        limit: limit,
        totalPages: Math.ceil(totalCount / limit),
        statusCounts: statusCountsObj
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
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

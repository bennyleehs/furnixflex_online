import { createPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { NextRequest, NextResponse } from "next/server";

// GET method for fetching tasks with dynamic sorting
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || null;
    const search = searchParams.get("search") || null;
    const id = searchParams.get("id") || null;
    const userUid = searchParams.get("userUid") || null;
    const userRole = searchParams.get("userRole") || null;

    const offset = (page - 1) * limit;
    const db = createPool();

    const privilegedRoles = ["Director", "Manager", "Assistant Manager", "Supervisor", "Superadmin"];
    const canSeeAllTasks = userRole && privilegedRoles.includes(userRole);

    const whereConditions: string[] = [];
    const queryParams: any[] = [];

    if (id) {
      whereConditions.push("c.id = ?");
      queryParams.push(id);
    } else {
      if (!canSeeAllTasks) {
        if (userUid) {
          whereConditions.push("e.uid = ?");
          queryParams.push(userUid);
        } else {
          return new Response(
            JSON.stringify({
              listTask: [],
              totalCount: 0,
              page: page,
              limit: limit,
              totalPages: 0,
              statusCounts: {},
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      }

      if (status) {
        whereConditions.push("c.status = ?");
        queryParams.push(status);
      }

      if (search) {
        const searchGroup = `(
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
        whereConditions.push(searchGroup);

        const searchValue = `%${search}%`;
        for (let i = 0; i < 15; i++) {
          queryParams.push(searchValue);
        }
      }
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    const dataSql = `
      SELECT 
        c.*,
        e.name AS sales_name,
        e.uid AS sales_uid
      FROM customers c
      LEFT JOIN users e ON c.sales_id = e.id
      ${whereClause}
      ORDER BY 
        CASE c.status
          WHEN 'Installation' THEN 1
          WHEN 'Production' THEN 2
          WHEN 'Payment' THEN 3
          WHEN 'Quotation' THEN 4
          WHEN 'Visit Showroom' THEN 5
          WHEN 'Follow Up' THEN 6
          WHEN 'Assign PIC' THEN 7
          ELSE 8
        END,
        c.created_at DESC, 
        c.id DESC 
      LIMIT ? OFFSET ?;
    `;

    const countSql = `
      SELECT COUNT(*) AS total
      FROM customers c
      LEFT JOIN users e ON c.sales_id = e.id
      ${whereClause};
    `;

    const statusCountSql = `
      SELECT c.status, COUNT(*) as count
      FROM customers c
      LEFT JOIN users e ON c.sales_id = e.id
      ${whereClause}
      GROUP BY c.status;
    `;
    
    const dataParams = [...queryParams, limit, offset];
    const countParams = queryParams;
    const statusParams = queryParams;

    const [rows] = await db.query<RowDataPacket[]>(dataSql, dataParams);
    const [countResult] = await db.query<RowDataPacket[]>(countSql, countParams);
    const [statusCounts] = await db.query<RowDataPacket[]>(statusCountSql, statusParams);

    const totalCount = countResult[0].total;

    const statusCountsObj = statusCounts.reduce(
      (acc: Record<string, number>, curr: any) => {
        acc[curr.status] = curr.count;
        return acc;
      },
      {},
    );

    return new Response(
      JSON.stringify({
        listTask: rows,
        totalCount: totalCount,
        page: page,
        limit: limit,
        totalPages: Math.ceil(totalCount / limit),
        statusCounts: statusCountsObj,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error fetching leads:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// POST method for creating new tasks
export async function POST(request: NextRequest) {
  try {
    // Instead of using params from function arguments, get taskId from searchParams
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('taskId');
    
    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }
    
    // Handle file upload for the specific task
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Process the file upload
    // ...file processing logic...
    
    return NextResponse.json({ 
      success: true,
      message: 'File uploaded successfully',
      taskId
    });
    
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// PATCH method for updating existing tasks
export async function PATCH(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { id, ...updateFields } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }
    
    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: "No update fields provided" }, { status: 400 });
    }

    // Create database connection
    const db = createPool();

    // Start transaction for data consistency
    await db.query("START TRANSACTION");

    try {
      // Get current task data for comparison and logging
      const [taskResult] = await db.query<RowDataPacket[]>("SELECT * FROM customers WHERE id = ?", [id]);
      
      if (taskResult.length === 0) {
        await db.query("ROLLBACK");
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      const oldTaskData = taskResult[0];
      const changes: Record<string, { old: any, new: any }> = {};
      let hasChanges = false;

      // Build dynamic update SQL
      const allowedFields = [
        'name', 'phone1', 'phone2', 'email', 'address_line1', 'address_line2',
        'postcode', 'city', 'state', 'country', 'customer_remark', 'status',
        'source', 'nric', 'sales_id', 'interested', 'add_info'
      ];
      
      const updateParts: string[] = [];
      const updateValues: any[] = [];
      
      // Track what fields were actually changed
      Object.keys(updateFields).forEach(field => {
        if (allowedFields.includes(field) && updateFields[field] !== oldTaskData[field]) {
          updateParts.push(`${field} = ?`);
          updateValues.push(updateFields[field]);
          
          changes[field] = {
            old: oldTaskData[field],
            new: updateFields[field]
          };
          hasChanges = true;
        }
      });
      
      // Add updated_at to fields being updated
      updateParts.push('updated_at = NOW()');
      
      // If no changes detected, return early
      if (!hasChanges) {
        await db.query("ROLLBACK");
        return NextResponse.json({ 
          success: true, 
          message: "No changes detected" 
        });
      }
      
      // Build and execute the update query
      const updateQuery = `
        UPDATE customers 
        SET ${updateParts.join(', ')} 
        WHERE id = ?
      `;
      
      await db.query(updateQuery, [...updateValues, id]);
      
      // Generate description for logging (kept for response only)
      const changeDescriptions = Object.entries(changes)
        .map(([field, values]) => `${field}: "${values.old}" → "${values.new}"`)
        .join(', ');
      
      // Commit the transaction
      await db.query("COMMIT");
      
      return NextResponse.json({ 
        success: true, 
        message: "Task updated successfully",
        changes,
        description: body.notes || `Updated: ${changeDescriptions}`
      });
    } catch (error) {
      // Rollback transaction on error
      await db.query("ROLLBACK");
      console.error("Database error:", error);
      return NextResponse.json({ 
        error: "Failed to update task",
        details: error instanceof Error ? error.message : "Unknown error" 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
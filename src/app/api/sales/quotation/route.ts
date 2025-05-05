import { NextRequest, NextResponse } from 'next/server';
import { createPool } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const taskId = searchParams.get('taskId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const db = createPool();

    // If a specific quotation ID is requested
    if (id) {
      const quotation = await db.query(`
        SELECT * FROM quotations WHERE id = ? LIMIT 1
      `, [id]);

      if (!quotation || (quotation as any[]).length === 0) {
        return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
      }

      return NextResponse.json({ quotation: quotation[0] });
    }

    // If quotations for a specific task are requested
    if (taskId) {
      const quotations = await db.query(`
        SELECT * FROM quotations WHERE task_id = ? ORDER BY created_at DESC
      `, [taskId]);

      return NextResponse.json({ quotation: quotations[0] || null });
    }

    // Query to get filtered quotations with pagination
    let countQuery = `SELECT COUNT(*) as total FROM quotations`;
    let dataQuery = `
      SELECT 
        q.*,
        t.name, t.nric, t.phone1, t.phone2, t.email,
        t.address_line1, t.address_line2, t.city, t.state, t.country,
        t.source, t.interested, t.add_info,
        t.sales_name, t.sales_uid
      FROM quotations q
      LEFT JOIN tasks t ON q.task_id = t.id
    `;
    
    // Build WHERE clause for filtering
    const whereConditions = [];
    const queryParams = [];
    
    if (status && status !== 'All') {
      whereConditions.push('q.status = ?');
      queryParams.push(status);
    }
    
    if (search) {
      whereConditions.push(`(
        t.name LIKE ? OR 
        t.nric LIKE ? OR 
        t.phone1 LIKE ? OR 
        t.email LIKE ? OR
        q.reference_number LIKE ?
      )`);
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Apply WHERE clause if needed
    if (whereConditions.length > 0) {
      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
      countQuery += ` ${whereClause}`;
      dataQuery += ` ${whereClause}`;
    }
    
    // Apply sorting and pagination
    dataQuery += ` ORDER BY q.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);
    
    // Get total count for pagination
    const countResult = await db.query(countQuery, queryParams.slice(0, queryParams.length - 2));
    const totalCount = countResult[0].total;
    
    // Get actual data with pagination
    const quotations = await db.query(dataQuery, queryParams);
    
    // Get status counts for filtering UI
    const statusCountsResult = await db.query(`
      SELECT status, COUNT(*) as count
      FROM quotations
      GROUP BY status
    `);
    
    const statusCounts = statusCountsResult.reduce((acc, item) => {
      acc[item.status] = item.count;
      return acc;
    }, {});
    
    return NextResponse.json({
      listQuotation: quotations,
      totalCount,
      statusCounts
    });
  } catch (error) {
    console.error('Error fetching quotations:', error);
    return NextResponse.json({ error: 'Failed to fetch quotations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const db = createPool();

    const data = await request.json();
    
    // Validate required fields
    if (!data.taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }
    
    // Generate a reference number if not provided
    if (!data.id) {
      data.id = crypto.randomUUID();
    }
    
    // Check if updating an existing quotation
    const existingQuotation = await db.query(`
      SELECT * FROM quotations WHERE id = ? LIMIT 1
    `, [data.id]);
    
    if (existingQuotation && existingQuotation.length > 0) {
      // Update existing quotation
      await db.query(`
        UPDATE quotations SET
          task_id = ?,
          customer_name = ?,
          customer_contact = ?,
          customer_address = ?,
          quotation_date = ?,
          valid_until = ?,
          items = ?,
          subtotal = ?,
          discount = ?,
          tax = ?,
          total = ?,
          notes = ?,
          terms = ?,
          status = ?,
          updated_at = NOW(),
          updated_by = ?
        WHERE id = ?
      `, [
        data.taskId,
        data.customerName,
        data.customerContact,
        data.customerAddress,
        data.quotationDate,
        data.validUntil,
        JSON.stringify(data.items),
        data.subtotal,
        data.discount,
        data.tax,
        data.total,
        data.notes,
        data.terms,
        data.status,
        user.id,
        data.id
      ]);
      
      // Fetch the updated quotation
      const updatedQuotation = await db.query(`
        SELECT * FROM quotations WHERE id = ? LIMIT 1
      `, [data.id]);
      
      return NextResponse.json({ 
        message: 'Quotation updated successfully',
        quotation: updatedQuotation[0]
      });
    } else {
      // Insert new quotation
      await db.query(`
        INSERT INTO quotations (
          id,
          task_id,
          customer_name,
          customer_contact,
          customer_address,
          quotation_date,
          valid_until,
          items,
          subtotal,
          discount,
          tax,
          total,
          notes,
          terms,
          status,
          created_at,
          created_by,
          updated_at,
          updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?)
      `, [
        data.id,
        data.taskId,
        data.customerName,
        data.customerContact,
        data.customerAddress,
        data.quotationDate,
        data.validUntil,
        JSON.stringify(data.items),
        data.subtotal,
        data.discount,
        data.tax,
        data.total,
        data.notes,
        data.terms,
        data.status,
        user.id,
        user.id
      ]);
      
      // Fetch the created quotation
      const createdQuotation = await db.query(`
        SELECT * FROM quotations WHERE id = ? LIMIT 1
      `, [data.id]);
      
      return NextResponse.json({ 
        message: 'Quotation created successfully',
        quotation: createdQuotation[0]
      });
    }
  } catch (error) {
    console.error('Error creating/updating quotation:', error);
    return NextResponse.json({ error: 'Failed to save quotation' }, { status: 500 });
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const db = createPool();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Quotation ID is required' }, { status: 400 });
    }
    
    // Check if quotation exists
    const existingQuotation = await db.query(`
      SELECT * FROM quotations WHERE id = ? LIMIT 1
    `, [id]);
    
    if (!existingQuotation || existingQuotation.length === 0) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }
    
    // Delete the quotation (or mark as deleted)
    await db.query(`
      DELETE FROM quotations WHERE id = ?
    `, [id]);
    
    return NextResponse.json({ message: 'Quotation deleted successfully' });
  } catch (error) {
    console.error('Error deleting quotation:', error);
    return NextResponse.json({ error: 'Failed to delete quotation' }, { status: 500 });
  }
}
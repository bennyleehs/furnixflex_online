import { NextRequest, NextResponse } from 'next/server';
import { createPool } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

/**
 * GET endpoint to fetch quotations with 'invoice' status
 */
export async function GET(request: NextRequest) {
  try {
    const db = createPool();
    const { searchParams } = new URL(request.url);
    
    // Get task ID if provided for specific invoice retrieval
    const taskId = searchParams.get('taskId');
    const quotationId = searchParams.get('quotationId');
    
    // Special case: if taskId or id is provided, handle it separately
    if (taskId || quotationId) {
      // Your existing code for fetching by taskId or id
      // ...
      return NextResponse.json({ /* your existing response */ });
    }
    
    // List view with pagination and filtering
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const offset = (page - 1) * pageSize;
    
    // Get filter parameters
    const search = searchParams.get('search') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';
    const status = searchParams.get('status') || '';
    
    // Build WHERE clause
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    
    if (search) {
      whereConditions.push(`(
        invoice_number LIKE ? OR 
        customer_name LIKE ? OR 
        customer_email LIKE ? OR
        total LIKE ?
      )`);
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (from) {
      whereConditions.push(`invoice_date >= ?`);
      queryParams.push(from);
    }
    
    if (to) {
      whereConditions.push(`invoice_date <= ?`);
      queryParams.push(to);
    }
    
    if (status && status !== 'all') {
      whereConditions.push(`status = ?`);
      queryParams.push(status);
    }
    
    // Create the final WHERE clause
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    // Get total count for pagination
    const [countResult] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM invoices ${whereClause}`,
      queryParams
    );
    
    const total = countResult[0].total;
    
    // Fetch the invoices
    const [invoices] = await db.query<RowDataPacket[]>(
      `SELECT 
        id, invoice_number, invoice_date, due_date, 
        customer_name, customer_email, customer_contact,
        subtotal, tax, total, amount_paid, balance, status, 
        created_at, updated_at, task_id, quotation_id
      FROM invoices
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
      [...queryParams, pageSize, offset]
    );
    
    // Return paginated results
    return NextResponse.json({
      invoices,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
    
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to update a quotation to 'invoice' status
 */
export async function POST(request: NextRequest) {
  try {
    const db = createPool();
    const body = await request.json();
    
    // Validate required fields
    if (!body.customer_name || !body.invoice_date || !body.due_date || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Start a transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Insert invoice record
      const [result] = await connection.query<ResultSetHeader[]>(
        `INSERT INTO invoices (
          invoice_number, invoice_date, due_date, customer_name, customer_nric, customer_email,
          customer_contact, customer_address, sales_representative, sales_uid,
          subtotal, tax, total, amount_paid, balance, status, notes, terms,
          task_id, quotation_id, quotation_number, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          body.invoice_number,
          body.invoice_date,
          body.due_date,
          body.customer_name,
          body.customer_nric || null, // Add this line
          body.customer_email || null,
          body.customer_contact || null,
          body.customer_address || null,
          body.sales_representative || null,
          body.sales_uid || null,
          body.subtotal,
          body.tax,
          body.total,
          body.amount_paid || 0,
          body.balance || body.total,
          body.status || 'draft',
          body.notes || null,
          body.terms || null,
          body.task_id || null,
          body.quotation_id || null,
          body.quotation_number || null, // Add this line
        ]
      );
      
      const invoiceId = result[0].insertId;
      
      // Insert invoice items
      for (const item of body.items) {
        await connection.query(
          `INSERT INTO invoice_items (
            invoice_id, description, quantity, unit_price, amount, unit, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [
            invoiceId,
            item.description,
            item.quantity,
            item.unit_price,
            item.amount,
            item.unit || null
          ]
        );
      }
      
      // Insert payment records if any
      if (body.payments && Array.isArray(body.payments) && body.payments.length > 0) {
        for (const payment of body.payments) {
          await connection.query(
            `INSERT INTO invoice_payments (
              invoice_id, amount, payment_date, payment_method, 
              payment_reference, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [
              invoiceId,
              payment.amount,
              payment.payment_date,
              payment.payment_method,
              payment.payment_reference || null,
              payment.notes || null
            ]
          );
        }
      }
      
      // If there's a quotation_id, update its status to 'invoiced'
      if (body.quotation_id) {
        await connection.query(
          `UPDATE quotations SET status = 'invoiced', updated_at = NOW() WHERE id = ?`,
          [body.quotation_id]
        );
      }
      
      // Commit transaction
      await connection.commit();
      
      // Fetch the created invoice with its items
      const [invoiceRows] = await db.query(
        `SELECT * FROM invoices WHERE id = ?`,
        [invoiceId]
      ) as [any[], any];
      
      const [itemRows] = await db.query(
        `SELECT * FROM invoice_items WHERE invoice_id = ?`,
        [invoiceId]
      ) as [any[], any];
      
      const invoice = invoiceRows[0];
      invoice.items = itemRows;
      
      return NextResponse.json({ 
        success: true, 
        message: 'Invoice created successfully',
        invoice
      });
      
    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
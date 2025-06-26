import { NextResponse } from 'next/server';
import { createPool } from '@/lib/db';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const taskId = url.searchParams.get('taskId');
  
  // Return error if taskId is not provided
  if (!taskId) {
    return NextResponse.json(
      { error: 'taskId parameter is required' },
      { status: 400 }
    );
  }
  
  try {
    const pool = createPool();
    
    // Fetch quotation by taskId
    const [quotationRows] = await pool.query(
      'SELECT * FROM quotations WHERE task_id = ? ORDER BY created_at DESC LIMIT 1',
      [taskId]
    ) as [any[], any];
    
    if (quotationRows.length === 0) {
      return NextResponse.json({ quotation: null });
    }
    
    const quotation = quotationRows[0];
    
    // Fetch related items - using quotation_number field
    try {
      const [itemRows] = await pool.query(
        'SELECT * FROM quotation_items WHERE quotation_number = ?',
        [quotation.quotation_number]
      ) as [any[], any];
      
      quotation.items = itemRows;
    } catch (itemError) {
      console.warn('Could not fetch quotation items:', itemError);
      quotation.items = [];
    }
    
    // Return the quotation with its items
    return NextResponse.json({ quotation });
    
  } catch (error) {
    console.error('Error fetching quotation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotation' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pool = createPool();
    
    // Insert new quotation with correct column names (snake_case)
    const [result] = await pool.query(
      `INSERT INTO quotations 
       (task_id, customer_name, customer_nric, customer_contact, customer_email, customer_address,
        customer_property, customer_guard, quotation_date, valid_until, sales_representative, sales_uid,
        subtotal, discount, tax, total, notes, terms, status, quote_ref, quotation_number) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.task_id,
        body.customer_name,
        body.customer_nric,
        body.customer_contact,
        body.customer_email,
        body.customer_address || '',
        body.customer_property || '',
        body.customer_guard || '',
        body.quotation_date,
        body.valid_until,
        body.sales_representative,
        body.sales_uid,
        body.subtotal || '0.00',
        body.discount || '0.00',
        body.tax || '0.00',
        body.total || '0.00',
        body.notes || '',
        body.terms || '',
        body.status || 'draft',
        body.quote_ref,
        body.quotation_number || ''
      ]
    ) as [any, any];
    
    const quotationId = result.insertId;
    const quotation_number = body.quotation_number;
    
    // Insert quotation items if provided
    if (body.items && body.items.length > 0) {
      for (const item of body.items) {
        await pool.query(
          `INSERT INTO quotation_items 
           (quotation_number, task_id, productId, category, subcategory, productName, description,
            quantity, unit, unitPrice, discount, total, note) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            body.quotation_number,      // Save quotation_number
            body.task_id || '',         // Save task_id from parent quotation
            item.productId || 0,        // Use productId instead of productName
            item.category || '',
            item.subcategory || '',
            item.productName || '',
            item.description || '',
            item.quantity || 0,
            item.unit || '',
            item.unitPrice || 0,
            item.discount || 0,
            item.total || 0,
            item.note || ''
          ]
        );
      }
    }
    
    // Fetch the newly created quotation for response
    const [quotationRows] = await pool.query(
      'SELECT * FROM quotations WHERE id = ?',
      [quotationId]
    ) as [any[], any];
    
    const [itemRows] = await pool.query(
      'SELECT * FROM quotation_items WHERE quotation_number = ?',
      [quotation_number]
    ) as [any[], any];
    
    const quotation = quotationRows[0];
    quotation.items = itemRows;
    
    return NextResponse.json({ 
      success: true, 
      message: 'Quotation created successfully', 
      quotation
    });
    
  } catch (error) {
    console.error('Error creating quotation:', error);
    return NextResponse.json(
      { error: 'Failed to create quotation', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const pool = createPool();
    
    // Ensure quotation ID is provided
    if (!body.id) {
      return NextResponse.json(
        { error: 'Quotation ID is required' },
        { status: 400 }
      );
    }
    
    // Update quotation with correct column names (snake_case)
    await pool.query(
      `UPDATE quotations SET
        task_id = ?,
        customer_name = ?,
        customer_nric = ?,
        customer_contact = ?,
        customer_email = ?,
        customer_address = ?,
        customer_property = ?,
        customer_guard = ?,
        quotation_date = ?,
        valid_until = ?,
        sales_representative = ?,
        sales_uid = ?,
        subtotal = ?,
        discount = ?,
        tax = ?,
        total = ?,
        notes = ?,
        terms = ?,
        status = ?
       WHERE id = ?`,
      [
        body.task_id,
        body.customer_name,
        body.customer_nric,
        body.customer_contact,
        body.customer_email,
        body.customer_address || '',
        body.customer_property || '',
        body.customer_guard || '',
        body.quotation_date,
        body.valid_until,
        body.sales_representative,
        body.sales_uid || '',
        body.subtotal || '0.00',
        body.discount || '0.00',
        body.tax || '0.00',
        body.total || '0.00',
        body.notes || '',
        body.terms || '',
        body.status || 'draft',
        body.id
      ]
    );
    
    // Handle items if provided
    if (body.items && Array.isArray(body.items)) {
      // First, delete all existing items for this quotation
      await pool.query(
        'DELETE FROM quotation_items WHERE quotation_number = ?',
        [body.quotation_number]
      );
      
      // Then insert the updated items
      for (const item of body.items) {
        await pool.query(
          `INSERT INTO quotation_items 
           (quotation_number, task_id, productId, category, subcategory, productName, description,
            quantity, unit, unitPrice, discount, total, note) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            body.quotation_number,      // Save quotation_number
            body.task_id || '',         // Save task_id from parent quotation
            item.productId || 0,        // Use productId instead of productName
            item.category || '',
            item.subcategory || '',
            item.productName || '',
            item.description || '',
            item.quantity || 0,
            item.unit || '',
            item.unitPrice || 0,
            item.discount || 0,
            item.total || 0,
            item.note || ''
          ]
        );
      }
    }
    
    // Fetch the updated quotation
    const [quotationRows] = await pool.query(
      'SELECT * FROM quotations WHERE id = ?',
      [body.id]
    ) as [any[], any];
    
    const [itemRows] = await pool.query(
      'SELECT * FROM quotation_items WHERE quotation_number = ?',
      [body.quotation_number]
    ) as [any[], any];
    
    const quotation = quotationRows[0];
    quotation.items = itemRows;
    
    return NextResponse.json({
      success: true,
      message: 'Quotation updated successfully',
      quotation
    });
    
  } catch (error) {
    console.error('Error updating quotation:', error);
    return NextResponse.json(
      { error: 'Failed to update quotation', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Add this PATCH method after your existing PUT method
export async function PATCH(request: Request) {
  try {
    const url = new URL(request.url);
    const taskId = url.searchParams.get('taskId');
    const body = await request.json();
    const pool = createPool();
    
    // Ensure taskId is provided
    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required as a query parameter' },
        { status: 400 }
      );
    }
    
    // Ensure status is provided
    if (!body.status) {
      return NextResponse.json(
        { error: 'Status is required in request body' },
        { status: 400 }
      );
    }

    const status = body.status;

    // Update only the status field
    await pool.query(
      'UPDATE quotations SET status = ? WHERE task_id = ?',
      [status, taskId]
    );
    
    // Update task status in customers table if needed
    let taskStatus = null;
    if (status === 'accepted') {
      taskStatus = 'Deal Closed';
    } else if (status === 'rejected') {
      taskStatus = 'Over Budget';
    }
    
    if (taskStatus) {
      await pool.query(
        'UPDATE customers SET status = ? WHERE id = ?',
        [taskStatus, taskId]
      );
    }
    
    // Must return a response here
    return NextResponse.json({
      success: true,
      message: `Quotation status updated to ${status}`,
      task_id: taskId,
      taskStatus: taskStatus
    });
    
  } catch (error) {
    console.error('Error updating quotation status:', error);
    return NextResponse.json(
      { error: 'Failed to update quotation status', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
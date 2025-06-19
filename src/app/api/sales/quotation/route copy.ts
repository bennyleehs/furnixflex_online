import { NextResponse } from 'next/server';
import { createPool } from '@/lib/db';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const taskId = url.searchParams.get('taskId');
  const quotationId = url.searchParams.get('id');
  
  try {
    const pool = createPool();
    let quotation = null;
    let items = [];
    
    if (quotationId) {
      // Fetch quotation by ID
      const [quotationRows] = await pool.query(
        'SELECT * FROM quotations WHERE id = ?',
        [quotationId]
      ) as [any[], any];
      
      if (quotationRows.length > 0) {
        quotation = quotationRows[0];
        
        // Fetch related items
        try {
          const [itemRows] = await pool.query(
            'SELECT * FROM quotation_items WHERE quotation_id = ?',
            [quotationId]
          ) as [any[], any];
          
          items = itemRows;
        } catch (itemError) {
          console.warn('Could not fetch quotation items:', itemError);
          // Return empty array for items if table doesn't exist
          items = [];
        }
      }
    } else if (taskId) {
      // Fetch quotation by taskId
      const [quotationRows] = await pool.query(
        'SELECT * FROM quotations WHERE task_id = ? ORDER BY created_at DESC LIMIT 1',
        [taskId]
      ) as [any[], any];
      
      if (quotationRows.length > 0) {
        quotation = quotationRows[0];
        
        // Fetch related items
        try {
          const [itemRows] = await pool.query(
            'SELECT * FROM quotation_items WHERE quotation_number = ?',
            [quotation.id]
          ) as [any[], any];
          
          items = itemRows;
        } catch (itemError) {
          console.warn('Could not fetch quotation items:', itemError);
          items = [];
        }
      }
    } else {
      // No ID or taskId provided, return all quotations
      const [quotationRows] = await pool.query(
        'SELECT * FROM quotations ORDER BY created_at DESC'
      ) as [any[], any];
      
      return NextResponse.json({ quotations: quotationRows });
    }
    
    // Return the quotation with its items
    if (quotation) {
      quotation.items = items;
      return NextResponse.json({ quotation });
    }
    
    // If no quotation found, return null
    return NextResponse.json({ quotation: null });
    
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
       (task_id, customer_name, customer_contact, customer_address,
        quotation_date, valid_until, sales_representative, sales_uid,
        subtotal, discount, tax, total, notes, terms, status, quote_ref, quotation_number) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.task_id,
        body.customer_name,
        body.customer_contact,
        body.customer_address || '',
        body.quotation_date,
        body.valid_until,
        body.sales_representative,
        body.sales_uid ,
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
    
    // Insert quotation items if provided
    if (body.items && body.items.length > 0) {
      for (const item of body.items) {
        await pool.query(
          `INSERT INTO quotation_items 
           (quotation_number, task_id, category, subcategory, product, description, 
            quantity, unit, unit_price, total, note) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            quotationId,
            item.taskId || '',
            item.category || '',
            item.subcategory || '',
            item.productId || '',
            item.description || '',
            item.quantity || 0,
            item.unit || '',
            item.unitPrice || 0,
            item.total || 0,
            item.note || ''
          ]
        );
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Quotation created successfully', 
      quotationId 
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
    if (!body.quotation_number) {
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
        customer_contact = ?,
        customer_address = ?,
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
       WHERE quotation_number = ?`,
      [
        body.taskId || '',
        body.customer_name,
        body.customer_contact,
        body.customer_address || '',
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
        body.quotation_number || ''
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
           (quotation_number, task_id, category, subcategory, product, description, 
            quantity, unit, unit_price, total, note) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            body.quotation_number,
            body.taskId,
            item.category || '',
            item.subcategory || '',
            item.productId || '',
            item.description || '',
            item.quantity || 0,
            item.unit || '',
            item.unitPrice || 0,
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
    
    return NextResponse.json({
      success: true,
      message: 'Quotation updated successfully',
      quotation: quotationRows[0]
    });
    
  } catch (error) {
    console.error('Error updating quotation:', error);
    return NextResponse.json(
      { error: 'Failed to update quotation', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
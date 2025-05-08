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
        const [itemRows] = await pool.query(
          'SELECT * FROM quotation_items WHERE quotation_id = ?',
          [quotationId]
        ) as [any[], any];
        
        items = itemRows;
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
        const [itemRows] = await pool.query(
          'SELECT * FROM quotation_items WHERE quotation_id = ?',
          [quotation.id]
        ) as [any[], any];
        
        items = itemRows;
      }
    } else {
      return NextResponse.json(
        { error: 'Missing taskId or quotation id parameter' },
        { status: 400 }
      );
    }
    
    if (!quotation) {
      return NextResponse.json(
        { message: 'No quotation found' },
        { status: 404 }
      );
    }
    
    // Attach items to quotation
    quotation.items = items;
    
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
    const pool = createPool();
    const body = await request.json();
    const {
      task_id,
      customerName,
      customerContact,
      customerAddress,
      quotationDate,
      validUntil,
      salesRepresentative,
      salesUID,
      items,
      subtotal,
      discount,
      tax,
      total,
      notes,
      terms,
      status,
      quote_ref,
      quotation_number  // Add this field
    } = body;
    
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // Create new quotation with quotation_number
    const [result] = await pool.query(
      `INSERT INTO quotations (
        task_id, customer_name, customer_contact, customer_address, 
        quotation_date, valid_until, sales_representative, sales_uid, 
        subtotal, discount, tax, total, notes, terms, status, quote_ref, quotation_number, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task_id,
        customerName,
        customerContact,
        customerAddress,
        quotationDate,
        validUntil,
        salesRepresentative,
        salesUID,
        subtotal,
        discount,
        tax,
        total,
        notes,
        terms,
        status,
        quote_ref,
        quotation_number,  // Pass the generated value
        now,
        now
      ]
    ) as [{ insertId: number }, any];
    
    const quotationId = result.insertId;
    
    // Insert quotation items
    for (const item of items) {
      await pool.query(
        `INSERT INTO quotation_items (
          quotation_id, category, subcategory, product_id, description,
          quantity, unit, unit_price, discount, total, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          quotationId,
          item.category,
          item.subcategory,
          item.productId,
          item.description,
          item.quantity,
          item.unit,
          item.unitPrice,
          item.discount,
          item.total,
          item.note || ''
        ]
      );
    }
    
    // Fetch the created quotation with its items
    const [quotationRows] = await pool.query(
      'SELECT * FROM quotations WHERE id = ?',
      [quotationId]
    ) as [any[], any];
    
    const [itemRows] = await pool.query(
      'SELECT * FROM quotation_items WHERE quotation_id = ?',
      [quotationId]
    ) as [any[], any];
    
    const createdQuotation = quotationRows[0];
    createdQuotation.items = itemRows;
    
    return NextResponse.json({ quotation: createdQuotation });
  } catch (error) {
    console.error('Error saving quotation:', error);
    return NextResponse.json(
      { error: 'Failed to save quotation' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  // Get the quotation ID from the query string
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  
  if (!id) {
    return NextResponse.json(
      { error: 'Missing quotation ID' },
      { status: 400 }
    );
  }
  
  try {
    const pool = createPool();
    const body = await request.json();
    
    // Extract fields from the request body
    const {
      task_id,
      customerName,
      customerContact,
      customerAddress,
      quotationDate,
      validUntil,
      salesRepresentative,
      salesUID,
      items,
      subtotal,
      discount,
      tax,
      total,
      notes,
      terms,
      status,
      quote_ref,
      quotation_number
    } = body;
    
    // Update the quotation in the database
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
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
       status = ?, 
       updated_at = ? 
       WHERE id = ?`,
      [
        task_id,
        customerName,
        customerContact,
        customerAddress,
        quotationDate,
        validUntil,
        salesRepresentative,
        salesUID,
        subtotal,
        discount,
        tax,
        total,
        notes,
        terms,
        status,
        now,
        id
      ]
    );
    
    // Delete existing items and insert new ones
    await pool.query('DELETE FROM quotation_items WHERE quotation_id = ?', [id]);
    
    // Insert updated items
    for (const item of items) {
      await pool.query(
        `INSERT INTO quotation_items (
          quotation_id, category, subcategory, product_id, description,
          quantity, unit, unit_price, total, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          item.category,
          item.subcategory,
          item.productId,
          item.description,
          item.quantity,
          item.unit,
          item.unitPrice,
          item.total,
          item.note || ''
        ]
      );
    }
    
    // Fetch the updated quotation with its items
    const [quotationRows] = await pool.query(
      'SELECT * FROM quotations WHERE id = ?',
      [id]
    ) as [any[], any];
    
    if (quotationRows.length === 0) {
      return NextResponse.json(
        { error: 'Quotation not found after update' },
        { status: 404 }
      );
    }
    
    const [itemRows] = await pool.query(
      'SELECT * FROM quotation_items WHERE quotation_id = ?',
      [id]
    ) as [any[], any];
    
    // Map column names to camelCase for frontend compatibility
    const updatedQuotation = {
      id: quotationRows[0].id,
      task_id: quotationRows[0].task_id,
      customerName: quotationRows[0].customer_name,
      customerContact: quotationRows[0].customer_contact,
      customerAddress: quotationRows[0].customer_address,
      quotationDate: quotationRows[0].quotation_date,
      validUntil: quotationRows[0].valid_until,
      salesRepresentative: quotationRows[0].sales_representative,
      salesUID: quotationRows[0].sales_uid,
      subtotal: parseFloat(quotationRows[0].subtotal),
      discount: parseFloat(quotationRows[0].discount),
      tax: parseFloat(quotationRows[0].tax),
      total: parseFloat(quotationRows[0].total),
      notes: quotationRows[0].notes,
      terms: quotationRows[0].terms,
      status: quotationRows[0].status,
      quote_ref: quotationRows[0].quote_ref,
      quotation_number: quotationRows[0].quotation_number,
      createdAt: quotationRows[0].created_at,
      updatedAt: quotationRows[0].updated_at,
      items: itemRows.map(item => ({
        id: item.id,
        category: item.category,
        subcategory: item.subcategory,
        productId: item.product_id,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        unitPrice: parseFloat(item.unit_price),
        total: parseFloat(item.total),
        note: item.note
      }))
    };
    
    return NextResponse.json({ quotation: updatedQuotation });
  } catch (error) {
    console.error('Error updating quotation:', error);
    return NextResponse.json(
      { error: 'Failed to update quotation', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
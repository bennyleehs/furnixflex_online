import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const quotationId = searchParams.get('quotationId'); // For getting payments by quotation number
    const taskId = searchParams.get('taskId'); // Add taskId parameter
    const status = searchParams.get('status'); // <-- add this line

    if (!quotationId && !taskId && !status) {
      return NextResponse.json(
        { error: 'Quotation number, task ID, payment ID, or status is required' },
        { status: 400 }
      );
    }

    const db = await getPool();

    let query = '';
    let params: any[] = [];

    if (status) {
      // Join payments with quotations and filter by quotation status
      query = `
        SELECT p.* FROM payments p
        INNER JOIN quotations q ON p.quotation_number = q.quotation_number
        WHERE q.status = ?
        ORDER BY p.payment_date, p.created_at
      `;
      params = [status];
    } else if (quotationId) {
      query = `SELECT * FROM payments WHERE quotation_number = ? ORDER BY payment_date, created_at`;
      params = [quotationId];
    } else {
      query = `SELECT * FROM payments WHERE task_id = ? ORDER BY payment_date, created_at`;
      params = [taskId];
    }

    const [rows] = await db.query(query, params);

    return NextResponse.json({ payments: rows });

  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // console.log('Received payment data:', body);
        
    // Validate required fields
    if (!body.quotation_number || !body.task_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const db = await getPool();
    
    // Generate invoice number if payment is marked as received
    let invoiceNumber = null;
    // if (body.received) {
      invoiceNumber = await generateInvoiceNumber(db);
    // }
    
    // Insert payment record with task_id and invoice_number
    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO payments (
        quotation_number, task_id, amount_inv, balance,
        payment_date, payment_method, payment_reference,
        notes, received, received_date, invoice_number, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        body.quotation_number,
        body.task_id,
        body.amount_inv,
        body.balance,
        body.payment_date,
        body.payment_method,
        body.payment_reference || null,
        body.notes || null,
        body.received ? 1 : 0,
        body.received ? body.received_date || new Date().toISOString().split('T')[0] : null,
        invoiceNumber,
      ]
    );
    
    // Fetch the inserted payment
    const [payments] = await db.query<RowDataPacket[]>(
      `SELECT * FROM payments WHERE id = ?`,
      [result.insertId]
    );
    
    return NextResponse.json({
      success: true,
      payment: payments[0]
    });
    
  } catch (error) {
    console.error('Error adding payment:', error);
    return NextResponse.json(
      { error: 'Failed to add payment' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const paymentId = searchParams.get('id');
    const body = await request.json();
    
    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }
    
    const db = await getPool();
    
    // Update payment received status and invoice number if needed
    const [result] = await db.query<ResultSetHeader>(
      `UPDATE payments SET 
        received = ?, 
        received_date = ?,
        updated_at = NOW()
       WHERE id = ?`,
      [
        body.received ? 1 : 0,
        body.received ? new Date().toISOString().split('T')[0] : null,
        paymentId
      ]
    );
    
    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }
    
    // Fetch the updated payment
    const [payments] = await db.query<RowDataPacket[]>(
      `SELECT * FROM payments WHERE id = ?`,
      [paymentId]
    );
    
    return NextResponse.json({
      success: true,
      payment: payments[0]
    });
    
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const paymentId = searchParams.get('id');
    
    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }
    
    const db = await getPool();
    
    // Delete the payment record
    const [result] = await db.query<ResultSetHeader>(
      `DELETE FROM payments WHERE id = ?`,
      [paymentId]
    );
    
    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Payment record deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting payment:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment' },
      { status: 500 }
    );
  }
}

// Add this function in your route.ts file
async function generateInvoiceNumber(db: any): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearPrefix = currentYear.toString().substring(2); // Get last 2 digits of year
  
  // Get the highest invoice number for the current year
  const [rows] = await db.query(
    `SELECT MAX(invoice_number) as max_invoice 
     FROM payments 
     WHERE invoice_number LIKE ?`,
    [`INV${yearPrefix}-%`]
  ) as [RowDataPacket[], any];
  
  let nextNumber = 1;
  
  if (rows[0].max_invoice) {
    // Extract the number part and increment
    const lastInvoiceNumber = rows[0].max_invoice;
    const matches = lastInvoiceNumber.match(/INV\d{2}-(\d+)/);
    if (matches && matches[1]) {
      nextNumber = parseInt(matches[1], 10) + 1;
    }
  }
  
  // Format: INV23-0001 (for year 2023)
  return `INV${yearPrefix}-${nextNumber.toString().padStart(4, '0')}`;
}
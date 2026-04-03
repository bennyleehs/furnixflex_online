// src/app/api/sales/invoice/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const db = await getPool();
    const { searchParams } = new URL(request.url);
    
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
    
    // Fetch all invoices for export (no pagination)
    const [invoices] = await db.query<RowDataPacket[]>(
      `SELECT 
        id, invoice_number, invoice_date, due_date, 
        customer_name, customer_email, customer_contact,
        subtotal, tax, total, amount_paid, balance, status, 
        created_at, updated_at, task_id, quotation_id
      FROM invoices
      ${whereClause}
      ORDER BY created_at DESC`,
      queryParams
    );
    
    // Generate CSV content
    const headers = [
      'Invoice Number',
      'Date',
      'Due Date',
      'Customer Name',
      'Customer Email',
      'Status',
      'Subtotal',
      'Tax',
      'Total',
      'Amount Paid',
      'Balance'
    ];
    
    const rows = invoices.map(invoice => [
      invoice.invoice_number,
      new Date(invoice.invoice_date).toLocaleDateString(),
      new Date(invoice.due_date).toLocaleDateString(),
      invoice.customer_name,
      invoice.customer_email,
      invoice.status,
      invoice.subtotal.toFixed(2),
      invoice.tax.toFixed(2),
      invoice.total.toFixed(2),
      invoice.amount_paid.toFixed(2),
      invoice.balance.toFixed(2)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="invoices-export-${new Date().toISOString().slice(0, 10)}.csv"`
      }
    });
    
  } catch (error) {
    console.error('Error exporting invoices:', error);
    return NextResponse.json(
      { error: 'Failed to export invoices' },
      { status: 500 }
    );
  }
}
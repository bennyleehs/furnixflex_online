import { NextResponse } from 'next/server';
import { createPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

interface CountResult extends RowDataPacket {
  count: number;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const quoteRef = url.searchParams.get('quoteRef');
  
  if (!quoteRef) {
    return NextResponse.json(
      { error: 'Missing quoteRef parameter' },
      { status: 400 }
    );
  }

  try {
    const pool = createPool();
    
    // Count quotations with the same quote_ref
    const [countRows] = await pool.query<CountResult[]>(
      'SELECT COUNT(*) as count FROM quotations WHERE quote_ref = ?',
      [quoteRef]
    );
    
    const count = countRows[0].count;
    
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching quotation count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotation count' },
      { status: 500 }
    );
  }
}
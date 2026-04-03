// File: src/app/api/sales/payment/check-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCountryFromRequest } from '@/utils/countryDetect';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const paymentId = searchParams.get('paymentId');
  const taskId = searchParams.get('taskId');
  const invoiceId = searchParams.get('invoiceId');
  
  if (!taskId) {
    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
  }
  
  try {
    // Check if directory exists
    const country = getCountryFromRequest(request);
    const invoiceDir = path.join(process.cwd(), 'public', country, 'sales', taskId, 'Invoice');
    
    if (!fs.existsSync(invoiceDir)) {
      return NextResponse.json({ exists: false });
    }
    
    // Get all files in the directory
    const files = fs.readdirSync(invoiceDir);
    
    // Check if any file name contains the payment ID or invoice ID
    const pdfExists = files.some(file => 
      (paymentId && file.includes(paymentId)) || 
      (invoiceId && file.includes(invoiceId))
    );
    
    return NextResponse.json({ exists: pdfExists });
  } catch (error) {
    console.error('Error checking for PDF:', error);
    return NextResponse.json({ error: 'Failed to check for PDF' }, { status: 500 });
  }
}
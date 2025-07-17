// File: src/app/api/sales/payment/view-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const taskId = searchParams.get('taskId');
  const paymentId = searchParams.get('paymentId');
  const invoiceNumber = searchParams.get('invoiceNumber');
  
  if (!taskId) {
    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
  }
  
  try {
    // Define the directory where PDFs are stored
    const invoiceDir = path.join(process.cwd(), 'public', 'sales', taskId, 'Invoice');
    
    // Check if directory exists
    if (!fs.existsSync(invoiceDir)) {
      return NextResponse.json({ error: 'Invoice directory not found' }, { status: 404 });
    }
    
    // Get all files in the directory
    const files = fs.readdirSync(invoiceDir);
    
    // Find the matching PDF file
    let pdfFile = null;
    
    if (paymentId && files.some(file => file.includes(paymentId))) {
      // First try to find by payment ID
      pdfFile = files.find(file => file.includes(paymentId));
    } else if (invoiceNumber && files.some(file => file.includes(invoiceNumber))) {
      // Then try by invoice number
      pdfFile = files.find(file => file.includes(invoiceNumber));
    } else if (files.length > 0) {
      // If no specific match, just get the first PDF
      pdfFile = files[0];
    }
    
    if (!pdfFile) {
      return NextResponse.json({ error: 'PDF file not found' }, { status: 404 });
    }
    
    // Get the full path to the PDF file
    const filePath = path.join(invoiceDir, pdfFile);
    
    // Read the PDF file
    const fileBuffer = fs.readFileSync(filePath);
    
    // Return the PDF with appropriate headers
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${pdfFile}"`,
      },
    });
  } catch (error) {
    console.error('Error serving PDF:', error);
    return NextResponse.json({ error: 'Failed to serve PDF' }, { status: 500 });
  }
}
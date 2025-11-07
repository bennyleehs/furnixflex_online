// src\app\api\sales\payment\upload-receipt\route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const paymentId = formData.get('paymentId') as string;
    const taskId = formData.get('taskId') as string;
    const paymentReference = formData.get('paymentReference') as string;
    const invoiceNumber = formData.get('invoiceNumber') as string;
    // *** NEW: Get the file index from the frontend ***
    const fileIndex = formData.get('fileIndex') as string; 

    // Validate inputs
    if (!file || !paymentId || !taskId || !fileIndex) { // *** ADDED: fileIndex validation ***
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create directory if it doesn't exist
    // Note: It's better to store all receipts under a common folder like 'receipts'
    const uploadsDir = path.join(process.cwd(), 'public', 'sales', taskId, 'Invoice', 'receipts'); 
    fs.mkdirSync(uploadsDir, { recursive: true });

    // Create a meaningful filename
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    // Use paymentReference (which should be like Q-0001-P001) as the base reference
    const reference = paymentReference || invoiceNumber || `payment_${paymentId}`;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // *** MODIFIED FILENAME: Include the fileIndex for the bundle structure ***
    // Format: Receipt_xxxx-xxxx-P001_1_timestamp.ext
    const filename = `Receipt_${reference}_${fileIndex}_${timestamp}.${fileExtension}`;
    const filePath = path.join(uploadsDir, filename);

    // Convert the file to a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Write the file to disk
    fs.writeFileSync(filePath, buffer);

    // Return success response with the file path
    return NextResponse.json({
      success: true,
      message: `Receipt ${fileIndex} uploaded successfully`,
      filePath: `/sales/${taskId}/Receipts/${filename}`
    });
    
  } catch (error) {
    console.error('Error uploading receipt:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to upload receipt', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
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

    // Validate inputs
    if (!file || !paymentId || !taskId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'sales', taskId, 'Invoice', 'receipts');
    fs.mkdirSync(uploadsDir, { recursive: true });

    // Create a meaningful filename
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const reference = paymentReference || invoiceNumber || `payment_${paymentId}`;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `Receipt_${reference}_${timestamp}.${fileExtension}`;
    const filePath = path.join(uploadsDir, filename);

    // Convert the file to a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Write the file to disk
    fs.writeFileSync(filePath, buffer);

    // Return success response with the file path
    return NextResponse.json({
      success: true,
      message: 'Receipt uploaded successfully',
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

// Set the maximum content length for the request (20MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};
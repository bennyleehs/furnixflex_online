import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const paymentId = searchParams.get('paymentId');
    const taskId = searchParams.get('taskId');
    const reference = searchParams.get('reference');
    const filePath = searchParams.get('filePath'); // Optional direct path for backward compatibility
    
    // If a direct file path is provided, use it (for backward compatibility)
    if (filePath) {
      const fullPath = path.join(process.cwd(), 'public', filePath.startsWith('/') ? filePath.substring(1) : filePath);
      
      if (!fs.existsSync(fullPath)) {
        return NextResponse.json({ error: 'Receipt file not found' }, { status: 404 });
      }
      
      const fileBuffer = fs.readFileSync(fullPath);
      const contentType = getContentType(fullPath);
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${path.basename(fullPath)}"`,
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }
    
    // Otherwise, find the receipt based on paymentId and reference
    if (!paymentId || !taskId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Define the receipts directory path
    const receiptsDir = path.join(process.cwd(), 'public', 'sales', taskId, 'Invoice', 'receipts');
    
    // Check if directory exists
    if (!fs.existsSync(receiptsDir)) {
      return NextResponse.json({ error: 'Receipt directory not found' }, { status: 404 });
    }
    
    // Read all files in the directory
    const allFiles = fs.readdirSync(receiptsDir);
    
    // Find the appropriate receipt file
    let receiptFile = null;
    
    // First try to find by reference if provided
    if (reference) {
      receiptFile = allFiles.find(file => 
        file.startsWith('Receipt_') && file.includes(reference)
      );
    }
    
    // If not found by reference or reference not provided, try by payment ID
    if (!receiptFile) {
      receiptFile = allFiles.find(file => 
        file.startsWith('Receipt_') && file.includes(paymentId)
      );
    }
    
    // If still not found, try to find any receipt with a format matching our pattern
    if (!receiptFile) {
      receiptFile = allFiles.find(file => file.startsWith('Receipt_'));
    }
    
    if (!receiptFile) {
      return NextResponse.json({ error: 'No receipt file found for this payment' }, { status: 404 });
    }
    
    // Read and serve the file
    const fullPath = path.join(receiptsDir, receiptFile);
    const fileBuffer = fs.readFileSync(fullPath);
    const contentType = getContentType(fullPath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${receiptFile}"`,
        'Cache-Control': 'public, max-age=86400'
      }
    });
    
  } catch (error) {
    console.error('Error serving receipt file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to serve receipt file', details: errorMessage },
      { status: 500 }
    );
  }
}

// Helper function to determine content type based on file extension
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}
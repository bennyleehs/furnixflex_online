// src\app\api\sales\payment\list-receipts\route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface ReceiptFile {
  filename: string;
  filePath: string; 
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('taskId');
    // Use paymentReference (e.g., Q-0001-P001) as the key identifier
    const paymentReference = searchParams.get('paymentReference'); 
    
    if (!taskId || !paymentReference) {
      return NextResponse.json(
        { error: 'Missing required parameters: taskId and paymentReference' }, 
        { status: 400 }
      );
    }

    const receiptsDir = path.join(
      process.cwd(), 
      'public', 
      'sales', 
      taskId, 
      'Invoice', 
      'receipts'
    ); 

    if (!fs.existsSync(receiptsDir)) {
      return NextResponse.json({ files: [] });
    }

    const files = fs.readdirSync(receiptsDir);

    // Filter files that match the paymentReference pattern: 'Receipt_xxxx-xxxx-P001_'
    const targetPattern = `Receipt_${paymentReference}_`;
    
    const receiptFiles: ReceiptFile[] = files
      .filter(filename => filename.startsWith(targetPattern))
      .map(filename => {
        // The filePath needs to be relative to the 'public' folder
        // Path: sales/TASK_ID/Invoice/receipts/FILENAME
        const relativePath = path.join(
          'sales', 
          taskId, 
          'Invoice', 
          'receipts', 
          filename
        ).replace(/\\/g, '/'); // Ensure forward slashes for URL path

        return {
          filename: filename,
          filePath: relativePath,
        };
      })
      // Optional: Sort files numerically based on their bundle index (e.g., ..._1_..., ..._2_...)
      .sort((a, b) => {
        // Extract the bundle index from the filename (e.g., the '1' in 'Receipt_P001_1_timestamp')
        const partsA = a.filename.split('_');
        const indexA = parseInt(partsA[partsA.length - 2] || '0');
        
        const partsB = b.filename.split('_');
        const indexB = parseInt(partsB[partsB.length - 2] || '0');
        
        return indexA - indexB;
      });

    return NextResponse.json({ files: receiptFiles });

  } catch (error) {
    console.error('Error listing receipts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to list receipts', details: errorMessage }, 
      { status: 500 }
    );
  }
}
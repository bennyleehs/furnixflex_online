import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCountryFromRequest } from '@/utils/countryDetect';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const paymentId = searchParams.get('paymentId');
    const taskId = searchParams.get('taskId');
    const reference = searchParams.get('reference');
    
    // Validate required parameters
    if (!paymentId || !taskId) {
      return NextResponse.json({ 
        error: 'Missing required parameters: paymentId and taskId are required' 
      }, { status: 400 });
    }
    
    // Define the receipts directory path
    const country = getCountryFromRequest(request);
    const receiptsDir = path.join(process.cwd(), 'public', country, 'sales', taskId, 'Invoice', 'receipts');
    
    // Check if directory exists
    if (!fs.existsSync(receiptsDir)) {
      return NextResponse.json({ 
        exists: false,
        message: 'No receipts directory found'
      });
    }
    
    // Read all files in the directory
    const allFiles = fs.readdirSync(receiptsDir);
    
    // Check if receipt exists for this payment
    let receiptExists = false;
    let receiptFile = null;
    
    // First try to find by reference if provided
    if (reference) {
      receiptFile = allFiles.find(file => 
        file.startsWith('Receipt_') && file.includes(reference)
      );
      
      if (receiptFile) {
        receiptExists = true;
      }
    }
    
    // If not found by reference or reference not provided, try by payment ID
    if (!receiptExists) {
      receiptFile = allFiles.find(file => 
        file.startsWith('Receipt_') && file.includes(paymentId)
      );
      
      if (receiptFile) {
        receiptExists = true;
      }
    }
    
    // Check for filename pattern: Receipt_JB2506-0001-P003_2025-07-07T02-31-34-921Z.xxx
    if (!receiptExists) {
      receiptFile = allFiles.find(file => {
        if (file.startsWith('Receipt_')) {
          const filenameParts = file.split('_');
          if (filenameParts.length >= 2) {
            const referenceWithPaymentNumber = filenameParts[1]; // e.g., "JB2506-0001-P003"
            
            // Check for payment number pattern
            if (paymentId && referenceWithPaymentNumber.includes(`-P${paymentId.padStart(3, '0')}`)) {
              return true;
            }
          }
        }
        return false;
      });
      
      if (receiptFile) {
        receiptExists = true;
      }
    }
    
    return NextResponse.json({
      exists: receiptExists,
      filename: receiptFile,
      path: receiptFile ? `/sales/${taskId}/Invoice/receipts/${receiptFile}` : null
    });
    
  } catch (error) {
    console.error('Error checking receipt existence:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to check receipt existence', details: errorMessage },
      { status: 500 }
    );
  }
}
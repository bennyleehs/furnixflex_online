// src/app/api/sales/quotation/view-pdf/route.ts
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCountryFromRequest } from '@/utils/countryDetect';

export async function GET(request: NextRequest) {
  try {
    const country = getCountryFromRequest(request);
    // Get file path from query parameter
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('filePath');
    
    if (!filePath) {
      return new Response('File path is required', { status: 400 });
    }
    
    // Prevent directory traversal
    if (filePath.includes('..')) {
      return new Response('Invalid file path', { status: 400 });
    }
    
    // Construct the full path with country
    const fullPath = path.join(process.cwd(), 'public', country, filePath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return new Response('File not found', { status: 404 });
    }
    
    // Read the file and convert to Uint8Array
    const fileBuffer = fs.readFileSync(fullPath);
    const fileUint8Array = new Uint8Array(fileBuffer);
    
    // Return file with appropriate headers
    return new Response(fileUint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${path.basename(fullPath)}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error serving PDF:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(`Error serving PDF: ${errorMessage}`, { 
      status: 500 
    });
  }
}
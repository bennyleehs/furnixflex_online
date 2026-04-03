// src/app/api/sales/quotation/files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCountryFromRequest } from '@/utils/countryDetect';

export async function GET(request: NextRequest) {
  try {
    const country = getCountryFromRequest(request);
    // Get task ID from query parameters
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Construct the directory path
    const directoryPath = path.join(process.cwd(), 'public', country, 'sales', taskId, 'quotation');
    
    // Check if directory exists
    if (!fs.existsSync(directoryPath)) {
      // Return empty array if directory doesn't exist yet
      return NextResponse.json({ files: [] });
    }
    
    // Read directory contents with metadata
    const fileNames = fs.readdirSync(directoryPath)
      .filter(file => file.toLowerCase().endsWith('.pdf'));
    
    // Add metadata to each file
    const files = fileNames.map(fileName => {
      const filePath = path.join(directoryPath, fileName);
      const stats = fs.statSync(filePath);
      
      return {
        name: fileName,
        lastModified: stats.mtime.toISOString(),
        size: stats.size
      };
    });
    
    // Sort by last modified date (newest first)
    files.sort((a, b) => {
      return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
    });
    
    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error listing PDF files:', error);
    return NextResponse.json(
      { error: 'Failed to list PDF files', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
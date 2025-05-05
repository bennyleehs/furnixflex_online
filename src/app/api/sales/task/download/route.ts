import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Define MIME types for common file extensions
const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  // Add more as needed
};

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');
    const fileName = searchParams.get('file');
    
    // Validate parameters
    if (!taskId || !fileName) {
      return NextResponse.json(
        { error: 'Both task ID and file name are required' },
        { status: 400 }
      );
    }
    
    // Sanitize filename to prevent directory traversal attacks
    const sanitizedFileName = fileName.replace(/\.\./g, '').replace(/\//g, '');
    
    // Construct file path
    const taskDir = path.join(process.cwd(), 'src', 'data', 'sales', 'task', taskId);
    const filePath = path.join(taskDir, sanitizedFileName);
    
    // Check if file exists
    if (!existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    // Read the file
    const fileBuffer = await fs.readFile(filePath);
    
    // Determine content type based on file extension
    const fileExt = path.extname(sanitizedFileName).toLowerCase();
    const contentType = MIME_TYPES[fileExt] || 'application/octet-stream';
    
    // Create response with file data
    const response = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${sanitizedFileName}"`,
        'Cache-Control': 'public, max-age=86400', // Cache for one day
      },
    });
    
    return response;
    
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
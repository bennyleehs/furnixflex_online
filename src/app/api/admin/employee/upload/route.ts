import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    // Check if this is a JSON request or a FormData request
    const contentType = request.headers.get('content-type') || '';
    
    // Handle JSON requests (updatePhoto functionality)
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { employeeId, photoUrl } = body;
      
      if (!employeeId || !photoUrl) {
        return NextResponse.json({ error: 'Employee ID and photo URL are required' }, { status: 400 });
      }
      
      // Here you'd update your database with the photo URL
      // Example: await prisma.employee.update({ where: { id: employeeId }, data: { profilePhoto: photoUrl } });
      
      // For this example, we'll just return success
      return NextResponse.json({ 
        success: true, 
        message: 'Employee photo URL updated in database'
      });
    }
    
    // Handle FormData requests (file uploads)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const employeeUid = formData.get('employeeUid') as string;
      const employeeId = formData.get('employeeId') as string;
      
      if (!employeeUid || !employeeId) {
        return NextResponse.json({ error: 'Employee UID and ID are required' }, { status: 400 });
      }
      
      // Check if this is a photo or document upload
      const photo = formData.get('photo') as File;
      const document = formData.get('document') as File;
      
      if (!photo && !document) {
        return NextResponse.json({ error: 'No file provided for upload' }, { status: 400 });
      }
      
      const file = photo || document;
      const fileType = photo ? 'photo' : 'document';
      
      // Create directory if it doesn't exist
      const uploadDir = path.join(process.cwd(), 'public', 'admin', 'employee', employeeUid, 'upload');
      
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      
      // Create a unique filename with appropriate prefix
      const timestamp = Date.now();
      const prefix = fileType === 'photo' ? 'profile' : 'doc';
      const filename = `${prefix}_${file.name}`;
    //   const filename = `${prefix}_${timestamp}_${file.name.replace(/\s+/g, '_')}`;
      const filePath = path.join(uploadDir, filename);
      
      // Convert the file to a Buffer and write it to the filesystem
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);
      
      // Return the URL to the uploaded file
      const fileUrl = `/admin/employee/${employeeUid}/upload/${filename}`;
      
      // If this is a photo upload, also update the employee record in the database
      if (fileType === 'photo') {
        // Here you could update your database directly
        // Instead, we're returning the URL so the client can make a separate call
      }
      
      // Return response with appropriate property name based on file type
      return NextResponse.json({ 
        success: true, 
        ...(fileType === 'photo' ? { photoUrl: fileUrl } : { documentUrl: fileUrl })
      });
    }
    
    // If we get here, the request is in an unsupported format
    return NextResponse.json({ error: 'Unsupported request format' }, { status: 400 });
    
  } catch (error) {
    console.error(`Error handling upload:`, error);
    return NextResponse.json({ 
      error: `Failed to process request: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
}

// Add GET method to retrieve documents for an employee
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const employeeUid = url.searchParams.get('employeeUid');
    
    if (!employeeUid) {
      return NextResponse.json({ error: 'Employee UID is required' }, { status: 400 });
    }
    
    // Path to the employee's upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'admin', 'employee', employeeUid, 'upload');
    
    // Check if directory exists
    if (!existsSync(uploadDir)) {
      // Return empty array if directory doesn't exist yet
      return NextResponse.json({ documents: [] });
    }
    
    // Read directory contents
    const files = fs.readdirSync(uploadDir);
    
    // Find profile photo
    const profilePhoto = files.find(file => file.startsWith('profile_'));
    const profilePhotoUrl = profilePhoto ? `/admin/employee/${employeeUid}/upload/${profilePhoto}` : null;
    
    // Filter and format document files
    const documents = files
      .filter(file => file.startsWith('doc_'))
      .map(file => {
        const stats = fs.statSync(path.join(uploadDir, file));
        const originalName = file.replace(/^doc_\d+_/, ''); // Remove prefix
        const timestamp = parseInt(file.split('_')[1]); // Get timestamp from filename
        
        return {
          id: timestamp,
          name: originalName,
          type: getFileType(originalName),
          size: stats.size,
          uploadDate: new Date(stats.mtime).toISOString().split('T')[0],
          url: `/admin/employee/${employeeUid}/upload/${file}`
        };
      });
    
    return NextResponse.json({ 
      profilePhoto: profilePhotoUrl,
      documents 
    });
    
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

// Add DELETE method to delete documents
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeUid, documentId } = body;
    
    if (!employeeUid || !documentId) {
      return NextResponse.json({ error: 'Employee UID and document ID are required' }, { status: 400 });
    }
    
    // Path to the employee's upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'admin', 'employee', employeeUid, 'upload');
    
    // Check if directory exists
    if (!existsSync(uploadDir)) {
      return NextResponse.json({ error: 'Upload directory not found' }, { status: 404 });
    }
    
    // Find the document with the matching ID (timestamp)
    const files = fs.readdirSync(uploadDir);
    const documentFile = files.find(file => {
      const parts = file.split('_');
      return parts.length >= 2 && file.startsWith('doc_') && parseInt(parts[1]) === documentId;
    });
    
    if (!documentFile) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    // Delete the file
    fs.unlinkSync(path.join(uploadDir, documentFile));
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ 
      error: `Failed to delete document: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
}

// Helper function to determine file type
function getFileType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
    return 'image/' + ext.substring(1);
  } else if (ext === '.pdf') {
    return 'application/pdf';
  } else if (['.doc', '.docx'].includes(ext)) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  } else if (['.xls', '.xlsx'].includes(ext)) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  } else {
    return 'application/octet-stream';
  }
}
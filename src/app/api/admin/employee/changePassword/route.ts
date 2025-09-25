//app/api/admin/employee/changePassword/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createPool } from "@/lib/db";

export async function POST(request: NextRequest) {
  const db = createPool();
  
  try {
    const body = await request.json();
    const { employeeId, employeeUid, newPassword } = body;
    
    // Step 1: Validate required fields
    if (!employeeId || !employeeUid || !newPassword) {
      return NextResponse.json({ 
        error: 'Employee ID, UID, and new password are required' 
      }, { status: 400 });
    }
    
    // Step 2: Password requirements validation
    if (newPassword.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters long' 
      }, { status: 400 });
    }
    
    // Additional password requirements (optional - uncomment if needed)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json({ 
        error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
      }, { status: 400 });
    }
    
    // Step 3: Verify employee exists
    const [userRows] = await db.query(
      "SELECT id, uid FROM users WHERE id = ? AND uid = ?",
      [employeeId, employeeUid]
    );
    
    const users = userRows as { id: number; uid: string }[];
    
    if (users.length === 0) {
      return NextResponse.json({ 
        error: 'Employee not found' 
      }, { status: 404 });
    }
    
    // Step 4: Hash the new password
    const saltRounds = 10; // Higher salt rounds for better security
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Step 5: Update the password in the database
    const [result] = await db.query(
      "UPDATE users SET password = ? WHERE id = ? AND uid = ?",
      [hashedPassword, employeeId, employeeUid]
    );
    
    const updateResult = result as { affectedRows: number };
    
    if (updateResult.affectedRows === 0) {
      return NextResponse.json({ 
        error: 'Failed to update password - employee not found or no changes made' 
      }, { status: 404 });
    }
    
    console.log(`✅ Password updated successfully for employee ID: ${employeeId}, UID: ${employeeUid}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error changing password:', error);
    return NextResponse.json({ 
      error: `Failed to change password: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  } finally {
    // Close the database connection
    // await db.end();
  }
}
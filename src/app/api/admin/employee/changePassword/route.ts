import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma'; // Adjust this import based on your project setup

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, employeeUid, newPassword } = body;
    
    if (!employeeId || !employeeUid || !newPassword) {
      return NextResponse.json({ error: 'Employee ID, UID, and new password are required' }, { status: 400 });
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the employee's password in the database
    // This depends on your database schema - adjust as needed
    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: { password: hashedPassword }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully'
    });
    
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json({ 
      error: `Failed to change password: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
}
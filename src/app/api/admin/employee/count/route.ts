import { createPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const db = createPool();
  
  try {
    const { searchParams } = new URL(request.url);
    const branch_id = searchParams.get('branch_id');
    const department_id = searchParams.get('department_id');

    if (!branch_id || !department_id) {
      return NextResponse.json({ error: 'Branch ID and Department ID are required' }, { status: 400 });
    }

    // Query users with matching branch_id and department_id
    const sql = `
      SELECT 
        COUNT(*) as count
      FROM users1
      WHERE branch_id = ? AND department_id = ?
    `;
    
    // Execute the query with parameters to get the count
    const [result] = await db.query<RowDataPacket[]>(sql, [branch_id, department_id]);
    
    // Get the count from the result
    const count = result[0].count;
    // console.log('Row count:', count); 
    
    // Generate the next number (count + 1)
    const nextNumber = count + 1;
    
    // Format with 4-digit leading zeros
    // const formattedNumber = nextNumber.toString().padStart(4, '0');
    // console.log('Formatted number:', formattedNumber);
    
    // Return both the numeric next number and the formatted string
    return NextResponse.json({ 
      nextNumber: nextNumber,
      // formattedNumber: formattedNumber 
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch employee count' }, { status: 500 });
  } finally {
  }
}
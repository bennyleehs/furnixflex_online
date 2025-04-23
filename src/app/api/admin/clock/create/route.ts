import { createPool } from "@/lib/db";
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.json(); // Parse the JSON body
    const db = createPool();

    const sql = `
      INSERT INTO rule_clock (
        branch_id, department_id, 
        work_start, work_end, 
        lunch_start, lunch_end, 
        allowance_in, create_date, updata_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const values = [
      formData.BranchId,
      formData.DepartmentId,
      formData['Work-Start'],
      formData['Work-End'],
      formData['Lunch-Start'],
      formData['Lunch-End'],
      formData['Allowance-in'],
    ];

    await db.query(sql, values);

    return NextResponse.json({ success: true, message: 'Rule created successfully' });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ success: false, error: 'Failed to process request' }, { status: 500 });
  }
}
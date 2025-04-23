import { createPool } from "@/lib/db";
import { NextResponse } from 'next/server';

export async function PATCH(request: Request) {
  try {
    const { id } = await request.json(); // Parse the JSON body to get the id
    const db = createPool();

    const sql = `
      UPDATE rule_clock
      SET status = 'History'
      WHERE id = ?
    `;

    const values = [id];

    await db.query(sql, values);

    return NextResponse.json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json({ success: false, error: 'Failed to update status' }, { status: 500 });
  }
}
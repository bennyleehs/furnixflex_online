import { createPool } from "@/lib/db";
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      console.error('Phone number is missing from the query params.');
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }

    const db = createPool();
    console.log(`Checking for phone number: ${phone}`);

    const [rows] = await db.query(
      "SELECT id, name FROM customers WHERE phone1 = ? OR phone2 = ?",
      [phone, phone]
    );

    const customers = rows as any[];

    if (customers.length > 0) {
      console.log(`Found existing customer: ${customers[0].name}`);
      return NextResponse.json({ 
        exists: true, 
        customer: customers[0] 
      });
    }

    console.log('No existing customer found.');
    return NextResponse.json({ exists: false });

  } catch (error) {
    console.error('Error checking phone number:', error);
    // Return a JSON error response even in the catch block
    return NextResponse.json({ success: false, error: 'Failed to check phone number' }, { status: 500 });
  }
}
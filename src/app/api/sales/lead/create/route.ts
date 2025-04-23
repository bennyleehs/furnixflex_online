import { createPool } from "@/lib/db";
import { NextResponse } from 'next/server';
import { ResultSetHeader } from 'mysql2/promise'; // Import from mysql2/promise

export async function POST(request: Request) {
  try {
    const formData = await request.json(); // Parse the JSON body
    const db = createPool();

    const sql = `
      INSERT INTO customers1 (
        source, interested, add_info, 
        name, nric,
        phone1, phone2, email,
        address_line1, address_line2,
        postcode, city, state, country,
        status, sales_id,
        created_at, updated_at
      )
      VALUES (
        ?, ?, 
        ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?, 
        ?, ?, ?, 
        ?, ?, 
        NOW(), NOW()
      )`;

    const values = [
      formData['source'], formData['interested'], formData['add_info'],
      formData['name'], formData['nric'],
      formData['phone1'], formData['phone2'], formData['email'],
      formData['address_line1'], formData['address_line2'],
      formData['postcode'], formData['city'], formData['state'], formData['country'],
      formData['status'], formData['sales_id'],
    ];

    await db.query(sql, values);

    return NextResponse.json({ success: true, message: 'Lead created successfully' });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ success: false, error: 'Failed to process request' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url); // Parse the request URL
    const id = url.searchParams.get('id'); // Extract the `id` from the query parameters

    if (!id) {
      return NextResponse.json({ success: false, error: 'Employee ID is required for update' }, { status: 400 });
    }

    const formData = await request.json(); // Parse the JSON body
    const db = createPool();

    const sql = `
      UPDATE customers1
      SET
        source = ?, interested = ?, add_info = ?, 
        name = ?, nric = ?,
        phone1 = ?, phone2 = ?, email = ?,
        address_line1 = ?, address_line2 = ?,
        postcode = ?, city = ?, state = ?, country = ?,
        status = ?, sales_id = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    const values = [
      formData['source'], formData['interested'], formData['add_info'],
      formData['name'], formData['nric'],
      formData['phone1'], formData['phone2'], formData['email'],
      formData['address_line1'], formData['address_line2'],
      formData['postcode'], formData['city'], formData['state'], formData['country'],
      formData['status'], formData['sales_id'],
      id // Use the `id` from the URL
    ];

    const [result] = await db.query<ResultSetHeader>(sql, values);

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Branch not found or no changes made' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Branch updated successfully' });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ success: false, error: 'Failed to process request' }, { status: 500 });
  }
}
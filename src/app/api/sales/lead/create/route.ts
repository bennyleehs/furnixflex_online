import { getPool } from "@/lib/db";
import { NextResponse } from 'next/server';
import { ResultSetHeader } from 'mysql2/promise'; // Import from mysql2/promise

export async function POST(request: Request) {
  try {
    const formData = await request.json(); // Parse the JSON body
    const db = await getPool();

    const sql = `
      INSERT INTO customers (
        source, interested, add_info, 
        name, nric,
        phone1, phone2, email,
        address_line1, address_line2,
        postcode, city, state, country,
        status, sales_id,
        assigned_by,
        created_at, updated_at
      )
      VALUES (
        ?, ?, 
        ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?, 
        ?, ?, ?, 
        ?, ?, 
        ?,
        NOW(), NOW()
      )`;

    const values = [
      formData['source'], formData['interested'], formData['add_info'],
      formData['name'], formData['nric'],
      formData['phone1'], formData['phone2'], formData['email'],
      formData['address_line1'], formData['address_line2'],
      formData['postcode'], formData['city'], formData['state'], formData['country'],
      formData['status'], formData['sales_id'],
      formData['assigned_by'],
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
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Lead is required for update' }, { status: 400 });
    }

    const formData = await request.json();
    const db = await getPool();

    // Update SQL query to include property_type and security_access fields
    const sql = `
      UPDATE customers
      SET
        source = ?, interested = ?, add_info = ?, 
        name = ?, nric = ?,
        phone1 = ?, phone2 = ?, email = ?,
        address_line1 = ?, address_line2 = ?,
        postcode = ?, city = ?, state = ?, country = ?,
        property = ?, guard = ?,
        status = ?, sales_id = ?,
        assigned_by = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    // Update values array to include property_type and security_access values
    const values = [
      formData['source'], formData['interested'], formData['add_info'],
      formData['name'], formData['nric'],
      formData['phone1'], formData['phone2'], formData['email'],
      formData['address_line1'], formData['address_line2'],
      formData['postcode'], formData['city'], formData['state'], formData['country'],
      formData['property'], formData['guard'],
      formData['status'], formData['sales_id'],
      formData['assigned_by'],
      id
    ];

    const [result] = await db.query<ResultSetHeader>(sql, values);

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Lead not found or no changes made' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Customer updated successfully',
      data: {
        id,
        ...formData
      }
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ success: false, error: 'Failed to process request' }, { status: 500 });
  }
}
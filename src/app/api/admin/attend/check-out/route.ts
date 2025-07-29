import { NextRequest, NextResponse } from 'next/server';
import { createPool } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getAddressFromCoordinates } from '@/lib/location';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_id,
      latitude,
      longitude,
      accuracy,
      device_info,
      session_id
    } = body;

    if (!employee_id) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    const db = createPool();
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date();
    
    // Get client IP address
    const ip_address = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      '127.0.0.1';

    // Get address from coordinates if provided
    let address = null;
    if (latitude && longitude) {
      try {
        address = await getAddressFromCoordinates(latitude, longitude);
      } catch (error) {
        console.error('Error getting address:', error);
      }
    }

    // Find today's attendance record
    const [attendanceRecord] = await db.query<RowDataPacket[]>(
      'SELECT * FROM attendance_records WHERE employee_id = ? AND date = ?',
      [employee_id, today]
    );

    if (attendanceRecord.length === 0) {
      return NextResponse.json(
        { error: 'No check-in record found for today' },
        { status: 404 }
      );
    }

    const record = attendanceRecord[0];
    
    if (record.check_out_time) {
      return NextResponse.json(
        { error: 'Already checked out today', record },
        { status: 409 }
      );
    }

    if (!record.check_in_time) {
      return NextResponse.json(
        { error: 'Must check in before checking out' },
        { status: 400 }
      );
    }

    // Calculate working hours
    const checkInTime = new Date(record.check_in_time);
    const checkOutTime = currentTime;
    const totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    
    // Update attendance record with check-out information
    await db.query<ResultSetHeader>(
      `UPDATE attendance_records SET 
       check_out_time = ?,
       check_out_latitude = ?,
       check_out_longitude = ?,
       check_out_address = ?,
       check_out_ip_address = ?,
       check_out_device_info = ?,
       total_hours = ?,
       working_hours = ?,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        currentTime,
        latitude || null,
        longitude || null,
        address,
        ip_address,
        JSON.stringify(device_info),
        totalHours,
        totalHours, // You can subtract break hours later
        record.id
      ]
    );

    // Update login session
    if (session_id) {
      await db.query<ResultSetHeader>(
        'UPDATE login_sessions SET logout_time = ?, is_active = FALSE WHERE session_id = ?',
        [currentTime, session_id]
      );
    }

    // Get the updated record
    const [updatedRecord] = await db.query<RowDataPacket[]>(
      'SELECT * FROM attendance_records WHERE id = ?',
      [record.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Check-out successful',
      record: updatedRecord[0],
      total_hours: totalHours.toFixed(2)
    });

  } catch (error) {
    console.error('Error during check-out:', error);
    return NextResponse.json(
      { error: 'Failed to record check-out' },
      { status: 500 }
    );
  }
}
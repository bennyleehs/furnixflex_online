import { NextRequest, NextResponse } from 'next/server';
import { createPool } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { calculateDistance, getAddressFromCoordinates } from '@/lib/location';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_id,
      employee_name,
      latitude,
      longitude,
      accuracy,
      device_info,
      session_id
    } = body;

    if (!employee_id || !employee_name) {
      return NextResponse.json(
        { error: 'Employee ID and name are required' },
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

    // Check if user already checked in today
    const [existingRecord] = await db.query<RowDataPacket[]>(
      'SELECT id, check_in_time FROM attendance_records WHERE employee_id = ? AND date = ?',
      [employee_id, today]
    );

    let attendanceId;
    
    if (existingRecord.length > 0) {
      if (existingRecord[0].check_in_time) {
        return NextResponse.json(
          { error: 'Already checked in today', record: existingRecord[0] },
          { status: 409 }
        );
      }
      
      // Update existing record with check-in information
      await db.query<ResultSetHeader>(
        `UPDATE attendance_records SET 
         check_in_time = ?, 
         check_in_latitude = ?, 
         check_in_longitude = ?,
         check_in_address = ?,
         check_in_ip_address = ?,
         check_in_device_info = ?,
         location_accuracy = ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          currentTime,
          latitude || null,
          longitude || null,
          address,
          ip_address,
          JSON.stringify(device_info),
          accuracy || null,
          existingRecord[0].id
        ]
      );
      
      attendanceId = existingRecord[0].id;
    } else {
      // Create new attendance record
      const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO attendance_records (
          employee_id, employee_name, date, check_in_time,
          check_in_latitude, check_in_longitude, check_in_address,
          check_in_ip_address, check_in_device_info, location_accuracy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          employee_id,
          employee_name,
          today,
          currentTime,
          latitude || null,
          longitude || null,
          address,
          ip_address,
          JSON.stringify(device_info),
          accuracy || null
        ]
      );
      
      attendanceId = result.insertId;
    }

    // Check if location is within office premises
    let isOfficeLocation = false;
    if (latitude && longitude) {
      const [officeLocations] = await db.query<RowDataPacket[]>(
        'SELECT * FROM office_locations WHERE is_active = TRUE'
      );
      
      for (const office of officeLocations) {
        const distance = calculateDistance(
          latitude, longitude,
          office.latitude, office.longitude
        );
        
        if (distance <= office.radius) {
          isOfficeLocation = true;
          break;
        }
      }
    }

    // Update location verification
    await db.query<ResultSetHeader>(
      'UPDATE attendance_records SET is_location_verified = ?, is_office_location = ? WHERE id = ?',
      [latitude && longitude ? true : false, isOfficeLocation, attendanceId]
    );

    // Create/Update login session
    if (session_id) {
      await db.query<ResultSetHeader>(
        `INSERT INTO login_sessions (
          session_id, employee_id, employee_name, 
          login_latitude, login_longitude, login_address,
          ip_address, user_agent, device_type,
          is_location_verified, location_accuracy, is_office_location
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        login_latitude = VALUES(login_latitude),
        login_longitude = VALUES(login_longitude),
        login_address = VALUES(login_address),
        is_location_verified = VALUES(is_location_verified),
        location_accuracy = VALUES(location_accuracy),
        is_office_location = VALUES(is_office_location)`,
        [
          session_id,
          employee_id,
          employee_name,
          latitude || null,
          longitude || null,
          address,
          ip_address,
          device_info?.userAgent || null,
          device_info?.deviceType || null,
          latitude && longitude ? true : false,
          accuracy || null,
          isOfficeLocation
        ]
      );
    }

    // Get the updated record
    const [record] = await db.query<RowDataPacket[]>(
      'SELECT * FROM attendance_records WHERE id = ?',
      [attendanceId]
    );

    return NextResponse.json({
      success: true,
      message: 'Check-in successful',
      record: record[0],
      location_verified: latitude && longitude ? true : false,
      is_office_location: isOfficeLocation
    });

  } catch (error) {
    console.error('Error during check-in:', error);
    return NextResponse.json(
      { error: 'Failed to record check-in' },
      { status: 500 }
    );
  }
}
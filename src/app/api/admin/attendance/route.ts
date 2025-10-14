import { createPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    const db = createPool();
    let sql = `
    SELECT
        attendance.id AS attendance_id, attendance.user_id, tracking_date, tracking_day, 
        checkin_time, checkout_time, 
        checkin_address AS "Check in Location", checkout_address AS "Check out Location", 
        checkin_latitude, checkin_longitude, 
        checkout_latitude, checkout_longitude, 
        total_minutes,
        u.id AS users_id, u.name AS employee_name
    FROM attendance
    LEFT JOIN users u ON attendance.user_id = u.id`;

    if (id) {
      sql += ` WHERE attendance.id = ?`;
    }

    const [rows] = id
      ? await db.query<RowDataPacket[]>(sql, [id])
      : await db.query<RowDataPacket[]>(sql);

    if (id && rows.length === 0) {
      return NextResponse.json(
        { message: "Attendance list not found" },
        { status: 404 },
      );
    }

    // Return the raw rows directly
    return NextResponse.json(id ? rows[0] : { listAttendance: rows }, {
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching attendance list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

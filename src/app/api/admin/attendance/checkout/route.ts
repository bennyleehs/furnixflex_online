import { NextResponse, NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { calculateDistance } from "@/lib/location";
import { RowDataPacket } from "mysql2/promise";

export async function POST(req: NextRequest) {
  const db = await getPool();

  try {
    const { uid: uid, latitude, longitude } = await req.json();

    if (!uid) {
      return NextResponse.json(
        { error: "User ID (UID) is required" },
        { status: 400 },
      );
    }

    const [userRows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE uid = ?",
      [uid],
    );

    if (!userRows || userRows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = userRows[0].id;

    const today = new Date();
    const tracking_date = today.toISOString().slice(0, 10);
    const checkout_time = today.toISOString().slice(11, 19);

    const [records] = await db.query(
      "SELECT * FROM attendance WHERE user_id = ? AND tracking_date = ? LIMIT 1",
      [userId, tracking_date],
    );

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: "No check-in record found for today." },
        { status: 404 },
      );
    }

    const record: any = records[0];

    // --- START OF MODIFICATION ---
    // If the record already has a checkout time, return the existing record
    // with a success message, so the frontend doesn't show an error.
    if (record.checkout_time) {
      return NextResponse.json(
        {
          success: true,
          message: "You have already checked out today.",
          record: record,
        },
        { status: 200 },
      );
    }
    // --- END OF MODIFICATION ---

    const [checkInTimeRows] = await db.query(
      "SELECT TIME_TO_SEC(TIMEDIFF(?, ?)) / 60 as total_minutes",
      [checkout_time, record.checkin_time],
    );
    const total_minutes = (checkInTimeRows as any[])[0].total_minutes;

    const officeLat = 1.46881;
    const officeLon = 103.57751;
    const maxDistanceInMeters = 50;

    let checkout_address_status = record.checkin_address;
    if (latitude && longitude) {
      const distance = calculateDistance(
        latitude,
        longitude,
        officeLat,
        officeLon,
      );
      if (distance <= maxDistanceInMeters) {
        checkout_address_status = "Office Location";
      } else {
        checkout_address_status = "Remote Location";
      }
    }

    await db.query(
      "UPDATE attendance SET checkout_time = ?, checkout_latitude = ?, checkout_longitude = ?, checkout_address = ?, total_minutes = ?, updated_at = NOW() WHERE id = ?",
      [
        checkout_time,
        latitude,
        longitude,
        checkout_address_status,
        total_minutes,
        record.id,
      ],
    );

    const [updatedRecordRows] = await db.query(
      "SELECT * FROM attendance WHERE id = ?",
      [record.id],
    );

    return NextResponse.json({
      success: true,
      message: "Check-out successful",
      record: Array.isArray(updatedRecordRows)
        ? updatedRecordRows[0]
        : updatedRecordRows,
    });
  } catch (error) {
    console.error("Error during check-out:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

import { NextResponse, NextRequest } from "next/server";
import { createPool } from "@/lib/db";
import { calculateDistance } from "@/lib/location";
import { RowDataPacket } from "mysql2/promise";

export async function POST(req: NextRequest) {
  const db = createPool();

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
    const tracking_day = today.toLocaleDateString("en-US", { weekday: "long" });
    const checkin_time = today.toISOString().slice(11, 19);

    // Step 2: Check for an existing attendance record using the fetched user ID
    const [existingRecords] = await db.query<RowDataPacket[]>(
      "SELECT * FROM attendance WHERE user_id = ? AND tracking_date = ?",
      [userId, tracking_date],
    );

    // --- START OF FIX ---
    // If a record already exists, return it with a success status.
    // This allows the frontend to update its state correctly without showing an error.
    if (Array.isArray(existingRecords) && existingRecords.length > 0) {
      return NextResponse.json(
        {
          success: true,
          message: "You have already checked in today.",
          record: existingRecords[0],
        },
        { status: 200 },
      ); // Return status 200 OK
    }
    // --- END OF FIX ---

    const officeLat = 1.48212;
    const officeLon = 103.57796;
    const maxDistanceInMeters = 50;

    let checkin_address_status = "Remote Location";
    if (latitude && longitude) {
      const distance = calculateDistance(
        latitude,
        longitude,
        officeLat,
        officeLon,
      );
      if (distance <= maxDistanceInMeters) {
        checkin_address_status = "Office Location";
      }
    }

    const insertRecord = {
      user_id: userId,
      tracking_date: tracking_date,
      tracking_day: tracking_day,
      checkin_time: checkin_time,
      checkin_latitude: latitude,
      checkin_longitude: longitude,
      checkin_address: checkin_address_status,
      checkout_time: null,
      checkout_address: null,
      checkout_latitude: null,
      checkout_longitude: null,
      total_minutes: 0,
    };

    const [result] = await db.query(
      "INSERT INTO attendance SET ?",
      insertRecord,
    );

    const newRecordId = (result as any).insertId;
    const [newRecordRows] = await db.query<RowDataPacket[]>(
      "SELECT * FROM attendance WHERE id = ?",
      [newRecordId],
    );

    return NextResponse.json({
      success: true,
      message: "Check-in successful",
      record: newRecordRows[0],
    });
  } catch (error) {
    console.error("Error during check-in:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

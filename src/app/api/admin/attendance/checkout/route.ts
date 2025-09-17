// // the table i already created and i listed down here for reference
// // table attendance
// // - id (Auto increment)
// // - user_id (foreign key :table users (column id))
// // - tracking_date: intend for take today/now date
// // - tracking_day: intend for take today/now day (Monday etc)
// // checkin_time: using type time
// // checkout_time: using type time
// // - checkin_address: combination of checkin latitude, longitude (i set type: varchar 100)
// // - checkout_address: combination of checkout latitude, longitude i set type: varchar 100)
// // - checkin_latitude: im using type double
// // - checkin_longitude: im using type double
// // - checkout_latitude: im using type double
// // - checkout_longitude: im using type double
// // - total_minutes: type decimal. intend to calculate from checkin_time to checkout_time and get the total in minutes
// // - created_at: type timestamp
// // - updated_at: type timestamp

// // table users
// // id: auto increment. used by the table attendance

// export async function POST(request: Request) {
//     // update that id & date today:
//     //  update into record (checkout)
// }

// // src/app/api/admin/attendance/checkout/route.ts
// import { NextResponse, NextRequest } from "next/server";
// import { createPool } from "@/lib/db";
// import { calculateDistance } from "@/lib/location";

// export async function POST(req: NextRequest) {
//   const db = createPool();

//   try {
//     const { user_id, latitude, longitude } = await req.json();

//     if (!user_id) {
//       return NextResponse.json(
//         { error: "User ID is required" },
//         { status: 400 },
//       );
//     }

//     const today = new Date();
//     const tracking_date = today.toISOString().slice(0, 10); // YYYY-MM-DD
//     const checkout_time = today.toISOString().slice(11, 19); // HH:MM:SS

//     // Find today's attendance record for the user
//     const [records] = await db.query(
//       "SELECT * FROM attendance WHERE user_id = ? AND tracking_date = ? LIMIT 1",
//       [user_id, tracking_date],
//     );

//     if (!Array.isArray(records) || records.length === 0) {
//       return NextResponse.json(
//         { error: "No check-in record found for today." },
//         { status: 404 },
//       );
//     }

//     const record: any = records[0];

//     if (record.checkout_time) {
//       return NextResponse.json(
//         { error: "You have already checked out today." },
//         { status: 409 },
//       );
//     }

//     // Calculate total minutes
//     const [checkInTimeRows] = await db.query(
//       "SELECT TIME_TO_SEC(TIMEDIFF(?, ?)) / 60 as total_minutes",
//       [checkout_time, record.checkin_time],
//     );
//     const total_minutes = (checkInTimeRows as any[])[0].total_minutes;
    
//     // Office coordinates (replace with your actual office coordinates)
//     const officeLat = 1.46881;
//     const officeLon = 103.57751;
//     const maxDistanceInMeters = 50; // 50 meters radius

//     let checkout_address_status = record.checkin_address; // Use the check-in status by default
//     if (latitude && longitude) {
//       const distance = calculateDistance(
//         latitude,
//         longitude,
//         officeLat,
//         officeLon,
//       );
//       if (distance <= maxDistanceInMeters) {
//         checkout_address_status = "Office Location";
//       } else {
//         checkout_address_status = "Remote Location";
//       }
//     }

//     // Update the record
//     await db.query(
//       "UPDATE attendance SET checkout_time = ?, checkout_latitude = ?, checkout_longitude = ?, checkout_address = ?, total_minutes = ? WHERE id = ?",
//       [
//         checkout_time,
//         latitude,
//         longitude,
//         checkout_address_status,
//         total_minutes,
//         record.id,
//       ],
//     );

//     return NextResponse.json({
//       success: true,
//       message: "Check-out successful",
//       total_minutes: total_minutes,
//       record: {
//         ...record,
//         checkout_time: checkout_time,
//         total_minutes: total_minutes,
//         checkout_address: checkout_address_status
//       },
//     });
//   } catch (error) {
//     console.error("Error during check-out:", error);
//     return NextResponse.json(
//       { error: "Internal Server Error" },
//       { status: 500 },
//     );
//   } 
// //   finally {
// //     await db.end();
// //   }
// }

// // v1.3
// // src/app/api/admin/attendance/checkout/route.ts
// import { NextResponse, NextRequest } from "next/server";
// import { createPool } from "@/lib/db";
// import { calculateDistance } from "@/lib/location";

// export async function POST(req: NextRequest) {
//   const db = createPool();

//   try {
//     const { user_id: uid, latitude, longitude } = await req.json();

//     if (!uid) {
//       return NextResponse.json(
//         { error: "User ID (UID) is required" },
//         { status: 400 },
//       );
//     }

//     // Step 1: Get the auto-incrementing user ID from the users table using the UID
//     const [userRows] = await db.query("SELECT id FROM users WHERE uid = ?", [
//       uid,
//     ]);
//     const user = Array.isArray(userRows) ? userRows[0] : null;

//     if (!user) {
//       return NextResponse.json({ error: "User not found" }, { status: 404 });
//     }

//     const userId = user.id;

//     const today = new Date();
//     const tracking_date = today.toISOString().slice(0, 10);
//     const checkout_time = today.toISOString().slice(11, 19);

//     // Step 2: Find today's attendance record using the fetched user ID
//     const [records] = await db.query(
//       "SELECT * FROM attendance WHERE user_id = ? AND tracking_date = ? LIMIT 1",
//       [userId, tracking_date],
//     );

//     if (!Array.isArray(records) || records.length === 0) {
//       return NextResponse.json(
//         { error: "No check-in record found for today." },
//         { status: 404 },
//       );
//     }

//     const record: any = records[0];

//     if (record.checkout_time) {
//       return NextResponse.json(
//         { error: "You have already checked out today." },
//         { status: 409 },
//       );
//     }

//     // Calculate total minutes
//     const [checkInTimeRows] = await db.query(
//       "SELECT TIME_TO_SEC(TIMEDIFF(?, ?)) / 60 as total_minutes",
//       [checkout_time, record.checkin_time],
//     );
//     const total_minutes = (checkInTimeRows as any[])[0].total_minutes;

//     const officeLat = 1.46881;
//     const officeLon = 103.57751;
//     const maxDistanceInMeters = 50;

//     let checkout_address_status = record.checkin_address;
//     if (latitude && longitude) {
//       const distance = calculateDistance(
//         latitude,
//         longitude,
//         officeLat,
//         officeLon,
//       );
//       if (distance <= maxDistanceInMeters) {
//         checkout_address_status = "Office Location";
//       } else {
//         checkout_address_status = "Remote Location";
//       }
//     }

//     // Update the record using the record's primary key `id`
//     await db.query(
//       "UPDATE attendance SET checkout_time = ?, checkout_latitude = ?, checkout_longitude = ?, checkout_address = ?, total_minutes = ? WHERE id = ?",
//       [
//         checkout_time,
//         latitude,
//         longitude,
//         checkout_address_status,
//         total_minutes,
//         record.id,
//       ],
//     );

//     // Fetch the updated record to return to the frontend
//     const [updatedRecordRows] = await db.query(
//       "SELECT * FROM attendance WHERE id = ?",
//       [record.id],
//     );

//     return NextResponse.json({
//       success: true,
//       message: "Check-out successful",
//       record: Array.isArray(updatedRecordRows)
//         ? updatedRecordRows[0]
//         : updatedRecordRows,
//     });
//   } catch (error) {
//     console.error("Error during check-out:", error);
//     return NextResponse.json(
//       { error: "Internal Server Error" },
//       { status: 500 },
//     );
//   }
// }

// // v1.4
// // src/app/api/admin/attendance/checkout/route.ts
// import { NextResponse, NextRequest } from "next/server";
// import { createPool } from "@/lib/db";
// import { calculateDistance } from "@/lib/location";
// import { RowDataPacket } from "mysql2/promise"; // Import RowDataPacket

// export async function POST(req: NextRequest) {
//   const db = createPool();

//   try {
//     const { uid: uid, latitude, longitude } = await req.json();

//     if (!uid) {
//       return NextResponse.json(
//         { error: "User ID (UID) is required" },
//         { status: 400 },
//       );
//     }

//     // Step 1: Get the auto-incrementing user ID from the users table using the UID
//     const [userRows] = await db.query<RowDataPacket[]>("SELECT id FROM users WHERE uid = ?", [
//       uid,
//     ]);

//     if (!userRows || userRows.length === 0) {
//       return NextResponse.json({ error: "User not found" }, { status: 404 });
//     }

//     const userId = userRows[0].id; // Corrected: Access id from the first element of the array

//     const today = new Date();
//     const tracking_date = today.toISOString().slice(0, 10);
//     const checkout_time = today.toISOString().slice(11, 19);

//     // Step 2: Find today's attendance record using the fetched user ID
//     const [records] = await db.query(
//       "SELECT * FROM attendance WHERE user_id = ? AND tracking_date = ? LIMIT 1",
//       [userId, tracking_date],
//     );

//     if (!Array.isArray(records) || records.length === 0) {
//       return NextResponse.json(
//         { error: "No check-in record found for today." },
//         { status: 404 },
//       );
//     }

//     const record: any = records[0];

//     if (record.checkout_time) {
//       return NextResponse.json(
//         { error: "You have already checked out today." },
//         { status: 409 },
//       );
//     }

//     // Calculate total minutes
//     const [checkInTimeRows] = await db.query(
//       "SELECT TIME_TO_SEC(TIMEDIFF(?, ?)) / 60 as total_minutes",
//       [checkout_time, record.checkin_time],
//     );
//     const total_minutes = (checkInTimeRows as any[])[0].total_minutes;

//     const officeLat = 1.46881;
//     const officeLon = 103.57751;
//     const maxDistanceInMeters = 50;

//     let checkout_address_status = record.checkin_address;
//     if (latitude && longitude) {
//       const distance = calculateDistance(
//         latitude,
//         longitude,
//         officeLat,
//         officeLon,
//       );
//       if (distance <= maxDistanceInMeters) {
//         checkout_address_status = "Office Location";
//       } else {
//         checkout_address_status = "Remote Location";
//       }
//     }

//     // Update the record using the record's primary key `id`
//     await db.query(
//       "UPDATE attendance SET checkout_time = ?, checkout_latitude = ?, checkout_longitude = ?, checkout_address = ?, total_minutes = ? WHERE id = ?",
//       [
//         checkout_time,
//         latitude,
//         longitude,
//         checkout_address_status,
//         total_minutes,
//         record.id,
//       ],
//     );

//     // Fetch the updated record to return to the frontend
//     const [updatedRecordRows] = await db.query(
//       "SELECT * FROM attendance WHERE id = ?",
//       [record.id],
//     );

//     return NextResponse.json({
//       success: true,
//       message: "Check-out successful",
//       record: Array.isArray(updatedRecordRows)
//         ? updatedRecordRows[0]
//         : updatedRecordRows,
//     });
//   } catch (error) {
//     console.error("Error during check-out:", error);
//     return NextResponse.json(
//       { error: "Internal Server Error" },
//       { status: 500 },
//     );
//   }
// }

//gemini
// v1.5
// src/app/api/admin/attendance/checkout/route.ts
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

    const [userRows] = await db.query<RowDataPacket[]>("SELECT id FROM users WHERE uid = ?", [
      uid,
    ]);

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
      return NextResponse.json({
        success: true,
        message: "You have already checked out today.",
        record: record
      }, { status: 200 });
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
      "UPDATE attendance SET checkout_time = ?, checkout_latitude = ?, checkout_longitude = ?, checkout_address = ?, total_minutes = ? WHERE id = ?",
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
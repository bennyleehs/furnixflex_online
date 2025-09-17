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
//     // if no record for today:
//     //  insert into record

//     //  setback if existing record():
//     // find id, checkin
//     //  update into record (checkin)
//     //basically not possible
// }

// // src/app/api/admin/attendance/checkin/route.ts
// import { NextResponse, NextRequest } from "next/server";
// import { createPool } from "@/lib/db";
// import { calculateDistance } from "@/lib/location";

// export async function POST(req: NextRequest) {
//   const db = createPool();

//   try {
//     const { user_id, latitude, longitude, device_info } =
//       await req.json();

//     if (!user_id) {
//       return NextResponse.json(
//         { error: "User ID is required" },
//         { status: 400 },
//       );
//     }

//     const today = new Date();
//     const tracking_date = today.toISOString().slice(0, 10); // Format: YYYY-MM-DD
//     const tracking_day = today.toLocaleDateString("en-US", { weekday: "long" }); // e.g., "Monday"
//     const checkin_time = today.toISOString().slice(11, 19); // Format: HH:MM:SS

//     // Check if the user has already checked in today
//     const [existingRecords] = await db.query(
//       "SELECT * FROM attendance WHERE user_id = ? AND tracking_date = ?",
//       [user_id, tracking_date],
//     );

//     if (Array.isArray(existingRecords) && existingRecords.length > 0) {
//       return NextResponse.json(
//         { error: "You have already checked in today." },
//         { status: 409 },
//       );
//     }

//     // Office coordinates (replace with your actual office coordinates)
//     const officeLat = 1.46881;
//     const officeLon = 103.57751;
//     const maxDistanceInMeters = 50; // 50 meters radius

//     let checkin_address_status = "Remote Location";
//     if (latitude && longitude) {
//       const distance = calculateDistance(
//         latitude,
//         longitude,
//         officeLat,
//         officeLon,
//       );
//       if (distance <= maxDistanceInMeters) {
//         checkin_address_status = "Office Location";
//       }
//     }

//     const insertRecord = {
//       user_id: user_id,
//       tracking_date: tracking_date,
//       tracking_day: tracking_day,
//       checkin_time: checkin_time,
//       checkin_latitude: latitude,
//       checkin_longitude: longitude,
//       checkin_address: checkin_address_status,
//       // The other fields will be null initially
//       checkout_time: null,
//       checkout_address: null,
//       checkout_latitude: null,
//       checkout_longitude: null,
//       total_minutes: 0,
//     };

//     const [result] = await db.query("INSERT INTO attendance SET ?", insertRecord);

//     const newRecordId = (result as any).insertId;
//     const [newRecord] = await db.query(
//       "SELECT * FROM attendance WHERE id = ?",
//       newRecordId,
//     );

//     return NextResponse.json({
//       success: true,
//       message: "Check-in successful",
//       record: newRecord,
//     });
//   } catch (error) {
//     console.error("Error during check-in:", error);
//     return NextResponse.json(
//       { error: "Internal Server Error" },
//       { status: 500 },
//     );
//   } 
// //   finally {
// //     await db.end();
// //   }
// }

// //v1.2
// // src/app/api/admin/attendance/checkin/route.ts
// import { NextResponse, NextRequest } from "next/server";
// import { createPool } from "@/lib/db";
// import { calculateDistance } from "@/lib/location";

// export async function POST(req: NextRequest) {
//   const db = createPool();

//   try {
//     const { user_id, user_name, latitude, longitude, device_info } =
//       await req.json();

//     if (!user_id) {
//       return NextResponse.json(
//         { error: "User ID is required" },
//         { status: 400 },
//       );
//     }

//     const today = new Date();
//     const tracking_date = today.toISOString().slice(0, 10); // Format: YYYY-MM-DD
//     const tracking_day = today.toLocaleDateString("en-US", { weekday: "long" }); // e.g., "Monday"
//     const checkin_time = today.toISOString().slice(11, 19); // Format: HH:MM:SS

//     // Check if the user has already checked in today
//     const [existingRecords] = await db.query(
//       "SELECT * FROM attendance WHERE user_id = ? AND tracking_date = ?",
//       [user_id, tracking_date],
//     );

//     if (Array.isArray(existingRecords) && existingRecords.length > 0) {
//       return NextResponse.json(
//         { error: "You have already checked in today." },
//         { status: 409 },
//       );
//     }

//     // Office coordinates (replace with your actual office coordinates)
//     // const officeLat = 1.46881;
//     // const officeLon = 103.57751;
//     const officeLat = 1.48212;
//     const officeLon = 103.57796;
//     const maxDistanceInMeters = 50; // 50 meters radius

//     let checkin_address_status = "Remote Location";
//     if (latitude && longitude) {
//       const distance = calculateDistance(
//         latitude,
//         longitude,
//         officeLat,
//         officeLon,
//       );
//       if (distance <= maxDistanceInMeters) {
//         checkin_address_status = "Office Location";
//       }
//     }

//     const insertRecord = {
//       user_id: user_id,
//       tracking_date: tracking_date,
//       tracking_day: tracking_day,
//       checkin_time: checkin_time,
//       checkin_latitude: latitude,
//       checkin_longitude: longitude,
//       checkin_address: checkin_address_status,
//       // The other fields will be null initially
//       checkout_time: null,
//       checkout_address: null,
//       checkout_latitude: null,
//       checkout_longitude: null,
//       total_minutes: 0,
//     };

//     const [result] = await db.query(
//       "INSERT INTO attendance SET ?",
//       insertRecord,
//     );

//     const newRecordId = (result as any).insertId;
//     const [newRecordRows] = await db.query(
//       "SELECT * FROM attendance WHERE id = ?",
//       newRecordId,
//     );

//     console.log("New record created:", newRecordRows);

//     return NextResponse.json({
//       success: true,
//       message: "Check-in successful",
//       record: Array.isArray(newRecordRows) ? newRecordRows[0] : newRecordRows,
//     });
//   } catch (error) {
//     console.error("Error during check-in:", error);
//     return NextResponse.json(
//       { error: "Internal Server Error" },
//       { status: 500 },
//     );
//   } finally {
//     // This part should not be here in production. It closes the pool.
//     // await db.end(); 
//   }
// }

// // v1.3
// // src/app/api/admin/attendance/checkin/route.ts
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
//     const tracking_day = today.toLocaleDateString("en-US", { weekday: "long" });
//     const checkin_time = today.toISOString().slice(11, 19);

//     // Step 2: Check for an existing attendance record using the fetched user ID
//     const [existingRecords] = await db.query(
//       "SELECT * FROM attendance WHERE user_id = ? AND tracking_date = ?",
//       [userId, tracking_date],
//     );

//     if (Array.isArray(existingRecords) && existingRecords.length > 0) {
//       return NextResponse.json(
//         { error: "You have already checked in today." },
//         { status: 409 },
//       );
//     }

//     const officeLat = 1.48212;
//     const officeLon = 103.57796;
//     const maxDistanceInMeters = 50;

//     let checkin_address_status = "Remote Location";
//     if (latitude && longitude) {
//       const distance = calculateDistance(
//         latitude,
//         longitude,
//         officeLat,
//         officeLon,
//       );
//       if (distance <= maxDistanceInMeters) {
//         checkin_address_status = "Office Location";
//       }
//     }

//     const insertRecord = {
//       user_id: userId,
//       tracking_date: tracking_date,
//       tracking_day: tracking_day,
//       checkin_time: checkin_time,
//       checkin_latitude: latitude,
//       checkin_longitude: longitude,
//       checkin_address: checkin_address_status,
//       checkout_time: null,
//       checkout_address: null,
//       checkout_latitude: null,
//       checkout_longitude: null,
//       total_minutes: 0,
//     };

//     const [result] = await db.query(
//       "INSERT INTO attendance SET ?",
//       insertRecord,
//     );

//     const newRecordId = (result as any).insertId;
//     const [newRecordRows] = await db.query(
//       "SELECT * FROM attendance WHERE id = ?",
//       newRecordId,
//     );

//     console.log("New record created:", newRecordRows);

//     return NextResponse.json({
//       success: true,
//       message: "Check-in successful",
//       record: Array.isArray(newRecordRows) ? newRecordRows[0] : newRecordRows,
//     });
//   } catch (error) {
//     console.error("Error during check-in:", error);
//     return NextResponse.json(
//       { error: "Internal Server Error" },
//       { status: 500 },
//     );
//   }
// }

// // v1.4
// // src/app/api/admin/attendance/checkin/route.ts
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
//     const tracking_day = today.toLocaleDateString("en-US", { weekday: "long" });
//     const checkin_time = today.toISOString().slice(11, 19);

//     // Step 2: Check for an existing attendance record using the fetched user ID
//     const [existingRecords] = await db.query(
//       "SELECT * FROM attendance WHERE user_id = ? AND tracking_date = ?",
//       [userId, tracking_date],
//     );

//     if (Array.isArray(existingRecords) && existingRecords.length > 0) {
//       return NextResponse.json(
//         { error: "You have already checked in today." },
//         { status: 409 },
//       );
//     }

//     const officeLat = 1.48212;
//     const officeLon = 103.57796;
//     const maxDistanceInMeters = 50;

//     let checkin_address_status = "Remote Location";
//     if (latitude && longitude) {
//       const distance = calculateDistance(
//         latitude,
//         longitude,
//         officeLat,
//         officeLon,
//       );
//       if (distance <= maxDistanceInMeters) {
//         checkin_address_status = "Office Location";
//       }
//     }

//     const insertRecord = {
//       user_id: userId,
//       tracking_date: tracking_date,
//       tracking_day: tracking_day,
//       checkin_time: checkin_time,
//       checkin_latitude: latitude,
//       checkin_longitude: longitude,
//       checkin_address: checkin_address_status,
//       checkout_time: null,
//       checkout_address: null,
//       checkout_latitude: null,
//       checkout_longitude: null,
//       total_minutes: 0,
//     };

//     const [result] = await db.query(
//       "INSERT INTO attendance SET ?",
//       insertRecord,
//     );

//     const newRecordId = (result as any).insertId;
//     const [newRecordRows] = await db.query(
//       "SELECT * FROM attendance WHERE id = ?",
//       newRecordId,
//     );

//     console.log("New record created:", newRecordRows);

//     return NextResponse.json({
//       success: true,
//       message: "Check-in successful",
//       record: Array.isArray(newRecordRows) ? newRecordRows[0] : newRecordRows,
//     });
//   } catch (error) {
//     console.error("Error during check-in:", error);
//     return NextResponse.json(
//       { error: "Internal Server Error" },
//       { status: 500 },
//     );
//   }
// }

//gemini
// v1.5
// src/app/api/admin/attendance/checkin/route.ts
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
      return NextResponse.json({
        success: true,
        message: "You have already checked in today.",
        record: existingRecords[0]
      }, { status: 200 }); // Return status 200 OK
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
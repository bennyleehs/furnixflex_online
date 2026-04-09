import { getPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { NextRequest, NextResponse } from "next/server";
import { getCountryFromRequest } from "@/utils/countryDetect";

const COUNTRY_TZ: Record<string, string> = {
  my: "Asia/Kuala_Lumpur", sg: "Asia/Singapore", id: "Asia/Jakarta", ph: "Asia/Manila",
};

export async function GET(req: NextRequest) {
  const db = await getPool();
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid");
  const country = getCountryFromRequest(req);
  const timezone = COUNTRY_TZ[country] || "Asia/Kuala_Lumpur";

  if (!uid) {
    return NextResponse.json({ error: "uid is required" }, { status: 400 });
  }

  try {
    const [userRows] = await db.query<RowDataPacket[]>(
      "SELECT id, uid, name, deptName FROM users WHERE uid = ? LIMIT 1",
      [uid],
    );

    if (!userRows.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const me = userRows[0];
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    const [teamRows] = await db.query<RowDataPacket[]>(
      `SELECT id, uid, name
       FROM users
       WHERE deptName = ?
         AND uid != ?
         AND roleName IN ('Staff', 'Partner')
       ORDER BY name ASC`,
      [me.deptName, uid],
    );

    const teamIds = teamRows.map((u) => u.id as number);
    if (!teamIds.length) {
      return NextResponse.json({
        overview: {
          teamSize: 0,
          presentToday: 0,
          absentToday: 0,
          onLeaveToday: 0,
          activeTasks: 0,
          overdueCount: 0,
        },
        attendance: [],
      });
    }

    const [attendanceRows] = await db.query<RowDataPacket[]>(
      `SELECT user_id, checkin_time, checkout_time
       FROM attendance
       WHERE tracking_date = ?
         AND user_id IN (?)`,
      [today, teamIds],
    );

    const [taskRows] = await db.query<RowDataPacket[]>(
      `SELECT
         SUM(CASE WHEN status NOT IN ('Job Done', 'Over Budget', 'Drop Interest') THEN 1 ELSE 0 END) as activeTasks,
         SUM(CASE WHEN status NOT IN ('Job Done', 'Over Budget', 'Drop Interest')
                   AND created_at < CURDATE()
                  THEN 1 ELSE 0 END) as overdueCount
       FROM customers
       WHERE sales_id IN (?)`,
      [teamIds],
    );

    const attendanceMap = new Map<number, RowDataPacket>();
    attendanceRows.forEach((a) => attendanceMap.set(Number(a.user_id), a));

    // Monthly attendance for team
    const [monthlyAttRows] = await db.query<RowDataPacket[]>(
      `SELECT user_id, COUNT(DISTINCT tracking_date) as daysPresent
       FROM attendance
       WHERE user_id IN (?) AND tracking_date >= ? AND tracking_date < ? AND checkin_time IS NOT NULL
       GROUP BY user_id`,
      [teamIds, monthStart, nextMonth],
    );
    const monthlyMap = new Map<number, number>();
    monthlyAttRows.forEach((r) => monthlyMap.set(Number(r.user_id), Number(r.daysPresent)));

    const attendanceWithMonthly = teamRows.map((member) => {
      const row = attendanceMap.get(Number(member.id));
      return {
        uid: member.uid,
        name: member.name,
        checkinTime: row?.checkin_time || null,
        checkoutTime: row?.checkout_time || null,
        status: row?.checkin_time ? "present" : "absent",
        monthlyDays: monthlyMap.get(Number(member.id)) || 0,
      };
    });

    const presentToday = attendanceWithMonthly.filter((a) => a.status === "present").length;
    const absentToday = attendanceWithMonthly.length - presentToday;

    const taskInfo = taskRows[0] || {};

    return NextResponse.json({
      timezone,
      month: `${year}-${String(month).padStart(2, "0")}`,
      overview: {
        teamSize: teamIds.length,
        presentToday,
        absentToday,
        onLeaveToday: 0,
        activeTasks: Number(taskInfo.activeTasks || 0),
        overdueCount: Number(taskInfo.overdueCount || 0),
      },
      attendance: attendanceWithMonthly,
    });
  } catch (error) {
    console.error("Supervisor dashboard query failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch supervisor dashboard." },
      { status: 500 },
    );
  }
}

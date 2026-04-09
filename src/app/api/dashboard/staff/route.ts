import { getPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { NextRequest, NextResponse } from "next/server";
import { getCountryFromRequest } from "@/utils/countryDetect";

const COUNTRY_TZ: Record<string, string> = {
  my: "Asia/Kuala_Lumpur",
  sg: "Asia/Singapore",
  id: "Asia/Jakarta",
  ph: "Asia/Manila",
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
    const [users] = await db.query<RowDataPacket[]>(
      "SELECT id, uid, name FROM users WHERE uid = ? LIMIT 1",
      [uid],
    );

    if (!users.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = users[0].id as number;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const today = now.toISOString().slice(0, 10);

    // Tasks from customers table
    const [taskRows] = await db.query<RowDataPacket[]>(
      `SELECT
         c.id,
         COALESCE(c.name, CAST(c.id AS CHAR)) as title,
         CASE
           WHEN c.status = 'Job Done' THEN 'completed'
           WHEN c.status IN ('Payment', 'In Progress', 'Install Scheduled', 'On Going') THEN 'in-progress'
           ELSE 'pending'
         END as status,
         DATE_FORMAT(c.created_at, '%Y-%m-%d') as dueDate,
         c.status as rawStatus
       FROM customers c
       WHERE c.sales_id = ?
         AND c.status NOT IN ('Over Budget', 'Drop Interest')
       ORDER BY c.created_at DESC
       LIMIT 8`,
      [userId],
    );

    const [countsRows] = await db.query<RowDataPacket[]>(
      `SELECT
         SUM(CASE WHEN c.status = 'Job Done' THEN 1 ELSE 0 END) as completedTasks,
         SUM(CASE WHEN c.status NOT IN ('Job Done', 'Over Budget', 'Drop Interest') THEN 1 ELSE 0 END) as myTasks,
         COUNT(*) as myQuotations,
         SUM(CASE WHEN c.status = 'Payment' THEN 1 ELSE 0 END) as myDeals
       FROM customers c
       WHERE c.sales_id = ?`,
      [userId],
    );

    // Today's attendance
    const [todayAttRows] = await db.query<RowDataPacket[]>(
      "SELECT checkin_time, checkout_time FROM attendance WHERE user_id = ? AND tracking_date = ? LIMIT 1",
      [userId, today],
    );

    // Monthly attendance summary
    const [monthlyAttRows] = await db.query<RowDataPacket[]>(
      `SELECT
         COUNT(DISTINCT tracking_date) as daysPresent,
         MIN(checkin_time) as earliestCheckin,
         MAX(checkout_time) as latestCheckout
       FROM attendance
       WHERE user_id = ?
         AND tracking_date >= ? AND tracking_date < ?
         AND checkin_time IS NOT NULL`,
      [userId, monthStart, nextMonth],
    );

    const overview = countsRows[0] || {};
    const myTasks = Number(overview.myTasks || 0);
    const completedTasks = Number(overview.completedTasks || 0);

    return NextResponse.json({
      timezone,
      overview: {
        myTasks,
        completedTasks,
        myQuotations: Number(overview.myQuotations || 0),
        myDeals: Number(overview.myDeals || 0),
      },
      tasks: taskRows.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        dueDate: t.dueDate,
      })),
      attendance: todayAttRows[0] || null,
      monthlyAttendance: {
        daysPresent: Number(monthlyAttRows[0]?.daysPresent || 0),
        month: `${year}-${String(month).padStart(2, "0")}`,
      },
    });
  } catch (error) {
    console.error("Staff dashboard query failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff dashboard." },
      { status: 500 },
    );
  }
}

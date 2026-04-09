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
      `SELECT id, uid, name, roleName
       FROM users
       WHERE deptName = ?
         AND uid != ?
         AND roleName IN ('Supervisor', 'Staff', 'Partner')
       ORDER BY name ASC`,
      [me.deptName, uid],
    );

    const teamIds = teamRows.map((u) => u.id as number);
    if (!teamIds.length) {
      return NextResponse.json({
        overview: {
          teamSize: 0,
          presentToday: 0,
          activeTasks: 0,
          completedTasks: 0,
          teamQuotations: 0,
          teamDeals: 0,
        },
        tasks: [],
      });
    }

    const [attendanceRows] = await db.query<RowDataPacket[]>(
      `SELECT DISTINCT user_id
       FROM attendance
       WHERE tracking_date = ?
         AND checkin_time IS NOT NULL
         AND user_id IN (?)`,
      [today, teamIds],
    );

    const [overviewRows] = await db.query<RowDataPacket[]>(
      `SELECT
         SUM(CASE WHEN c.status NOT IN ('Job Done', 'Over Budget', 'Drop Interest') THEN 1 ELSE 0 END) as activeTasks,
         SUM(CASE WHEN c.status = 'Job Done' THEN 1 ELSE 0 END) as completedTasks,
         COUNT(*) as teamQuotations,
         SUM(CASE WHEN c.status = 'Payment' THEN 1 ELSE 0 END) as teamDeals
       FROM customers c
       WHERE c.sales_id IN (?)`,
      [teamIds],
    );

    const [taskRows] = await db.query<RowDataPacket[]>(
      `SELECT
         c.id,
         COALESCE(c.name, CAST(c.id AS CHAR)) as title,
         u.name as assignee,
         CASE
           WHEN c.status = 'Job Done' THEN 'completed'
           WHEN c.status IN ('Payment', 'In Progress', 'Install Scheduled', 'On Going') THEN 'in-progress'
           ELSE 'pending'
         END as status,
         DATE_FORMAT(c.created_at, '%Y-%m-%d') as dueDate
       FROM customers c
       LEFT JOIN users u ON c.sales_id = u.id
       WHERE c.sales_id IN (?)
         AND c.status NOT IN ('Job Done', 'Over Budget', 'Drop Interest')
       ORDER BY c.created_at DESC
       LIMIT 10`,
      [teamIds],
    );

    const overview = overviewRows[0] || {};

    return NextResponse.json({
      timezone,
      overview: {
        teamSize: teamIds.length,
        presentToday: attendanceRows.length,
        activeTasks: Number(overview.activeTasks || 0),
        completedTasks: Number(overview.completedTasks || 0),
        teamQuotations: Number(overview.teamQuotations || 0),
        teamDeals: Number(overview.teamDeals || 0),
      },
      tasks: taskRows.map((t) => ({
        id: t.id,
        title: t.title,
        assignee: t.assignee || "-",
        status: t.status,
        dueDate: t.dueDate,
      })),
    });
  } catch (error) {
    console.error("Assistant manager dashboard query failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch assistant manager dashboard." },
      { status: 500 },
    );
  }
}

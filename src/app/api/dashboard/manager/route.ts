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
         AND roleName NOT IN ('Managing Director', 'Director', 'Non-Executive Director')
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
          pendingApprovals: 0,
          teamQuotations: 0,
          teamDeals: 0,
        },
        team: [],
      });
    }

    const [attendanceRows] = await db.query<RowDataPacket[]>(
      `SELECT user_id,
              CASE WHEN checkin_time IS NOT NULL THEN 'present' ELSE 'absent' END as status
       FROM attendance
       WHERE tracking_date = ?
         AND user_id IN (?)`,
      [today, teamIds],
    );

    const [taskByUserRows] = await db.query<RowDataPacket[]>(
      `SELECT sales_id as user_id,
              SUM(CASE WHEN status NOT IN ('Job Done', 'Over Budget', 'Drop Interest') THEN 1 ELSE 0 END) as activeTasks,
              SUM(CASE WHEN status = 'Job Done' THEN 1 ELSE 0 END) as completedTasks,
              0 as pendingApprovals,
              COUNT(*) as totalQuotations,
              SUM(CASE WHEN status = 'Payment' THEN 1 ELSE 0 END) as deals
       FROM customers
       WHERE sales_id IN (?)
       GROUP BY sales_id`,
      [teamIds],
    );

    const attendanceMap = new Map<number, string>();
    attendanceRows.forEach((a) => attendanceMap.set(Number(a.user_id), String(a.status)));

    const taskMap = new Map<number, RowDataPacket>();
    taskByUserRows.forEach((t) => taskMap.set(Number(t.user_id), t));

    const team = teamRows.map((member) => {
      const row = taskMap.get(Number(member.id));
      return {
        uid: member.uid,
        name: member.name,
        role: member.roleName,
        status: (attendanceMap.get(Number(member.id)) || "absent") as "present" | "absent" | "leave",
        activeTasks: Number(row?.activeTasks || 0),
      };
    });

    const overview = team.reduce(
      (acc, member) => {
        const row = taskMap.get(Number(teamRows.find((u) => u.uid === member.uid)?.id));
        acc.teamSize += 1;
        if (member.status === "present") acc.presentToday += 1;
        acc.activeTasks += Number(row?.activeTasks || 0);
        acc.completedTasks += Number(row?.completedTasks || 0);
        acc.pendingApprovals += Number(row?.pendingApprovals || 0);
        acc.teamQuotations += Number(row?.totalQuotations || 0);
        acc.teamDeals += Number(row?.deals || 0);
        return acc;
      },
      {
        teamSize: 0,
        presentToday: 0,
        activeTasks: 0,
        completedTasks: 0,
        pendingApprovals: 0,
        teamQuotations: 0,
        teamDeals: 0,
      },
    );

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
    const teamWithMonthly = team.map((m) => {
      const uid2 = teamRows.find((u) => u.uid === m.uid)?.id;
      return { ...m, monthlyDays: uid2 ? (monthlyMap.get(Number(uid2)) || 0) : 0 };
    });

    return NextResponse.json({ timezone, month: `${year}-${String(month).padStart(2, "0")}`, overview, team: teamWithMonthly });
  } catch (error) {
    console.error("Manager dashboard query failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch manager dashboard." },
      { status: 500 },
    );
  }
}

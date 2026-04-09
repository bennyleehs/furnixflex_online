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
    const [users] = await db.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE uid = ? LIMIT 1",
      [uid],
    );

    if (!users.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const currentYear = new Date().getFullYear();

    const [branchRows] = await db.query<RowDataPacket[]>(
      "SELECT COUNT(DISTINCT branchRef) as totalBranches FROM users",
    );

    const [employeeRows] = await db.query<RowDataPacket[]>(
      "SELECT id, deptName FROM users",
    );

    const userIds = employeeRows.map((u) => Number(u.id));

    const [attendanceRows] = userIds.length
      ? await db.query<RowDataPacket[]>(
          `SELECT DISTINCT user_id
           FROM attendance
           WHERE tracking_date = ?
             AND checkin_time IS NOT NULL
             AND user_id IN (?)`,
          [today, userIds],
        )
      : [[] as unknown as RowDataPacket[], [] as unknown as RowDataPacket[]];

    const [quoteRows] = await db.query<RowDataPacket[]>(
      `SELECT
         COUNT(*) as totalQuotations,
         SUM(CASE WHEN status = 'Payment' THEN 1 ELSE 0 END) as dealsClosed,
         0 as pendingApprovals,
         COALESCE(SUM(CASE WHEN YEAR(created_at) = ? AND status = 'Payment' THEN 1 ELSE 0 END), 0) as revenueYtd
       FROM customers`,
      [currentYear],
    );

    const [departmentRows] = await db.query<RowDataPacket[]>(
      `SELECT
         u.deptName as name,
         COUNT(DISTINCT u.id) as headcount,
         COALESCE(SUM(CASE WHEN c.status NOT IN ('Job Done', 'Over Budget', 'Drop Interest') THEN 1 ELSE 0 END), 0) as activeTasks,
         COALESCE(ROUND(
           100 * SUM(CASE WHEN c.status = 'Job Done' THEN 1 ELSE 0 END) /
           NULLIF(COUNT(c.id), 0)
         ), 0) as completionRate
       FROM users u
       LEFT JOIN customers c ON c.sales_id = u.id
       GROUP BY u.deptName
       ORDER BY u.deptName ASC`,
    );

    const totalDepartments = new Set(employeeRows.map((u) => String(u.deptName || "Unknown"))).size;
    const quote = quoteRows[0] || {};

    return NextResponse.json({
      timezone,
      overview: {
        totalBranches: Number(branchRows[0]?.totalBranches || 0),
        totalEmployees: employeeRows.length,
        activeEmployees: attendanceRows.length,
        totalDepartments,
        revenueYtd: Number(quote.revenueYtd || 0),
        revenueTarget: Number(quote.revenueYtd || 0) * 1.2,
        totalQuotations: Number(quote.totalQuotations || 0),
        dealsClosed: Number(quote.dealsClosed || 0),
        pendingApprovals: Number(quote.pendingApprovals || 0),
      },
      departments: departmentRows.map((d) => ({
        name: d.name || "Unknown",
        headcount: Number(d.headcount || 0),
        activeTasks: Number(d.activeTasks || 0),
        completionRate: Number(d.completionRate || 0),
      })),
    });
  } catch (error) {
    console.error("Managing director dashboard query failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch managing director dashboard." },
      { status: 500 },
    );
  }
}

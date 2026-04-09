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
      "SELECT id, uid, name, branchRef FROM users WHERE uid = ? LIMIT 1",
      [uid],
    );

    if (!userRows.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const me = userRows[0];
    const today = new Date().toISOString().slice(0, 10);
    const currentYear = new Date().getFullYear();

    const [employeeRows] = await db.query<RowDataPacket[]>(
      "SELECT id, branchRef FROM users",
    );

    const branchEmployees = employeeRows.filter((u) => u.branchRef === me.branchRef);
    const branchUserIds = branchEmployees.map((u) => Number(u.id));

    if (!branchUserIds.length) {
      return NextResponse.json({
        overview: {
          totalEmployees: 0,
          activeEmployees: 0,
          totalDepartments: 0,
          revenueYtd: 0,
          revenueTarget: 0,
          totalQuotations: 0,
          dealsClosed: 0,
          pendingApprovals: 0,
        },
        branches: [],
      });
    }

    const [attendanceRows] = await db.query<RowDataPacket[]>(
      `SELECT DISTINCT user_id
       FROM attendance
       WHERE tracking_date = ?
         AND checkin_time IS NOT NULL
         AND user_id IN (?)`,
      [today, branchUserIds],
    );

    const [deptRows] = await db.query<RowDataPacket[]>(
      "SELECT COUNT(DISTINCT deptName) as totalDepartments FROM users WHERE branchRef = ?",
      [me.branchRef],
    );

    const [quoteRows] = await db.query<RowDataPacket[]>(
      `SELECT
         COUNT(*) as totalQuotations,
         SUM(CASE WHEN c.status = 'Payment' THEN 1 ELSE 0 END) as dealsClosed,
         0 as pendingApprovals,
         COALESCE(SUM(CASE WHEN YEAR(c.created_at) = ? AND c.status = 'Payment' THEN 1 ELSE 0 END), 0) as revenueYtd
       FROM customers c
       WHERE c.sales_id IN (?)`,
      [currentYear, branchUserIds],
    );

    const [branchRows] = await db.query<RowDataPacket[]>(
      `SELECT
         u.branchRef as branch,
         COUNT(DISTINCT u.id) as employees,
         COUNT(DISTINCT c.id) as quotations,
         SUM(CASE WHEN c.status = 'Payment' THEN 1 ELSE 0 END) as deals
       FROM users u
       LEFT JOIN customers c ON c.sales_id = u.id
       WHERE u.branchRef = ?
       GROUP BY u.branchRef
       ORDER BY branch ASC`,
      [me.branchRef],
    );

    const quote = quoteRows[0] || {};

    return NextResponse.json({
      timezone,
      overview: {
        totalEmployees: branchUserIds.length,
        activeEmployees: attendanceRows.length,
        totalDepartments: Number(deptRows[0]?.totalDepartments || 0),
        revenueYtd: Number(quote.revenueYtd || 0),
        revenueTarget: Number(quote.revenueYtd || 0) * 1.2,
        totalQuotations: Number(quote.totalQuotations || 0),
        dealsClosed: Number(quote.dealsClosed || 0),
        pendingApprovals: Number(quote.pendingApprovals || 0),
      },
      branches: branchRows.map((b) => ({
        branch: b.branch,
        employees: Number(b.employees || 0),
        quotations: Number(b.quotations || 0),
        deals: Number(b.deals || 0),
      })),
    });
  } catch (error) {
    console.error("Director dashboard query failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch director dashboard." },
      { status: 500 },
    );
  }
}

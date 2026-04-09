import { getPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { NextRequest, NextResponse } from "next/server";

async function getTableColumns(
  db: Awaited<ReturnType<typeof getPool>>,
  tableName: string,
): Promise<Set<string>> {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName],
  );

  return new Set(rows.map((row) => row.COLUMN_NAME as string));
}

export async function GET(req: NextRequest) {
  const db = await getPool();
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid");

  if (!uid) {
    return NextResponse.json(
      { error: "User ID (UID) is required." },
      { status: 400 },
    );
  }

  try {
    const [userRows] = await db.query<RowDataPacket[]>(
      "SELECT id, name FROM users WHERE uid = ?",
      [uid],
    );

    if (!userRows || userRows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const salesId = userRows[0].id;
    const userName = userRows[0].name;
    const now = new Date();
    const currentYear = now.getFullYear();
    const yearStart = `${currentYear}-01-01 00:00:00`;
    const yearEnd = `${currentYear + 1}-01-01 00:00:00`;

    const [quotationColumns, paymentColumns, customerColumns] = await Promise.all([
      getTableColumns(db, "quotations"),
      getTableColumns(db, "payments"),
      getTableColumns(db, "customers"),
    ]);

    const quotationTotalExpr = quotationColumns.has("total")
      ? "q.total"
      : quotationColumns.has("quotation_grand_total")
        ? "q.quotation_grand_total"
        : "0";

    const quotationStatusExpr = quotationColumns.has("status")
      ? "q.status"
      : quotationColumns.has("quotation_status")
        ? "q.quotation_status"
        : "'Unknown'";

    const quotationDateExpr = quotationColumns.has("created_at")
      ? "q.created_at"
      : quotationColumns.has("created_date")
        ? "q.created_date"
        : "NOW()";

    const quotationTypeFilter = quotationColumns.has("type")
      ? "AND q.type = 'Job'"
      : "";

    const quotationNotCancelledFilter = quotationColumns.has("status")
      ? "AND q.status != 'Cancelled'"
      : quotationColumns.has("quotation_status")
        ? "AND q.quotation_status != 'Cancelled'"
        : "";

    const quotationPendingFilter = quotationColumns.has("status")
      ? "AND q.status NOT IN ('Cancelled', 'Job Done')"
      : quotationColumns.has("quotation_status")
        ? "AND q.quotation_status NOT IN ('Cancelled', 'Job Done')"
        : "";

    const quotationOwnerCondition = quotationColumns.has("sales_uid")
      ? "q.sales_uid = ?"
      : quotationColumns.has("created_by")
        ? "q.created_by = ?"
        : quotationColumns.has("sales_representative")
          ? "q.sales_representative = ?"
          : "1 = 0";

    const quotationOwnerParam = quotationColumns.has("sales_uid")
      ? uid
      : quotationColumns.has("created_by")
        ? salesId
        : quotationColumns.has("sales_representative")
          ? userName
          : null;

    const ownerParams = quotationOwnerParam === null ? [] : [quotationOwnerParam];

    const paymentAmountExpr = paymentColumns.has("amount_inv")
      ? "p.amount_inv"
      : paymentColumns.has("payment_amount")
        ? "p.payment_amount"
        : "0";

    const paymentDateExpr = paymentColumns.has("created_at")
      ? "p.created_at"
      : paymentColumns.has("payment_date")
        ? "p.payment_date"
        : "NOW()";

    const paymentReceivedFilter = paymentColumns.has("received")
      ? "AND p.received = 1"
      : "";

    const paymentJoinCondition = paymentColumns.has("quotation_number") && quotationColumns.has("quotation_number")
      ? "p.quotation_number = q.quotation_number"
      : paymentColumns.has("quotation_id")
        ? "p.quotation_id = q.id"
        : "1 = 0";

    const mediaSourceExpr = customerColumns.has("source")
      ? "COALESCE(source, 'Other')"
      : customerColumns.has("followUp_status")
        ? "COALESCE(followUp_status, 'Other')"
        : "'Other'";

    const branchJoin = quotationColumns.has("branch_id")
      ? "LEFT JOIN branches b ON q.branch_id = b.id"
      : "";

    const branchCodeExpr = quotationColumns.has("branch_id")
      ? "COALESCE(b.branch_code, 'JB')"
      : "'JB'";

    const invoiceExpr = quotationColumns.has("invoice_number")
      ? "q.invoice_number"
      : quotationColumns.has("quotation_number")
        ? "q.quotation_number"
        : "CAST(q.id AS CHAR)";

    // Total leads (YTD)
    const [totalLeadsRows] = await db.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM customers WHERE sales_id = ? AND created_at >= ? AND created_at < ?",
      [salesId, yearStart, yearEnd],
    );

    // Total deals (YTD) - customers with status 'Payment'
    const [totalDealsRows] = await db.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM customers WHERE sales_id = ? AND status = 'Payment' AND created_at >= ? AND created_at < ?",
      [salesId, yearStart, yearEnd],
    );

    // Sales YTD - count of quotations with type='Job' created this year
    const [salesYtdRows] = await db.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(${quotationTotalExpr}), 0) as total
       FROM quotations q
       WHERE ${quotationOwnerCondition}
         ${quotationTypeFilter}
         ${quotationNotCancelledFilter}
         AND ${quotationDateExpr} >= ?
         AND ${quotationDateExpr} < ?`,
      [...ownerParams, yearStart, yearEnd],
    );

    // Revenue YTD - sum of payments collected this year
    const [revenueYtdRows] = await db.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(${paymentAmountExpr}), 0) as total
       FROM payments p
       JOIN quotations q ON ${paymentJoinCondition}
       WHERE ${quotationOwnerCondition}
         ${paymentReceivedFilter}
         AND ${paymentDateExpr} >= ?
         AND ${paymentDateExpr} < ?`,
      [...ownerParams, yearStart, yearEnd],
    );

    // Outstanding - total quotation value minus collected revenue
    const outstanding = Math.max(0, (salesYtdRows[0]?.total || 0) - (revenueYtdRows[0]?.total || 0));

    // Backlog YTD - tasks where MAX payment <= 1000 (booking only, no installation yet)
    // Uses payments.task_id -> customers.id with sales_id filter
    const hasTaskId = paymentColumns.has("task_id");
    const hasBalance = paymentColumns.has("balance");
    const hasAmountInv = paymentColumns.has("amount_inv");
    const paymentDateCol = paymentColumns.has("payment_date") ? "payment_date" : "created_at";
    const hasQuotationNumber = paymentColumns.has("quotation_number");

    let backlogCount = 0;
    let backlogTotal = 0;
    let backlogDetailsResult: RowDataPacket[] = [];

    if (hasTaskId && hasAmountInv) {
      // Backlog YTD summary
      const [backlogSummaryRows] = await db.query<RowDataPacket[]>(
        `SELECT 
           COUNT(DISTINCT bt.task_id) as count,
           COALESCE(SUM(bt.total_amount_inv + bt.latest_balance), 0) as total
         FROM (
           SELECT 
             pm.task_id,
             SUM(pm.amount_inv) as total_amount_inv,
             (SELECT ${hasBalance ? "p2.balance" : "0"}
              FROM payments p2
              WHERE p2.task_id = pm.task_id
                AND YEAR(p2.${paymentDateCol}) = ?
              ORDER BY p2.${paymentDateCol} DESC, p2.id DESC
              LIMIT 1
             ) as latest_balance
           FROM payments pm
           INNER JOIN customers c ON pm.task_id = c.id
           WHERE YEAR(pm.${paymentDateCol}) = ?
             AND c.sales_id = ?
             AND pm.task_id IN (
               SELECT task_id FROM payments
               WHERE YEAR(${paymentDateCol}) = ?
               GROUP BY task_id
               HAVING MAX(amount_inv) <= 1000
             )
           GROUP BY pm.task_id
         ) bt`,
        [currentYear, currentYear, salesId, currentYear],
      );
      backlogCount = backlogSummaryRows[0]?.count || 0;
      backlogTotal = parseFloat(backlogSummaryRows[0]?.total) || 0;

      // Backlog details per task - with month, quotation_number, amounts
      const [backlogDetailRows] = await db.query<RowDataPacket[]>(
        `SELECT 
           bt.task_id as id,
           bt.quotation_number as invoice_number,
           (bt.total_amount_inv + bt.latest_balance) as quotation_grand_total,
           bt.total_amount_inv as total_paid,
           bt.latest_balance as outstanding_amount,
           bt.first_payment_month as month,
           'Backlog' as quotation_status
         FROM (
           SELECT 
             pm.task_id,
             ${hasQuotationNumber ? `(SELECT p3.quotation_number FROM payments p3
               WHERE p3.task_id = pm.task_id
                 AND YEAR(p3.${paymentDateCol}) = ?
                 AND p3.quotation_number IS NOT NULL AND p3.quotation_number != ''
               ORDER BY p3.${paymentDateCol} ASC, p3.id ASC LIMIT 1)` : "CAST(pm.task_id AS CHAR)"}
             as quotation_number,
             MONTH(MIN(pm.${paymentDateCol})) as first_payment_month,
             SUM(pm.amount_inv) as total_amount_inv,
             (SELECT ${hasBalance ? "p2.balance" : "0"}
              FROM payments p2
              WHERE p2.task_id = pm.task_id
                AND YEAR(p2.${paymentDateCol}) = ?
              ORDER BY p2.${paymentDateCol} DESC, p2.id DESC
              LIMIT 1
             ) as latest_balance
           FROM payments pm
           INNER JOIN customers c ON pm.task_id = c.id
           WHERE YEAR(pm.${paymentDateCol}) = ?
             AND c.sales_id = ?
             AND pm.task_id IN (
               SELECT task_id FROM payments
               WHERE YEAR(${paymentDateCol}) = ?
               GROUP BY task_id
               HAVING MAX(amount_inv) <= 1000
             )
           GROUP BY pm.task_id
         ) bt
         ORDER BY bt.first_payment_month, bt.quotation_number`,
        [currentYear, currentYear, currentYear, salesId, currentYear],
      );
      backlogDetailsResult = backlogDetailRows;
    } else {
      // Fallback: use quotations table
      const [backlogRows] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count, COALESCE(SUM(${quotationTotalExpr}), 0) as total
         FROM quotations q
         WHERE ${quotationOwnerCondition}
           ${quotationTypeFilter}
           ${quotationPendingFilter}
           AND ${quotationDateExpr} >= ?
           AND ${quotationDateExpr} < ?`,
        [...ownerParams, yearStart, yearEnd],
      );
      backlogCount = backlogRows[0]?.count || 0;
      backlogTotal = parseFloat(backlogRows[0]?.total) || 0;
    }

    // Leads vs Deals by month (current year)
    const [leadsVsDealsRows] = await db.query<RowDataPacket[]>(
      `SELECT 
         MONTH(created_at) as month,
         COUNT(*) as leads,
         SUM(CASE WHEN status = 'Payment' THEN 1 ELSE 0 END) as deals
       FROM customers
       WHERE sales_id = ?
         AND created_at >= ?
         AND created_at < ?
       GROUP BY MONTH(created_at)
       ORDER BY MONTH(created_at)`,
      [salesId, yearStart, yearEnd],
    );

    // Sales vs Revenue by month (current year)
    const [salesByMonthRows] = await db.query<RowDataPacket[]>(
      `SELECT 
         MONTH(${quotationDateExpr}) as month,
         COALESCE(SUM(${quotationTotalExpr}), 0) as sales_total
       FROM quotations q
       WHERE ${quotationOwnerCondition}
         ${quotationTypeFilter}
         ${quotationNotCancelledFilter}
         AND ${quotationDateExpr} >= ?
         AND ${quotationDateExpr} < ?
       GROUP BY MONTH(${quotationDateExpr})
       ORDER BY MONTH(${quotationDateExpr})`,
      [...ownerParams, yearStart, yearEnd],
    );

    const [revenueByMonthRows] = await db.query<RowDataPacket[]>(
      `SELECT 
         MONTH(${paymentDateExpr}) as month,
         COALESCE(SUM(${paymentAmountExpr}), 0) as revenue_total
       FROM payments p
       JOIN quotations q ON ${paymentJoinCondition}
       WHERE ${quotationOwnerCondition}
         ${paymentReceivedFilter}
         AND ${paymentDateExpr} >= ?
         AND ${paymentDateExpr} < ?
       GROUP BY MONTH(${paymentDateExpr})
       ORDER BY MONTH(${paymentDateExpr})`,
      [...ownerParams, yearStart, yearEnd],
    );

    // Media to Deals by month (current year) - source breakdown
    const [mediaToDealsRows] = await db.query<RowDataPacket[]>(
      `SELECT 
         MONTH(created_at) as month,
        ${mediaSourceExpr} as source,
         COUNT(*) as count
       FROM customers
       WHERE sales_id = ?
         AND status = 'Payment'
         AND created_at >= ?
         AND created_at < ?
       GROUP BY MONTH(created_at), source
       ORDER BY MONTH(created_at)`,
      [salesId, yearStart, yearEnd],
    );

    // Attendance status for today
    const today = now.toISOString().slice(0, 10);
    const [attendanceRows] = await db.query<RowDataPacket[]>(
      "SELECT * FROM attendance WHERE user_id = ? AND tracking_date = ? LIMIT 1",
      [salesId, today],
    );

    const totalLeads = totalLeadsRows[0]?.total || 0;
    const totalDeals = totalDealsRows[0]?.total || 0;
    const conversionRate = totalLeads > 0 ? ((totalDeals / totalLeads) * 100).toFixed(1) : "0.0";

    return NextResponse.json({
      stats: {
        totalLeads,
        totalDeals,
        conversionRate: `${conversionRate}% conversion`,
        salesYtd: salesYtdRows[0]?.total || 0,
        revenueYtd: revenueYtdRows[0]?.total || 0,
        revenueCollectedPct: salesYtdRows[0]?.total > 0
          ? ((revenueYtdRows[0]?.total / salesYtdRows[0]?.total) * 100).toFixed(1)
          : "0.0",
        outstanding,
        backlogYtd: backlogTotal,
        backlogCount: backlogCount,
        backlogDealPct: totalDeals > 0
          ? ((backlogCount / totalDeals) * 100).toFixed(1)
          : "0.0",
      },
      leadsVsDeals: leadsVsDealsRows,
      salesByMonth: salesByMonthRows,
      revenueByMonth: revenueByMonthRows,
      mediaToDeals: mediaToDealsRows,
      backlogDetails: backlogDetailsResult.map((row) => ({
        ...row,
        invoiceCode: row.invoice_number,
      })),
      attendance: attendanceRows.length > 0 ? attendanceRows[0] : null,
    });
  } catch (error) {
    console.error("Sales dashboard query failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data." },
      { status: 500 },
    );
  }
}

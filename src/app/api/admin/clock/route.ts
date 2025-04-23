import { createPool } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const db = createPool();
    const sql = `
      SELECT  rule_clock.id AS id,
              branches.branch_name AS branch_name,
              departments.name AS department_name,
              rule_clock.work_start AS work_start,
              rule_clock.work_end AS work_end,
              rule_clock.lunch_start AS lunch_start,
              rule_clock.lunch_end AS lunch_end,
              rule_clock.allowance_in AS allowance_in,
              rule_clock.status AS status
      FROM rule_clock
      LEFT JOIN branches ON branches.id = rule_clock.branch_id
      LEFT JOIN departments ON departments.id = rule_clock.department_id
      WHERE rule_clock.status != 'History' OR rule_clock.status IS NULL
      ORDER BY rule_clock.id ASC;
      
    `;

    const [rows] = await db.query<RowDataPacket[]>(sql);

    return new Response(JSON.stringify({ listClocks: rows }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetchinh roles:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
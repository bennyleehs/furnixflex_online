import { getPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { format } from "date-fns";

interface JobsReport {
  quotation_id: number;
  invoice_number: string;
  quotation_status: string;
  created_date: string;
  quotation_installation_date: string;
  quotation_history_status: string | null;
  yymm: string;
  branch_id: number;
  branch_code: string;
  created_by: number;
  pic_name: string;
  quotation_customer_id: number;
  quotation_customer_name: string;
  quotation_customer_address: string;
}

export async function GET() {
  try {
    const db = await getPool();

    const sql = `
      SELECT quotations.id AS quotation_id, 
             quotations.invoice_number, 
             quotations.quotation_status, 
             quotations.created_date, 
             quotations.quotation_installation_date, 
             quotations.quotation_history_status,
             DATE_FORMAT(quotations.created_date, '%y%m') AS yymm,
             branches.id AS branch_id, 
             branches.branch_code AS branch_code,
             users.id AS created_by, 
             users.name AS pic_name,
             quotation_customers.id AS quotation_customer_id, 
             quotation_customers.quotation_customer_name, 
             quotation_customers.quotation_customer_address
      FROM quotations
      LEFT JOIN branches ON quotations.branch_id = branches.id
      LEFT JOIN users ON quotations.created_by = users.id
      LEFT JOIN quotation_customers ON quotations.id = quotation_customers.quotation_id
      WHERE type = "Job" 
          AND quotation_status != "Cancelled" 
          AND quotation_status != "Job Done" 
          AND quotation_history_status IS NULL
      ORDER BY quotation_installation_date ASC
    `;

    // proper typing with RowDataPacket
    const [rows] = await db.query<JobsReport & RowDataPacket[]>(sql);

    const listJobs = rows.map((row) => ({
      ...row,
      //format date
      formattedDate: format(
        new Date(row.quotation_installation_date),
        "yyyy MMM dd",
      ).toUpperCase(),
      //concate job no
      jobInvc_no: `${row.branch_code}-${row.yymm}-${row.invoice_number}`
    }));

    return new Response(JSON.stringify({ listJobs }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

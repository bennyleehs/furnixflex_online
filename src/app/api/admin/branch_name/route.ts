import { createPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";

interface Branches {
  branchId: number;
  branchName: string;
}

export async function GET() {
  try {
    const db = createPool();

    const sql = `
        SELECT  id AS branchId,
                branch_name AS branchName
        FROM branches
    `;

    // proper typing with RowDataPacket
    const [rows] = await db.query<Branches & RowDataPacket[]>(sql);

    return new Response(JSON.stringify({ listBranches: rows }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching branches:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

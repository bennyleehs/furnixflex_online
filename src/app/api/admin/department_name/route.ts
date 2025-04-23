import { createPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";

interface Departments {
  departmentId: number;
  departmentName: string;
}

export async function GET() {
  try {
    const db = createPool();

    const sql = `
        SELECT  id AS departmentId,
                name AS departmentName
        FROM departments
    `;

    // proper typing with RowDataPacket
    const [rows] = await db.query<Departments & RowDataPacket[]>(sql);

    return new Response(JSON.stringify({ listDepartments: rows }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

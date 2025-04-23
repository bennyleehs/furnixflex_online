import { createPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";

interface Customers {
  cust_id: number;
  cust_base: string;
  cust_name: string;
  cust_address: string;
  cust_phone: number;
  cust_email: string;
}

export async function GET() {
  try {
    const db = createPool();

    const sql = `
      SELECT  customers1.id AS cust_id,
              CONCAT_WS(', ',
                branches.branch_code, 
                CONCAT('(DL)', COALESCE(dealer.name, '')),
                CONCAT('(ID)', COALESCE(designer.name, '')),
                CONCAT('(CTR)', COALESCE(contractor.name, '')),
                CONCAT('(REF)', COALESCE(referral.name, ''))
              )AS cust_base,
              customers1.customer_name AS cust_name,
              customers1.customer_address AS cust_address,
              customers1.customer_phone AS cust_phone,
              customers1.customer_email AS cust_email
      FROM customers1
      JOIN branches ON customers1.branch_id = branches.id
      LEFT JOIN partners AS dealer ON customers1.dealer_id = dealer.id
      LEFT JOIN partners AS designer ON customers1.designer_id = designer.id
      LEFT JOIN partners AS contractor ON customers1.contractor_id = contractor.id
      LEFT JOIN partners AS referral ON customers1.referral_id = referral.id
      ORDER BY customers1.id DESC LIMIT 100;
    `;  

// proper typing with RowDataPacket
    const [rows] = await db.query<Customers & RowDataPacket[]>(sql);
    //concate country code + phone
    //const listCust = rows.map((row) => ({
    //  ...row,
    //  cust_phone: `(${row.customer_country_code}) ${row.customer_phone}`,
    //}));

    return new Response(JSON.stringify({ listCust: rows }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

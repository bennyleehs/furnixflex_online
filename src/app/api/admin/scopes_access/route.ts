// api/admin/scopes_access/route.ts
import { createPool } from "@/lib/db";
import { RowDataPacket } from "mysql2";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const db = createPool();

  const [branches] = await db.execute("SELECT name,ref FROM branches2");
  const [departments] = await db.execute("SELECT name FROM departments");
  const [roles] = await db.execute("SELECT name FROM roles1");

  // Skip the first role only
  const slicedRoles = (roles as any[]).slice(1);

  let result = [];
  let count = 1;

  for (const branch of branches as any[]) {
    for (const department of departments as any[]) {
      for (const role of slicedRoles) {
        result.push({
          no: count++,
          branch: branch.name,
          branchRef: branch.ref, // ref for key - access_control
          department: department.name,
          role: role.name,
        });
      }
    }
  }

  return NextResponse.json(result, { status: 200 });
}
// role (roles1), branch (branches2), department (departments)

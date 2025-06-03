// api/admin/scopes_access/route.ts
import { createPool } from "@/lib/db";
import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/authMiddleware";

async function handler(req: AuthenticatedRequest) {
  const db = createPool();

  const [branches] = await db.execute("SELECT name,ref FROM branches");
  const [departments] = await db.execute(
    "SELECT name FROM departments ORDER BY id",
  );
  const [roles] = await db.execute("SELECT name FROM roles ORDER BY id");

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

// Export the route handler with authentication middleware
export const GET = withAuth(handler, [
  "1.0.1",
  "1.0.2",
  "1.0.3",
  "1.0.4",
  "1.6.1",
  "1.6.2",
  "1.6.3",
  "1.6.4",
]);
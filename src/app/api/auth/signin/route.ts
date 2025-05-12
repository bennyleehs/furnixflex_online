//src/app/api/auth/signin/route.ts
import { createPool } from "@/lib/db";
import { IUser } from "@/interface/app_interface";
import { verifyPassword, generateToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // Ensure it runs in Node.js

export async function POST(req: NextRequest) {
  const db = createPool();

  const { uid, password } = await req.json();
  // query from input to the db - only get necessary user info
  const [rows] = await db.query(
    "SELECT id, uid, roleName, deptName as departmentName, branchRef, email, password FROM users1 WHERE uid = ?",
    [uid]
  );
  
  // fetch data
  const user = (
    rows as (IUser & {
      id: number;
      roleName: string;
      departmentName: string;
      branchRef: string;
    })[]
  )[0];

  // condition
  if (!user || !(await verifyPassword(password, user.password))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Generate token with permissions based on user's branch, department, and role
  const token = await generateToken(
    user.id,
    user.roleName,
    user.departmentName,
    user.branchRef,
  );

  const res = NextResponse.json({ success: true });
  res.headers.set(
    "Set-Cookie",
    `authToken=${token}; Path=/; HttpOnly; SameSite=Lax, Max-Age=3600`,
  );

  console.log("✅ Token set successfully");

  return res;
}
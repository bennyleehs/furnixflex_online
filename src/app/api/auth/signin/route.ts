import { createPool } from "@/lib/db";
import { IUser } from "@/interface/app_interface";
import { verifyPassword, generateToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // Ensure it runs in Node.js

export async function POST(req: NextRequest) {
  const db = createPool();

  const { uid, password } = await req.json();
  // query from input to the db
  // const [rows] = await db.query("SELECT id, uid, role FROM users1 WHERE uid = ?", [uid]);
  const [rows] = await db.query(
    "SELECT id, uid, role_id AS role, department_id AS department, branch_id AS branch, email, password FROM users1 WHERE uid = ?",
    [uid]
  );
  
  // fetch data
  const user = (
    rows as (IUser & {
      id: number;
      role: number;
      department: number;
      branch: number;
    })[]
  )[0];

  // condition
  if (!user || !(await verifyPassword(password, user.password))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // token
  const token = await generateToken(
    user.id,
    user.role,
    user.department,
    user.branch,
  );

  const res = NextResponse.json({ success: true });
  res.headers.set(
    "Set-Cookie",
    // `authToken=${token}; Path=/; HttpOnly; Secure=${process.env.NODE_ENV === "production" ? "false" : "false"}; SameSite=Lax`,
    // `authToken=${token}; Path=/; HttpOnly; Secure=false; SameSite=Lax, Max-Age=3600` //local
    `authToken=${token}; Path=/; HttpOnly; SameSite=Lax, Max-Age=3600`,
  );

  console.log("✅ Token set successfully:", token);

  return res;
}

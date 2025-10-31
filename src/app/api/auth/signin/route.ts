//src/app/api/auth/signin/route.ts
import { createPool } from "@/lib/db";
import { IUser } from "@/interface/app_interface";
import {
  verifyPassword,
  generateAuthToken,
  generateRefreshToken,
} from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs"; // Ensure it runs in Node.js
const isProduction = process.env.NODE_ENV === 'production';

export async function POST(req: NextRequest) {
  const db = createPool();

  const { uid, password } = await req.json();
  // query from input to the db - only get necessary user info
  const [rows] = await db.query(
    // "SELECT id as user_id, uid, name, roleName, deptName as departmentName, branchRef, email, password FROM users WHERE uid = ?",
    "SELECT id, uid, name, roleName, deptName as departmentName, branchRef, email, password FROM users WHERE uid = ?",
    [uid],
  );

  // fetch data
  const user = (
    rows as (IUser & {
      // user_id: number,// id: number;
      name: string;
      uid: string;
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
  // const token = await generateToken(
  // Generate short-lived Auth Token
  const authToken = await generateAuthToken(
    user.uid,
    // user.id,
    user.roleName,
    user.departmentName,
    user.branchRef,
  );
  // Generate long-lived Refresh Token
  const refreshToken = await generateRefreshToken(user.uid); // <--- NEW

  const res = NextResponse.json({
    success: true,
    // user_id: user.user_id,
    uid: user.uid,
    name: user.name,
    // departmentName: user.departmentName,
    role: user.roleName,
    department: user.departmentName,
  });
  // res.headers.set(
  //   "Set-Cookie",
  //   // `authToken=${token}; Path=/; HttpOnly; SameSite=Lax, Max-Age=3600`,
  //   `authToken=${token}; Path=/; SameSite=Lax, Max-Age=3600`,
  // );

  // (await cookies()).set("authToken", token, {
  //   httpOnly: true,
  //   maxAge: 60 * 60 * 24, // 1 day
  //   path: "/",
  //   sameSite: "lax",
  //   // secure: true, // enable in production (HTTPS)
  // });

  //v1.2 gemini
  const cookieStore = await cookies();

  // Set short-lived Auth Token (client-side visible or not, based on need. HttpOnly is best practice.)
  cookieStore.set("authToken", authToken, {
    httpOnly: true, // IMPORTANT for security
    // maxAge: 20, // 20 sec for testing
    maxAge: 60 * 60 * 9, // e.g., 9 hour
    path: "/",
    sameSite: "lax",
    // secure: true, // enable in production (HTTPS)
    secure: isProduction, // Use 'secure: true' in production
  });

  // Set long-lived Refresh Token (MUST be HttpOnly and Long-lived)
  cookieStore.set("refreshToken", refreshToken, {
    // <--- NEW COOKIE
    httpOnly: true, // CRITICAL for security
    maxAge: 60 * 60 * 24 * 7, // e.g., 7 days
    // path: "/api/auth/refresh", // IMPORTANT: only send to the refresh API route
    path: "/", // CRITICAL update
    sameSite: "lax",
    // secure: true, // enable in production (HTTPS)
    secure: isProduction, // Use 'secure: true' in production
  });

  console.log("✅ Token set successfully");

  return res;
}

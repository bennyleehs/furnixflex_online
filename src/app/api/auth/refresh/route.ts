// src/app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  verifyToken,
  generateAuthToken,
  generateRefreshToken,
  fetchUserClaimsByUid,
} from "@/lib/auth"; // Import utilities

export const runtime = "nodejs";
// --- ADD THIS LINE ---
const isProduction = process.env.NODE_ENV === "production";

export async function POST(req: NextRequest) {
  // const cookieStore = await cookies();
  // const refreshToken = cookieStore.get("refreshToken")?.value;

  // --- FIX: Read the cookie from the 'req' object ---
  // This 'req' is the internal fetch request from the middleware
  const refreshToken = req.cookies.get("refreshToken")?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { success: false, error: "No refresh token" },
      { status: 401 },
    );
  }

  // Use the universal verifyToken function
  const verified = await verifyToken(refreshToken);

  // Check if token is structurally invalid or expired
  if (!verified || "expired" in verified) {
    // Create a response and use it to set/delete cookies, ensuring consistency
    const errorResponse = NextResponse.json(
      { success: false, error: "Invalid or expired refresh token" },
      { status: 401 },
    );

    // ✅ Recommended: Delete using the response object's headers
    errorResponse.cookies.set("authToken", "", {
      maxAge: 0,
      httpOnly: true,
      path: "/",
    });
    errorResponse.cookies.set("refreshToken", "", {
      maxAge: 0,
      httpOnly: true,
      path: "/",
    });

    return errorResponse;
  }

  // Check if the verified token is indeed a refresh token
  if (!("type" in verified) || verified.type !== "refresh") {
    return NextResponse.json(
      { success: false, error: "Token is not a refresh token" },
      { status: 401 },
    );
  }

  const uid = verified.uid;

  // 1. Fetch the user's latest claims (role, dept, branch) from the DB
  const userClaims = await fetchUserClaimsByUid(uid);

  // if (!userClaims) {
  //   // User not found (e.g., account deleted)
  //   cookieStore.delete("authToken");
  //   cookieStore.delete("refreshToken");
  //   return NextResponse.json(
  //     { success: false, error: "User not found" },
  //     { status: 401 },
  //   );
  // }

  if (!userClaims) {
    // User not found (e.g., account deleted)
    // --- FIX: Need to create a response to delete cookies ---
    const errorResponse = NextResponse.json(
      { success: false, error: "User not found" },
      { status: 401 },
    );
    // cookieStore.delete("authToken"); // <-- OLD
    // cookieStore.delete("refreshToken"); // <-- OLD
    errorResponse.cookies.set("authToken", "", {
      maxAge: 0,
      httpOnly: true,
      path: "/",
    });
    errorResponse.cookies.set("refreshToken", "", {
      maxAge: 0,
      httpOnly: true,
      path: "/",
    });
    return errorResponse;
  }

  // Destructure for readability
  const { roleName, departmentName, branchRef } = userClaims;

  // 2. Generate new short-lived Auth Token
  const newAuthToken = await generateAuthToken(
    uid,
    roleName,
    departmentName,
    branchRef,
  );

  // 3. Generate new long-lived Refresh Token (for session sliding)
  const newRefreshToken = await generateRefreshToken(uid);

  const res = NextResponse.json({ success: true });

  // 4. Set the new tokens
  // Reset Auth Token
  res.cookies.set("authToken", newAuthToken, {
    httpOnly: true,
    // maxAge: 60 * 60 * 1, // 1 hour
    maxAge: 60 * 60 * 9, // 9 hour
    // maxAge: 20, // 20 sec for testing
    path: "/",
    sameSite: "lax",
    // secure: true,
    secure: isProduction, // <-- NEW: Use production flag
  });

  // Reset Refresh Token
  res.cookies.set("refreshToken", newRefreshToken, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
    sameSite: "lax",
    // secure: true,
    secure: isProduction, // <-- NEW: Use production flag
  });

  return res;
}

// app/api/check-access/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { getUserRole, getRolePermissions, checkPermissionForPath } from "@/lib/permissionCache";

export const runtime = "nodejs"; // Explicitly use nodejs runtime for database operations

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json();
    
    // Get token from cookies
    const token = (await cookies()).get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ hasAccess: false, error: "No auth token" }, { status: 401 });
    }

    const decoded = await verifyToken(token);

    if (!decoded || "expired" in decoded) {
      return NextResponse.json({ hasAccess: false, error: "Invalid token" }, { status: 401 });
    }

    // Get user's role directly
    const role = await getUserRole(decoded.id);
    
    if (!role) {
      return NextResponse.json({ hasAccess: false, error: "User role not found" }, { status: 403 });
    }
    
    // Get permissions for this role
    const permissions = await getRolePermissions(role);
    
    // Check if any permission grants access to this path
    let hasAccess = false;
    for (const permValue of permissions) {
      if (checkPermissionForPath(permValue, path)) {
        hasAccess = true;
        break;
      }
    }

    return NextResponse.json({ hasAccess });
  } catch (error) {
    console.error("Error checking access:", error);
    return NextResponse.json({ hasAccess: false, error: "Server error" }, { status: 500 });
  }
}
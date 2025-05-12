// app/api/check-permission/route.ts
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { permissionValue } = await req.json();
    
    // Get the auth token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get("authToken");
    
    if (!authToken?.value) {
      return NextResponse.json({ hasPermission: false }, { status: 401 });
    }
    
    // Verify the token
    const tokenData = await verifyToken(authToken.value);
    
    if (!tokenData || "expired" in tokenData) {
      return NextResponse.json({ hasPermission: false }, { status: 401 });
    }
    
    // Check if the user has this specific permission
    const userPermissions = tokenData.permissions || [];
    const hasPermission = userPermissions.includes(permissionValue);
    
    // Also check if user has any parent permission that covers this one
    // For example, if permissionValue is "1.2" and user has "1.0.0"
    const hasParentPermission = userPermissions.some(perm => {
      // Only process number formats like X.Y.Z
      if (!/^\d+(\.\d+)*$/.test(perm)) return false;
      
      // Handle parent permissions (e.g. 1.0.0 is parent of 1.2)
      const permParts = perm.split('.');
      const valueParts = permissionValue.split('.');
      
      // Check if this is a parent permission
      if (permParts[0] === valueParts[0]) {
        // If it's a "all" permission like X.0.0
        if (permParts[1] === '0') {
          return true;
        }
      }
      
      return false;
    });
    
    return NextResponse.json({ hasPermission: hasPermission || hasParentPermission });
  } catch (error) {
    console.error("Error checking permission:", error);
    return NextResponse.json({ hasPermission: false }, { status: 500 });
  }
}
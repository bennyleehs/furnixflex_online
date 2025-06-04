// app/api/check-permission/route.ts
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { getPermissionsForRole } from "@/utils/accessControlUtils";

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
    const userPermissions = getPermissionsForRole(
      tokenData.branchRef,
      tokenData.departmentName,
      tokenData.roleName
    );
    
    // Direct match
    const hasPermission = userPermissions.includes(permissionValue);
    
    // Check for hierarchical permissions
    const hasHierarchicalPermission = userPermissions.some(perm => {
      // Only process number formats like X.Y.Z
      if (!/^\d+(\.\d+)*$/.test(perm)) return false;
      
      const permParts = perm.split('.');
      const valueParts = permissionValue.split('.');
      
      // Case 1: User has parent permission (e.g., user has "1.0.1", checking for "1")
      if (valueParts.length === 1 && permParts.length >= 2) {
        // If checking for menu "1" and user has "1.0.1" or "1.x.y"
        if (permParts[0] === valueParts[0]) {
          // If user has "1.0.x" (all submenus), grant access
          if (permParts[1] === '0') {
            return true;
          }
          // If user has any specific submenu permission, grant access to parent menu
          return true;
        }
      }
      
      // Case 2: User has parent permission (e.g., user has "1.0.1", checking for "1.2")
      if (valueParts.length === 2 && permParts.length >= 3) {
        if (permParts[0] === valueParts[0]) {
          // If user has "1.0.x" (all submenus), grant access
          if (permParts[1] === '0') {
            return true;
          }
          // If user has specific submenu permission, check if it matches
          if (permParts[1] === valueParts[1]) {
            return true;
          }
        }
      }
      
      // Case 3: Exact hierarchical match (e.g., user has "1.2.3", checking for "1.2.3")
      if (valueParts.length === permParts.length) {
        return perm === permissionValue;
      }
      
      return false;
    });
    
    return NextResponse.json({ hasPermission: hasPermission || hasHierarchicalPermission });
  } catch (error) {
    console.error("Error checking permission:", error);
    return NextResponse.json({ hasPermission: false }, { status: 500 });
  }
}
// app/api/check-permission/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { getCachedRolePermissions } from "@/utils/accessControl";
import sidebarData from "@/data/sidebar_menu.json";
import { DEFAULT_ACCESS_SECTIONS } from "@/utils/defaultAccess";

// Helper function to check if a permission value is a parent of another value
function isParentPermission(parent: string, child: string | number): boolean {
  // Convert both to strings to ensure we can use string methods
  const parentStr = String(parent);
  const childStr = String(child);

  return childStr === parentStr || childStr.startsWith(parentStr + ".");
}

// Extract all menu item IDs
function extractIds(items: any[]): { id: string; label: string }[] {
  let ids: { id: string; label: string }[] = [];

  for (const item of items) {
    if (item.id) {
      ids.push({ id: String(item.id), label: item.label });
    }

    if (item.children && Array.isArray(item.children)) {
      ids = [...ids, ...extractIds(item.children)];
    }
  }

  return ids;
}

// Get all valid permission IDs from the sidebar
const allPermissionInfo: { id: string; label: string }[] = [];
sidebarData.forEach((section: { menuItems: any[] }) => {
  if (section.menuItems && Array.isArray(section.menuItems)) {
    allPermissionInfo.push(...extractIds(section.menuItems));
  }
});

export const runtime = "nodejs"; // Ensure it runs in Node.js
export async function POST(req: NextRequest) {
  try {
    const { permissionValue } = await req.json();
    console.log("Checking permission for:", permissionValue);

    // Check if this permission belongs to a default access section
    const itemInfo = allPermissionInfo.find(
      (item) => String(item.id) === String(permissionValue),
    );
    if (itemInfo && DEFAULT_ACCESS_SECTIONS.includes(itemInfo.label)) {
      console.log(
        `${permissionValue} belongs to default access section ${itemInfo.label}`,
      );
      return NextResponse.json({ hasPermission: true });
    }

    // Get token from cookies
    const token = (await cookies()).get("authToken")?.value;

    if (!token) {
      console.log("No auth token found");
      return NextResponse.json({ hasPermission: false }, { status: 401 });
    }

    const decoded = await verifyToken(token);

    if (!decoded || "expired" in decoded) {
      console.log("Invalid or expired token");
      return NextResponse.json({ hasPermission: false }, { status: 401 });
    }

    console.log("User role:", decoded.role);

    // Get permissions for the user's role
    const permissions = await getCachedRolePermissions(decoded.role);
    console.log("User permissions:", permissions);

    // Check if the role has the required permission
    const hasPermission = permissions.some((permission) => {
      // Ensure we can safely use string methods by converting to string
      const permStr = String(permission);
      const reqPermStr = String(permissionValue);

      const match =
        permStr === reqPermStr || isParentPermission(permStr, reqPermStr);
      if (match) {
        console.log(
          `Permission match found: ${permission} grants access to ${permissionValue}`,
        );
      }
      return match;
    });

    console.log("Permission check result:", hasPermission);
    return NextResponse.json({ hasPermission });
  } catch (error) {
    console.error("Error checking permission:", error);
    return NextResponse.json({ hasPermission: false }, { status: 500 });
  }
}

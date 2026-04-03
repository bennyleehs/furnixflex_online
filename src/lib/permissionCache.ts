// lib/permissionCache.ts
import { getPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { cache } from "react";
import { loadSidebarMenu } from "@/Sidemenu/loader";

function extractMenuItems(items: any[]): { value: number | string, route: string }[] {
  let result: { value: number | string, route: string }[] = [];
  
  for (const item of items) {
    // Extract the item's id and route - Updated to use id instead of value
    const itemValue = item.id;
    const itemRoute = item.route;
    
    if (itemValue && itemRoute && itemRoute !== '#') {
      result.push({ value: itemValue, route: itemRoute });
    }
    
    // Recursively extract children if they exist
    if (item.children && Array.isArray(item.children)) {
      result = [...result, ...extractMenuItems(item.children)];
    }
  }
  
  return result;
}

// Cache menu items per country with TTL
const menuItemsCache: Map<string, {
  items: { value: number | string, route: string }[],
  timestamp: number
}> = new Map();

async function getAllMenuItems(countryCode: string): Promise<{ value: number | string, route: string }[]> {
  const now = Date.now();
  const cached = menuItemsCache.get(countryCode);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.items;
  }

  const sidebarData = await loadSidebarMenu(countryCode);
  const allItems: { value: number | string, route: string }[] = [];
  sidebarData.forEach((section: any) => {
    if (section.menuItems && Array.isArray(section.menuItems)) {
      allItems.push(...extractMenuItems(section.menuItems));
    }
  });

  menuItemsCache.set(countryCode, { items: allItems, timestamp: now });
  return allItems;
}

// In-memory cache with TTL
const rolePermissionsCache: Map<number, {
  permissions: number[],
  timestamp: number
}> = new Map();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// This function will be cached for the same user ID during a request
export const getUserRole = cache(async (userId: number): Promise<number | null> => {
  try {
    const db = await getPool();
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT role_id FROM users WHERE id = ?", 
      [userId]
    );
    
    if (!rows.length) return null;
    return rows[0].role_id;
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
});

export async function getRolePermissions(roleId: number): Promise<number[]> {
  // Check cache first
  const now = Date.now();
  const cached = rolePermissionsCache.get(roleId);
  
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.permissions;
  }
  
  try {
    const db = await getPool();
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT permission_value FROM user_permissions WHERE role_id = ?",
      [roleId]
    );
    
    const permissions = rows.map((row) => Number(row.permission_value));
    
    // Update cache
    rolePermissionsCache.set(roleId, {
      permissions,
      timestamp: now
    });
    
    return permissions;
  } catch (error) {
    console.error("Error getting role permissions:", error);
    return [];
  }
}

// Function to check if a permission value allows access to a specific path
export async function checkPermissionForPath(
  permissionValue: number, 
  path: string,
  countryCode: string = "my"
): Promise<boolean> {
  const allMenuItems = await getAllMenuItems(countryCode);
  // For exact match
  const exactMatch = allMenuItems.find(item => 
    Number(item.value) === permissionValue && 
    (item.route === path || path.startsWith(item.route + "/") || item.route === "#")
  );
  
  if (exactMatch) return true;
  
  // For hierarchical permissions
  const permString = String(permissionValue);
  
  return allMenuItems.some(item => {
    const itemValue = String(item.value);
    
    // If permission is parent of item (e.g., perm=1 and item=1.2)
    const isParentOf = itemValue.startsWith(permString + ".") || 
                       itemValue.startsWith(Math.floor(permissionValue) + ".");
                       
    // If item route matches the requested path
    const routeMatches = item.route === path || 
                         path.startsWith(item.route + "/") || 
                         item.route === "#";
                         
    return isParentOf && routeMatches;
  });
}
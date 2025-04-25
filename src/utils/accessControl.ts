// utils/accessControl.ts
import { createPool } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import sidebarData from "@/data/sidebar_menu.json";
import { DEFAULT_ACCESS_SECTIONS } from "./defaultAccess";

export const runtime = "nodejs"; // Ensure it runs in Node.js

// Get routes for default access sections
function getDefaultAccessRoutes(): string[] {
  const routes: string[] = [];
  
  sidebarData.forEach((section: any) => {
    if (section.menuItems && Array.isArray(section.menuItems)) {
      section.menuItems.forEach((item: any) => {
        if (DEFAULT_ACCESS_SECTIONS.includes(item.label) && item.route && item.route !== '#') {
          routes.push(item.route);
          
          // Include child routes if they exist
          if (item.children && Array.isArray(item.children)) {
            const extractChildRoutes = (children: any[]) => {
              children.forEach(child => {
                if (child.route && child.route !== '#') {
                  routes.push(child.route);
                }
                if (child.children && Array.isArray(child.children)) {
                  extractChildRoutes(child.children);
                }
              });
            };
            
            extractChildRoutes(item.children);
          }
        }
      });
    }
  });
  
  return routes;
}

const DEFAULT_ACCESS_ROUTES = getDefaultAccessRoutes();

// Recursive function to flatten the menu structure and extract all IDs and routes
function extractMenuItems(items: any[], parentPath: string = ''): { id: string, route: string, label: string }[] {
  let result: { id: string, route: string, label: string }[] = [];
  
  for (const item of items) {
    // Extract the item's ID, route, and label
    const itemId = item.id;
    const itemRoute = item.route;
    const itemLabel = item.label;
    
    if (itemRoute && itemRoute !== '#') {
      if (itemId) {
        result.push({ id: itemId, route: itemRoute, label: itemLabel });
      }
    }
    
    // Recursively extract children if they exist
    if (item.children && Array.isArray(item.children)) {
      result = [...result, ...extractMenuItems(item.children, itemRoute !== '#' ? itemRoute : parentPath)];
    }
  }
  
  return result;
}

// Extract all menu items from the sidebar
const allMenuItems: { id: string, route: string, label: string }[] = [];
sidebarData.forEach((section: { menuItems: any[]; }) => {
  if (section.menuItems && Array.isArray(section.menuItems)) {
    allMenuItems.push(...extractMenuItems(section.menuItems));
  }
});

// Cache for role permissions
const rolePermissionsCache: Record<number, { permissions: string[]; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getRolePermissions(roleId: number): Promise<string[]> {
  try {
    const db = createPool();

    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT permission_value FROM user_permissions WHERE role_id = ?",
      [roleId],
    );

    if (!rows.length) return [];
    
    // Get the raw permission value
    const rawPermissionValue = rows[0].permission_value;
    
    // Try to determine if it's already an array, a JSON string, or something else
    if (Array.isArray(rawPermissionValue)) {
      return rawPermissionValue.map(item => String(item));
    }
    
    // If it's a string that might be JSON, try to parse it
    if (typeof rawPermissionValue === 'string') {
      try {
        // Clean the string in case there are invalid characters
        const cleanedJson = rawPermissionValue.trim();
        return JSON.parse(cleanedJson);
      } catch (parseError) {
        console.error("Error parsing JSON permission:", parseError);
        
        // If it's a comma-separated string, split it
        if (rawPermissionValue.includes(',')) {
          return rawPermissionValue.split(',').map(item => item.trim());
        }
        
        // If it's a single value, return as an array with one item
        return [rawPermissionValue];
      }
    }
    
    // If it's a number, convert to string and return as array
    if (typeof rawPermissionValue === 'number') {
      return [String(rawPermissionValue)];
    }
    
    console.error("Unexpected permission value format:", typeof rawPermissionValue);
    return [];
  } catch (error) {
    console.error("Error getting role permissions:", error);
    return [];
  }
}

// Function to check if a specific permission value grants access to a path
function checkPermissionForPath(permissionId: string, path: string): boolean {
  // For default access routes
  if (DEFAULT_ACCESS_ROUTES.some(route => route === path || path.startsWith(route + "/"))) {
    return true;
  }
  
  // For exact match - check if the permission ID directly maps to this path
  const exactMatch = allMenuItems.find(item => 
    item.id === permissionId && 
    (item.route === path || path.startsWith(item.route + "/") || item.route === "#")
  );
  
  if (exactMatch) return true;
  
  // For hierarchical permissions:
  // Check if any menu item has an ID that starts with the same prefix as the permission
  // or if the permission ID is a parent of any menu item ID
  return allMenuItems.some(item => {
    // If permission is parent of item (e.g., perm="1" and item="1.2")
    const isParentOf = item.id && item.id.startsWith(permissionId + "."); 
                       
    // If item route matches the requested path
    const routeMatches = item.route === path || 
                         path.startsWith(item.route + "/") || 
                         item.route === "#";
                         
    return isParentOf && routeMatches;
  });
}

/**
 * Check if a user has access to a specific path
 * @param userId User ID to check permissions for
 * @param path Path to check access to
 * @returns Boolean indicating if access is granted
 */
export async function checkAccess(
  userId: number,
  path: string,
): Promise<boolean> {
  try {
    // First check if this is a default access route
    if (DEFAULT_ACCESS_ROUTES.some(route => route === path || path.startsWith(route + "/"))) {
      return true;
    }
    
    const db = createPool();

    // Get user's role from database
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT role_id FROM users1 WHERE id = ?",
      [userId],
    );

    if (!rows.length) return false;

    const roleId = rows[0].role_id;

    // Get permissions for this role
    const permissionValues = await getCachedRolePermissions(roleId);

    // Check if any permission grants access to this path
    return permissionValues.some(permValue => checkPermissionForPath(permValue, path));
  } catch (error) {
    console.error("Error checking access:", error);
    return false;
  }
}

/**
 * Get all paths a user has access to based on their role
 * @param userId User ID to get accessible paths for
 * @returns Array of paths the user can access
 */
export async function getUserAccessiblePaths(
  userId: number,
): Promise<string[]> {
  try {
    // Start with default access routes
    const accessiblePaths: string[] = [...DEFAULT_ACCESS_ROUTES];
    
    const db = createPool();

    // Get user's role from database
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT role_id FROM users1 WHERE id = ?",
      [userId],
    );

    if (!rows.length) return accessiblePaths;

    const roleId = rows[0].role_id;

    // Get permissions for this role
    const permissionValues = await getCachedRolePermissions(roleId);

    // Find all accessible routes based on permissions
    for (const permValue of permissionValues) {
      const matchingRoutes = allMenuItems
        .filter(item => {
          // Direct match or hierarchical relationship
          return item.id === permValue || 
                 (item.id && item.id.startsWith(permValue + "."));
        })
        .map(item => item.route)
        .filter(route => route !== "#");
        
      accessiblePaths.push(...matchingRoutes);
    }

    return [...new Set(accessiblePaths)]; // Remove duplicates
  } catch (error) {
    console.error("Error getting user accessible paths:", error);
    return DEFAULT_ACCESS_ROUTES; // Return at least default routes
  }
}

/**
 * Get cached role permissions or fetch from database
 */
export async function getCachedRolePermissions(
  roleId: number,
): Promise<string[]> {
  const now = Date.now();

  // Check if we have a valid cache entry
  if (
    rolePermissionsCache[roleId] &&
    now - rolePermissionsCache[roleId].timestamp < CACHE_TTL
  ) {
    return rolePermissionsCache[roleId].permissions;
  }

  // Fetch permissions and update cache
  const permissions = await getRolePermissions(roleId);
  rolePermissionsCache[roleId] = {
    permissions,
    timestamp: now,
  };

  return permissions;
}
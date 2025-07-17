// utils/accessControlUtils.ts
import fs from 'fs';
import path from 'path';
import sidebarData from "@/Json/sidebar_menu.json";
import { DEFAULT_ACCESS_SECTIONS } from "./defaultAccess";

// Define types
export interface AccessControlMap {
  [key: string]: string[];
}

// Cache the parsed JSON to avoid repeated file reads
let accessControlCache: AccessControlMap | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

//Load access control permissions from JSON file
export function loadAccessControl(): AccessControlMap {
  const now = Date.now();
  
  // Return cached data if valid
  if (accessControlCache && now - cacheTimestamp < CACHE_TTL) {
    return accessControlCache;
  }
  
  try {
    // Load the access control JSON file
    const filePath = path.join(process.cwd(), 'src', 'Json', 'access_control.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const accessControl = JSON.parse(fileContent) as AccessControlMap;
    
    // Update cache
    accessControlCache = accessControl;
    cacheTimestamp = now;
    
    return accessControl;
  } catch (error) {
    console.error('Error loading access control file:', error);
    return {};
  }
}

// Get routes for default access sections
export function getDefaultAccessRoutes(): string[] {
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

export const DEFAULT_ACCESS_ROUTES = getDefaultAccessRoutes();

// Extract all menu items from the sidebar for permission checking
function extractMenuItems(items: any[]): { id: string, route: string, label: string }[] {
  let result: { id: string, route: string, label: string }[] = [];
  
  for (const item of items) {
    // Extract the item's ID, route, and label
    const itemId = item.id;
    const itemRoute = item.route;
    const itemLabel = item.label;
    
    if (itemRoute) {
      if (itemId) {
        result.push({ id: itemId, route: itemRoute, label: itemLabel });
      }
    }
    
    // Recursively extract children if they exist
    if (item.children && Array.isArray(item.children)) {
      result = [...result, ...extractMenuItems(item.children)];
    }
  }
  
  return result;
}

// Extract all menu items from the sidebar
export const allMenuItems: { id: string, route: string, label: string }[] = [];
sidebarData.forEach((section: any) => {
  if (section.menuItems && Array.isArray(section.menuItems)) {
    allMenuItems.push(...extractMenuItems(section.menuItems));
  }
});

/**
 * Get permissions for a specific role based on branch.department.role pattern
 * @param branch User's branch code (e.g., 'JB', 'SK', 'SA')
 * @param department User's department (e.g., 'Technology', 'Office')
 * @param role User's role title (e.g., 'Supervisor', 'Manager')
 * @returns Array of permission values this user has
 */
export function getPermissionsForRole(branch: string, department: string, role: string): string[] {
  const accessControl = loadAccessControl();
  const roleKey = `${branch}.${department}.${role}`;
  
  if (accessControl[roleKey]) {
    // Parse permission values - some might be comma-separated strings
    const permissionsArray: string[] = [];
    
    for (const permission of accessControl[roleKey]) {
      // Handle comma-separated values within each array element
      if (permission.includes(',')) {
        const splitPermissions = permission.split(',').map(p => p.trim());
        permissionsArray.push(...splitPermissions);
      } else {
        permissionsArray.push(permission.trim());
      }
    }
    
    return permissionsArray;
  }
  
  return [];
}

// Check if a specific permission value grants access to a path
export function checkPermissionForPath(permissionId: string, path: string): boolean {
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
 * Check if a user has access to a specific path based on their permissions
 */
export function checkUserAccess(permissions: string[], path: string): boolean {
  // First check if this is a default access route
  if (DEFAULT_ACCESS_ROUTES.some(route => route === path || path.startsWith(route + "/"))) {
    return true;
  }
  
  // Check if any permission grants access to this path
  return permissions.some(permValue => checkPermissionForPath(permValue, path));
}

/**
 * Get all paths a user has access to based on their permissions
 */
export function getUserAccessiblePaths(permissions: string[]): string[] {
  // Start with default access routes
  const accessiblePaths: string[] = [...DEFAULT_ACCESS_ROUTES];
  
  // Find all accessible routes based on permissions
  for (const permValue of permissions) {
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
}
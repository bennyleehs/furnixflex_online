// utils/accessControlUtils.ts
import fs from 'fs';
import { DEFAULT_ACCESS_SECTIONS } from "./defaultAccess";
import { getAccessControlFilePath, getMenuFilePath } from "@/Sidemenu/loader";

// Define types
export interface AccessControlMap {
  [key: string]: string[];
}

// Cache the parsed JSON per country to avoid repeated file reads
const accessControlCacheMap: Map<string, { data: AccessControlMap, timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

//Load access control permissions from JSON file
export function loadAccessControl(countryCode: string = "my"): AccessControlMap {
  const now = Date.now();
  const cached = accessControlCacheMap.get(countryCode);
  
  // Return cached data if valid
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    // Load the country-specific access control JSON file
    const filePath = getAccessControlFilePath(countryCode);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const accessControl = JSON.parse(fileContent) as AccessControlMap;
    
    // Update cache
    accessControlCacheMap.set(countryCode, { data: accessControl, timestamp: now });
    
    return accessControl;
  } catch (error) {
    console.error('Error loading access control file:', error);
    return {};
  }
}

// Cache sidebar data per country
const sidebarCacheMap: Map<string, { data: any[], timestamp: number }> = new Map();

function loadSidebarDataSync(countryCode: string): any[] {
  const now = Date.now();
  const cached = sidebarCacheMap.get(countryCode);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const filePath = getMenuFilePath(countryCode);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    sidebarCacheMap.set(countryCode, { data, timestamp: now });
    return data;
  } catch (error) {
    console.error('Error loading sidebar menu file:', error);
    return [];
  }
}

// Get routes for default access sections
export function getDefaultAccessRoutes(countryCode: string = "my"): string[] {
  const sidebarData = loadSidebarDataSync(countryCode);
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

// Get all menu items for a given country
export function getAllMenuItems(countryCode: string = "my"): { id: string, route: string, label: string }[] {
  const sidebarData = loadSidebarDataSync(countryCode);
  const items: { id: string, route: string, label: string }[] = [];
  sidebarData.forEach((section: any) => {
    if (section.menuItems && Array.isArray(section.menuItems)) {
      items.push(...extractMenuItems(section.menuItems));
    }
  });
  return items;
}

/**
 * Get permissions for a specific role based on branch.department.role pattern
 */
export function getPermissionsForRole(branch: string, department: string, role: string, countryCode: string = "my"): string[] {
  // Superadmin bypass: grant all permissions for every menu item
  if (role === "Superadmin") {
    return generateAllPermissions(countryCode);
  }

  const accessControl = loadAccessControl(countryCode);
  const normalizedDept = department.toUpperCase();
  const roleKey = Object.keys(accessControl).find((key) => {
    const parts = key.split(".");
    return (
      parts[0] === branch &&
      parts[1].toUpperCase() === normalizedDept &&
      parts.slice(2).join(".") === role
    );
  });

  if (roleKey && accessControl[roleKey]) {
    // Parse permission values - some might be comma-separated strings
    const rawPermissions: string[] = [];
    
    for (const permission of accessControl[roleKey]) {
      // Handle comma-separated values within each array element
      if (permission.includes(',')) {
        const splitPermissions = permission.split(',').map(p => p.trim());
        rawPermissions.push(...splitPermissions);
      } else {
        rawPermissions.push(permission.trim());
      }
    }

    // Expand permissions based on hierarchy:
    // Level 1 (Delete) covers 2 (Update), 3 (Create), 4 (Read)
    // Level 2 (Update) covers 3 (Create), 4 (Read)
    // Level 3 (Create) covers 4 (Read)
    // Level 4 (Read) only
    const expanded = new Set<string>(rawPermissions);
    for (const perm of rawPermissions) {
      const parts = perm.split(".");
      const actionType = parseInt(parts[parts.length - 1], 10);
      if (actionType >= 1 && actionType <= 3) {
        const prefix = parts.slice(0, -1).join(".");
        for (let lower = actionType + 1; lower <= 4; lower++) {
          expanded.add(`${prefix}.${lower}`);
        }
      }
    }
    
    return Array.from(expanded);
  }
  
  return [];
}

/**
 * Generate all possible permission IDs from the sidebar menu for Superadmin access.
 * Produces: section-level (e.g. "1.0.1"), item-level (e.g. "1.1.1"), and raw IDs.
 * Action types: 1=Delete, 2=Update, 3=Create, 4=Read
 */
function generateAllPermissions(countryCode: string): string[] {
  const menuItems = getAllMenuItems(countryCode);
  const permissions = new Set<string>();

  for (const item of menuItems) {
    if (!item.id) continue;
    // Add raw ID (e.g. "1", "1.1", "2.3")
    permissions.add(item.id);
    // Add all action types for this item (e.g. "1.1.1" through "1.1.4")
    for (let action = 1; action <= 4; action++) {
      permissions.add(`${item.id}.${action}`);
    }
    // Add section-level wildcard (e.g. "1.0.1" through "1.0.4")
    const sectionId = item.id.split(".")[0];
    for (let action = 1; action <= 4; action++) {
      permissions.add(`${sectionId}.0.${action}`);
    }
  }

  return Array.from(permissions);
}

// Check if a specific permission value grants access to a path
export function checkPermissionForPath(permissionId: string, path: string, countryCode: string = "my"): boolean {
  const defaultRoutes = getDefaultAccessRoutes(countryCode);
  const menuItems = getAllMenuItems(countryCode);

  // For default access routes
  if (defaultRoutes.some(route => route === path || path.startsWith(route + "/"))) {
    return true;
  }
  
  // For exact match - check if the permission ID directly maps to this path
  const exactMatch = menuItems.find(item => 
    item.id === permissionId && 
    (item.route === path || path.startsWith(item.route + "/") || item.route === "#")
  );
  
  if (exactMatch) return true;
  
  // For hierarchical permissions:
  return menuItems.some(item => {
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
export function checkUserAccess(permissions: string[], path: string, countryCode: string = "my"): boolean {
  const defaultRoutes = getDefaultAccessRoutes(countryCode);
  // First check if this is a default access route
  if (defaultRoutes.some(route => route === path || path.startsWith(route + "/"))) {
    return true;
  }
  
  // Check if any permission grants access to this path
  return permissions.some(permValue => checkPermissionForPath(permValue, path, countryCode));
}

/**
 * Get all paths a user has access to based on their permissions
 */
export function getUserAccessiblePaths(permissions: string[], countryCode: string = "my"): string[] {
  const defaultRoutes = getDefaultAccessRoutes(countryCode);
  const menuItems = getAllMenuItems(countryCode);
  // Start with default access routes
  const accessiblePaths: string[] = [...defaultRoutes];
  
  // Find all accessible routes based on permissions
  for (const permValue of permissions) {
    const matchingRoutes = menuItems
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
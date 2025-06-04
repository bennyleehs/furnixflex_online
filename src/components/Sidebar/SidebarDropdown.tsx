//src/components/Sidebar/SidebarDropdown.tsx
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PermissionGuard from "../PermissionGuard";
import { DEFAULT_ACCESS_SECTIONS } from "@/utils/defaultAccess";

const SidebarDropdown = ({ item }: any) => {
  const pathname = usePathname();
  const [openSubmenus, setOpenSubmenus] = useState<{ [key: string]: boolean }>({});
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  // Fetch user permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await fetch('/api/permissions');
        if (res.ok) {
          const data = await res.json();
          setUserPermissions(data.permissions || []);
        }
      } catch (error) {
        console.error("Error fetching permissions:", error);
      } finally {
        setPermissionsLoaded(true);
      }
    };

    fetchPermissions();
  }, []);

  // Check if user has permission for a specific item
  const hasPermissionForItem = useCallback((itemId: string): boolean => {
    if (!itemId || !permissionsLoaded) return false;
    
    return userPermissions.some(perm => {
      const permParts = perm.split('.');
      const itemParts = itemId.split('.');
      
      // Direct match
      if (perm === itemId) return true;
      
      // Hierarchical match - check if user permission covers this item
      if (permParts.length >= itemParts.length) {
        for (let i = 0; i < itemParts.length; i++) {
          if (permParts[i] !== itemParts[i] && permParts[i] !== '0') {
            return false;
          }
        }
        return true;
      }
      
      return false;
    });
  }, [userPermissions, permissionsLoaded]);

  // Recursively check if any descendant has permission
  const hasAnyDescendantPermission = useCallback((menuItem: any): boolean => {
    // If item has an id and user has permission for it, return true
    if (menuItem.id && hasPermissionForItem(menuItem.id)) {
      return true;
    }
    
    // If item has children, check recursively
    if (menuItem.children && Array.isArray(menuItem.children)) {
      return menuItem.children.some((child: any) => hasAnyDescendantPermission(child));
    }
    
    return false;
  }, [hasPermissionForItem]);

  // Check if item should be shown
  const shouldShowItem = useCallback((menuItem: any): boolean => {
    // If it's in default access sections, always show
    if (DEFAULT_ACCESS_SECTIONS.includes(menuItem.label)) {
      return true;
    }
    
    // If it has an id, check permission directly
    if (menuItem.id) {
      return hasPermissionForItem(menuItem.id);
    }
    
    // If it doesn't have an id but has children, check if any descendant has permission
    if (menuItem.children && Array.isArray(menuItem.children)) {
      return hasAnyDescendantPermission(menuItem);
    }
    
    // If no id and no children, show it (fallback)
    return true;
  }, [hasPermissionForItem, hasAnyDescendantPermission]);

  // Wrap isActive in useCallback
  const isActive = useCallback(
    (route: string, children?: any[]): boolean => {
      if (pathname === route) return true;
      if (children) {
        return children.some((child) => isActive(child.route, child.children));
      }
      return false;
    },
    [pathname]
  );

  // Function to toggle submenu open/close
  const toggleSubmenu = (label: string) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  // Auto-open submenus if the current path matches any nested child
  useEffect(() => {
    if (!permissionsLoaded) return;
    
    const openMenus: { [key: string]: boolean } = {};

    item.forEach((subItem: any) => {
      if (shouldShowItem(subItem) && isActive(subItem.route, subItem.children)) {
        openMenus[subItem.label] = true;
      }
    });

    setOpenSubmenus(openMenus);
  }, [pathname, item, isActive, shouldShowItem, permissionsLoaded]);

  const renderMenuItem = (subItem: any, index: number) => {
    // Don't render if permissions are not loaded yet
    if (!permissionsLoaded) {
      return null;
    }

    // Don't render if user doesn't have permission
    if (!shouldShowItem(subItem)) {
      return null;
    }

    const hasChildren = subItem.children && subItem.children.length > 0;
    const isOpen = openSubmenus[subItem.label];
    const activeClass = isActive(subItem.route) ? "text-primary" : "";

    const menuItemContent = (
      <li key={index} className="relative">
        <div
          className={`flex w-full cursor-pointer items-center justify-between rounded-md px-4 py-2 font-medium text-bodydark2 duration-300 ease-in-out hover:text-primary ${activeClass}`}
          onClick={() => toggleSubmenu(subItem.label)}
        >
          <Link href={subItem.route} className="flex-1">
            {subItem.label}
          </Link>

          {hasChildren && (
            <span className="absolute right-4">
              <svg
                className={`h-5 w-5 transition-transform duration-300 ${
                  isOpen ? "rotate-90" : ""
                }`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ transformOrigin: "center" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 6l6 6-6 6"
                />
              </svg>
            </span>
          )}
        </div>

        {hasChildren && isOpen && (
          <SidebarDropdown item={subItem.children} />
        )}
      </li>
    );

    // If the item is in DEFAULT_ACCESS_SECTIONS, show it without additional permission check
    if (DEFAULT_ACCESS_SECTIONS.includes(subItem.label)) {
      return menuItemContent;
    }

    // If the item has an id (permission value), wrap it in PermissionGuard
    if (subItem.id) {
      return (
        <PermissionGuard key={index} permissionValue={subItem.id}>
          {menuItemContent}
        </PermissionGuard>
      );
    }

    // If no id but should be shown (has children with permissions), show it
    return menuItemContent;
  };

  if (!permissionsLoaded) {
    return null;
  }

  return (
    <ul className="flex flex-col pl-7">
      {item.map((subItem: any, index: number) => renderMenuItem(subItem, index))}
    </ul>
  );
};

export default SidebarDropdown;
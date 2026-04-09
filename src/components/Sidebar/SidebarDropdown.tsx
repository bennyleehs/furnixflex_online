//src/components/Sidebar/SidebarDropdown.tsx
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEFAULT_ACCESS_SECTIONS } from "@/utils/defaultAccess";

interface SidebarDropdownProps {
  item: any[];
  permissions: string[];
  permissionsLoaded: boolean;
}

const SidebarDropdown = ({ item, permissions, permissionsLoaded }: SidebarDropdownProps) => {
  const pathname = usePathname();
  const [openSubmenus, setOpenSubmenus] = useState<{ [key: string]: boolean }>({});

  const hasPermissionForItem = useCallback(
    (itemId: string): boolean => {
      if (!itemId || !permissionsLoaded) return false;
      return permissions.some((perm) => {
        if (perm === itemId) return true;
        const permParts = perm.split(".");
        const itemParts = itemId.split(".");
        if (permParts.length >= itemParts.length) {
          for (let i = 0; i < itemParts.length; i++) {
            if (permParts[i] !== itemParts[i] && permParts[i] !== "0") return false;
          }
          return true;
        }
        return false;
      });
    },
    [permissions, permissionsLoaded],
  );

  const hasAnyDescendantPermission = useCallback(
    (menuItem: any): boolean => {
      if (menuItem.id && hasPermissionForItem(menuItem.id)) return true;
      if (menuItem.children && Array.isArray(menuItem.children)) {
        return menuItem.children.some((child: any) => hasAnyDescendantPermission(child));
      }
      return false;
    },
    [hasPermissionForItem],
  );

  const shouldShowItem = useCallback(
    (menuItem: any): boolean => {
      if (DEFAULT_ACCESS_SECTIONS.includes(menuItem.label)) return true;
      if (menuItem.id) return hasPermissionForItem(menuItem.id);
      if (menuItem.children && Array.isArray(menuItem.children)) {
        return hasAnyDescendantPermission(menuItem);
      }
      return true;
    },
    [hasPermissionForItem, hasAnyDescendantPermission],
  );

  const isActive = useCallback(
    (route: string, children?: any[]): boolean => {
      if (pathname === route) return true;
      if (children) {
        return children.some((child) => isActive(child.route, child.children));
      }
      return false;
    },
    [pathname],
  );

  const toggleSubmenu = (label: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

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

  if (!permissionsLoaded) return null;

  return (
    <ul className="flex flex-col pl-7">
      {item.map((subItem: any, index: number) => {
        if (!shouldShowItem(subItem)) return null;

        const hasChildren = subItem.children && subItem.children.length > 0;
        const isOpen = openSubmenus[subItem.label];
        const activeClass = isActive(subItem.route) ? "text-primary" : "";

        return (
          <li key={index} className="relative">
            <div
              className={`text-bodydark2 hover:text-primary flex w-full cursor-pointer items-center justify-between rounded-md px-4 py-2 font-medium duration-300 ease-in-out ${activeClass}`}
              onClick={() => toggleSubmenu(subItem.label)}
            >
              <Link href={subItem.route} className="flex-1">
                {subItem.label}
              </Link>

              {hasChildren && (
                <span className="absolute right-4">
                  <svg
                    className={`h-5 w-5 transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}
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
              <SidebarDropdown
                item={subItem.children}
                permissions={permissions}
                permissionsLoaded={permissionsLoaded}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default SidebarDropdown;

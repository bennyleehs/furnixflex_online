// src/components/Sidebar/SidebarItem.tsx
import React, { useCallback } from "react";
import Link from "next/link";
import SidebarDropdown from "@/components/Sidebar/SidebarDropdown";
import { usePathname } from "next/navigation";
import { DEFAULT_ACCESS_SECTIONS } from "@/utils/defaultAccess";

interface SidebarItemProps {
  item: any;
  pageName: string;
  setPageName: (name: string) => void;
  permissions: string[];
  permissionsLoaded: boolean;
}

const SidebarItem = ({
  item,
  pageName,
  setPageName,
  permissions,
  permissionsLoaded,
}: SidebarItemProps) => {
  const pathname = usePathname();

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

  const handleClick = () => {
    const updatedPageName =
      pageName !== item.label.toLowerCase() ? item.label.toLowerCase() : "";
    setPageName(updatedPageName);
  };

  const isActive = (menuItem: any): boolean => {
    if (menuItem.route === pathname) return true;
    if (menuItem.children) {
      return menuItem.children.some((child: any) => isActive(child));
    }
    return false;
  };

  if (!permissionsLoaded) return null;
  if (!shouldShowItem(item)) return null;

  const isItemActive = isActive(item);

  return (
    <li>
      <div
        className={`${
          isItemActive ? "bg-graydark text-primary dark:bg-meta-4" : ""
        } group text-bodydark1 hover:bg-graydark hover:text-primary dark:hover:bg-meta-4 relative flex items-center gap-2.5 rounded-xs px-4 py-2 font-medium duration-300 ease-in-out`}
      >
        <Link href={item.route} className="flex flex-1 items-center gap-2.5">
          {item.icon}
          {item.label}
        </Link>

        {item.children && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClick();
            }}
            className="ml-auto border-l border-bodydark2"
          >
            <svg
              className={`transform fill-current transition-transform duration-300 ease-in-out ml-2 hover:scale-135 ${
                pageName === item.label.toLowerCase() ? "rotate-180" : ""
              }`}
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
                fill=""
              />
            </svg>
          </button>
        )}
      </div>

      {item.children && (
        <div
          className={`translate transform overflow-hidden ${
            pageName !== item.label.toLowerCase() && "hidden"
          }`}
        >
          <SidebarDropdown
            item={item.children}
            permissions={permissions}
            permissionsLoaded={permissionsLoaded}
          />
        </div>
      )}
    </li>
  );
};

export default SidebarItem;

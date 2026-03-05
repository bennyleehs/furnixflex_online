// src/components/Sidebar/SidebarItem.tsx
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SidebarDropdown from "@/components/Sidebar/SidebarDropdown";
import { usePathname } from "next/navigation";
import PermissionGuard from "../PermissionGuard";
import { DEFAULT_ACCESS_SECTIONS } from "@/utils/defaultAccess";

const SidebarItem = ({ item, pageName, setPageName }: any) => {
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const pathname = usePathname();

  // Fetch user permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await fetch("/api/permissions");
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
  const hasPermissionForItem = useCallback(
    (itemId: string): boolean => {
      if (!itemId || !permissionsLoaded) return false;

      return userPermissions.some((perm) => {
        const permParts = perm.split(".");
        const itemParts = itemId.split(".");

        // Direct match
        if (perm === itemId) return true;

        // Hierarchical match - check if user permission covers this item
        if (permParts.length >= itemParts.length) {
          for (let i = 0; i < itemParts.length; i++) {
            if (permParts[i] !== itemParts[i] && permParts[i] !== "0") {
              return false;
            }
          }
          return true;
        }

        return false;
      });
    },
    [userPermissions, permissionsLoaded],
  );

  // Recursively check if any descendant has permission
  const hasAnyDescendantPermission = useCallback(
    (menuItem: any): boolean => {
      // If item has an id and user has permission for it, return true
      if (menuItem.id && hasPermissionForItem(menuItem.id)) {
        return true;
      }

      // If item has children, check recursively
      if (menuItem.children && Array.isArray(menuItem.children)) {
        return menuItem.children.some((child: any) =>
          hasAnyDescendantPermission(child),
        );
      }

      return false;
    },
    [hasPermissionForItem],
  );

  // Check if item should be shown
  const shouldShowItem = useCallback(
    (menuItem: any): boolean => {
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
    },
    [hasPermissionForItem, hasAnyDescendantPermission],
  );

  const handleClick = () => {
    const updatedPageName =
      pageName !== item.label.toLowerCase() ? item.label.toLowerCase() : "";
    return setPageName(updatedPageName);
  };

  const isActive = (item: any) => {
    if (item.route === pathname) return true;
    if (item.children) {
      return item.children.some((child: any) => isActive(child));
    }
    return false;
  };

  // Don't render if permissions are not loaded yet
  if (!permissionsLoaded) {
    return null;
  }

  // Don't render if user doesn't have permission
  if (!shouldShowItem(item)) {
    return null;
  }

  const isItemActive = isActive(item);

  // Render the sidebar item with permission check if it has an id property
  // const sidebarItemContent = (
  //   <li>
  //     <Link
  //       href={item.route}
  //       onClick={handleClick}
  //       className={`${isItemActive ? "bg-graydark text-primary dark:bg-meta-4" : ""} group text-bodydark1 hover:bg-graydark hover:text-primary dark:hover:bg-meta-4 relative flex items-center gap-2.5 rounded-xs px-4 py-2 font-medium duration-300 ease-in-out`}
  //     >
  //       {item.icon}
  //       {item.label}
  //       {item.children && (
  //         <svg
  //           className={`absolute top-1/2 right-4 -translate-y-1/2 fill-current ${
  //             pageName === item.label.toLowerCase() && "rotate-180"
  //           }`}
  //           width="20"
  //           height="20"
  //           viewBox="0 0 20 20"
  //           fill="none"
  //           xmlns="http://www.w3.org/2000/svg"
  //         >
  //           <path
  //             fillRule="evenodd"
  //             clipRule="evenodd"
  //             d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
  //             fill=""
  //           />
  //         </svg>
  //       )}
  //     </Link>

  //     {item.children && (
  //       <div
  //         className={`translate transform overflow-hidden ${
  //           pageName !== item.label.toLowerCase() && "hidden"
  //         }`}
  //       >
  //         <SidebarDropdown item={item.children} />
  //       </div>
  //     )}
  //   </li>
  // );
  const sidebarItemContent = (
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
              className={`transform fill-current transition-transform duration-300 ease-in-out ml-2 ${
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
          <SidebarDropdown item={item.children} />
        </div>
      )}
    </li>
  );

  // If the item is in DEFAULT_ACCESS_SECTIONS, show it without permission check
  if (DEFAULT_ACCESS_SECTIONS.includes(item.label)) {
    return <>{sidebarItemContent}</>;
  }

  // Otherwise, if the item has an id (which is used for permission checking), wrap it in a PermissionGuard
  return item.id ? (
    <PermissionGuard permissionValue={item.id}>
      {sidebarItemContent}
    </PermissionGuard>
  ) : (
    <>{sidebarItemContent}</>
  );
};

export default SidebarItem;

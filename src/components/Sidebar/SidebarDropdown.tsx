import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SidebarDropdown = ({ item }: any) => {
  const pathname = usePathname();
  const [openSubmenus, setOpenSubmenus] = useState<{ [key: string]: boolean }>(
    {},
  );

  // Wrap isActive in useCallback
  const isActive = useCallback(
    (route: string, children?: any[]): boolean => {
      if (pathname === route) return true;
      if (children) {
        return children.some((child) => isActive(child.route, child.children));
      }
      return false;
    },
    [pathname], // Add pathname as dependency
  );

  // Function to toggle submenu open/close
  const toggleSubmenu = (label: string) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [label]: !prev[label], // Toggle open/close state
    }));
  };

  // Auto-open submenus if the current path matches any nested child
  useEffect(() => {
    const openMenus: { [key: string]: boolean } = {};

    item.forEach((subItem: any) => {
      if (isActive(subItem.route, subItem.children)) {
        openMenus[subItem.label] = true;
      }
    });

    setOpenSubmenus(openMenus);
  }, [pathname, item, isActive]); // Runs when pathname changes

  return (
    <ul className="flex flex-col pl-7">
      {item.map((subItem: any, index: number) => {
        const hasChildren = subItem.children && subItem.children.length > 0;
        const isOpen = openSubmenus[subItem.label];
        const activeClass = isActive(subItem.route) ? "text-primary" : "";

        return (
          <li key={index} className="relative">
            {/* Click anywhere (text or arrow) to toggle submenu */}
            <div
              className={`flex w-full cursor-pointer items-center justify-between rounded-md px-4 py-2 font-medium text-bodydark2 duration-300 ease-in-out hover:text-primary ${activeClass}`}
              onClick={() => toggleSubmenu(subItem.label)}
            >
              <Link href={subItem.route} className="flex-1">
                {subItem.label}
              </Link>

              {/* Show dropdown arrow if has children */}
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

            {/* Render nested children when open */}
            {hasChildren && isOpen && (
              <SidebarDropdown item={subItem.children} />
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default SidebarDropdown;

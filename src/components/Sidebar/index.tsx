// src/components/Sidebar/index.tsx
"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import SidebarItem from "@/components/Sidebar/SidebarItem";
import ClickOutside from "@/components/ClickOutside";
import useLocalStorage from "@/hooks/useLocalStorage";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
}

interface MenuItem {
  label: string;
  value?: number;
  route: string;
  children?: MenuItem[];
  sub1_value?: number;
  sub2_value?: number;
  sub3_value?: number;
}

interface MenuGroup {
  name: string;
  menuItems: MenuItem[];
}

const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([]);
  const [pageName, setPageName] = useLocalStorage(
    "selectedMenu",
    "ui elements",
  );

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const res = await fetch("/api/admin/menu_items");
        if (res.ok) {
          const data = await res.json();
          setMenuGroups(data);
        }
      } catch (err) {
        console.error("Failed to load menu:", err);
      }
    };
    loadMenu();
  }, []);

  return (
    <ClickOutside onClick={() => setSidebarOpen(false)}>
      <aside
        className={`dark:bg-boxdark absolute top-0 left-0 z-9999 flex h-screen w-65 flex-col overflow-y-hidden bg-black duration-300 ease-linear 2xl:relative 2xl:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* SIDEBAR HEADER */}
        <div className="flex items-center justify-between gap-2 px-6 py-5 2xl:py-6">
          <Link href="/">
            <Image
              width={170}
              height={20}
              src={"/images/logo/classy_logo_gray.svg"}
              alt="Logo"
              priority
            />
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-controls="sidebar"
            className="block cursor-pointer 2xl:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        {/* SIDEBAR HEADER */}

        <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
          {/* Sidebar Menu */}
          <nav className="mt-5 px-4 py-4 2xl:mt-9 2xl:px-6">
            {menuGroups.map((group, groupIndex) => (
              <div key={groupIndex}>
                <h2 className="mb-4 ml-4 text-base font-semibold">
                  {group.name}
                </h2>
                <ul className="mb-6 flex flex-col gap-1.5">
                  {group.menuItems.map((menuItem, menuIndex) => (
                    <SidebarItem
                      key={menuIndex}
                      item={menuItem}
                      pageName={pageName}
                      setPageName={setPageName}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          {/* Sidebar Menu */}
        </div>
        {/* <!-- Footer --> */}

        <p className="mt-auto py-4 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} - Classy Project <br />
          Marketing Sdn. Bhd.
        </p>

        {/* <!-- Footer --> */}
      </aside>
    </ClickOutside>
  );
};

export default Sidebar;

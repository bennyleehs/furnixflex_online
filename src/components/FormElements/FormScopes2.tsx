// scr/components/FormElements/FormScopesAccess.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect, useMemo } from "react";
import SelectDropdown from "@/components/SelectGroup/SelectDropdown";
import sidebarMenu from "@/data/sidebar_menu.json";
import { MenuWithPath, SidebarMenu } from "@/types/sidebarMenu";

const FormScopes2Access = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const key = searchParams.get("key");

  const [accessPaths, setAccessPaths] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  // Fetch current access paths when component mounts
  useEffect(() => {
    const fetchData = async () => {
      if (!key) {
        setIsError(true);
        setMessage("No key provided");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/admin/scopes_access/access_path");
        const data = await res.json();
        const normalizedKey = key.toUpperCase();
        let foundPaths: string[] = [];
        // Find the original key in the data
        const originalKey = Object.keys(data).find(
          (k) => k.toUpperCase() === normalizedKey,
        );

        if (originalKey && data[originalKey]) {
          foundPaths = data[originalKey];
        }

        setAccessPaths(foundPaths.join(","));
        setLoading(false);
      } catch (error) {
        console.error("Error fetching access paths:", error);
        setIsError(true);
        setMessage("Failed to load access paths");
        setLoading(false);
      }
    };
    fetchData();
  }, [key]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!key) {
      setIsError(true);
      setMessage("No key provided");
      return;
    }

    setLoading(true);
    try {
      // Convert comma-separated string to array
      const pathsArray = accessPaths
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");

      const response = await fetch("/api/admin/scopes_access/access_path", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key,
          accessPath: pathsArray,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update access paths");
      }

      setIsError(false);
      setMessage("Access paths updated successfully");

      // Navigate back to the list after a short delay
      setTimeout(() => {
        router.push("/admin/scopes_access");
      }, 1500);
    } catch (error) {
      console.error("Error updating access paths:", error);
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to update access paths",
      );
    } finally {
      setLoading(false);
    }
  };

  // Explicitly type sidebarMenu
  const typedSidebarMenu = sidebarMenu as SidebarMenu;

  // Process menu items to extract all items with IDs and their full paths
  const menuItemsWithPaths = useMemo(() => {
    const result: MenuWithPath[] = [];

    const processMenuItem = (
      item: any,
      parentPath: string = "",
      section: string,
    ) => {
      // Skip if item doesn't have a label
      if (!item.label) return;

      const currentPath = parentPath
        ? `${parentPath}/${item.label}`
        : item.label;

      // Only add items with IDs
      if (item.id && item.id.trim() !== "") {
        result.push({
          label: item.label,
          id: item.id,
          path: currentPath,
          section,
        });
      }

      // Process children recursively
      if (item.children && item.children.length > 0) {
        item.children.forEach((child: any) => {
          processMenuItem(child, currentPath, section);
        });
      }
    };

    // Process each section and its menu items
    typedSidebarMenu.forEach((section) => {
      const sectionName = section.name;

      // Skip Dashboard, Country & Currency, and Settings
      section.menuItems
        .filter(
          (item) =>
            item.label !== "Dashboard" &&
            item.label !== "Country & Currency" &&
            item.label !== "Settings",
        )
        .forEach((menuItem) => {
          // Skip the top-level menu item itself, only process its children
          if (menuItem.children && menuItem.children.length > 0) {
            menuItem.children.forEach((child) => {
              processMenuItem(child, "", menuItem.label);
            });
          } else if (menuItem.id && menuItem.id.trim() !== "") {
            // If the top-level item has an ID but no children, include it
            result.push({
              label: menuItem.label,
              id: menuItem.id,
              path: menuItem.label,
              section: menuItem.label,
            });
          }
        });
    });

    return result;
  }, []);

  // Group menu items by section
  const groupedMenuItems = useMemo(() => {
    const groups: Record<string, MenuWithPath[]> = {};

    menuItemsWithPaths.forEach((item) => {
      if (!groups[item.section]) {
        groups[item.section] = [];
      }
      groups[item.section].push(item);
    });

    return groups;
  }, [menuItemsWithPaths]);

  return (
    <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-lg border bg-white px-5 pt-6 pb-2.5 sm:px-7.5 xl:pb-2">
      <form onSubmit={handleSubmit}>
        <div className="my-2 grid md:grid-cols-3">
          <div className="my-2 md:grid md:grid-cols-2">
            <label className="my-auto font-medium text-black dark:text-white">
              Branch - Department - Role
            </label>
            <input
              type="text"
              disabled
              className="border-primary active:border-primary disabled:bg-whiter dark:bg-form-input w-full rounded-lg border-[1.5px] bg-transparent px-5 py-3 text-black outline-hidden transition disabled:cursor-default md:w-80 dark:text-white"
              value={key || ""}
              // onChange={(e) => setAccessPaths(e.target.value)}
            />
          </div>

          <div className="mx-auto my-auto grid grid-cols-3 gap-2 md:col-start-2">
            {/* each is based on access_control.json */}
            <div className="border-primary bg-whiter dark:bg-form-input flex aspect-square w-14 items-center justify-center rounded-lg border">
              {/* the 1st digit */}
              <span className="text-black dark:text-white">1</span>
            </div>
            <div className="border-primary bg-whiter dark:bg-form-input flex aspect-square w-14 items-center justify-center rounded-lg border">
              {/* the 2nd digit */}
              <span className="text-black dark:text-white">0</span>
            </div>
            <div className="border-primary bg-whiter dark:bg-form-input flex aspect-square w-14 items-center justify-center rounded-lg border">
              {/* the 3rd digit */}
              <span className="text-black dark:text-white">2</span>
            </div>
          </div>
        </div>

        {/* Display sections and their menu items */}
        <div className="grid gap-x-4 md:grid-cols-3">
          {Object.entries(groupedMenuItems).map(([section, items]) => (
            <div key={section} className="mb-8">
              <h3 className="mb-4 text-xl font-bold text-black dark:text-white">
                {section}
              </h3>
              {items.map((item) => (
                <div key={item.id}>
                  <SelectDropdown
                    // label={item.label}
                    path={item.path}
                    section={item.section}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mb-1 flex space-x-4">
          <input
            type="submit"
            value="UPDATE"
            className="bg-primary hover:bg-primarydark cursor-pointer rounded-lg border p-4 font-semibold text-white transition hover:text-white"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => router.push("/admin/scopes_access")}
            className="rounded-lg border border-gray-300 bg-gray-100 p-4 font-semibold text-gray-700 transition hover:bg-gray-200"
          >
            CANCEL
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormScopes2Access;

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

  // Store the selected action values for each menu item
  const [selectedActions, setSelectedActions] = useState<
    Record<string, string>
  >({});

  // Parse the access control codes from the current format
  const [accessControlCodes, setAccessControlCodes] = useState<string[]>([]);

  // Store the three-digit codes for each menu section
  // Format: [first digit].[second digit].[third digit]
  const [sectionCodes, setSectionCodes] = useState<Record<string, string[]>>(
    {},
  );

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
        setAccessControlCodes(foundPaths);

        // Initialize the selectedActions state with the parsed values
        // This will be used to set initial values for the dropdowns
        const initialSelectedActions: Record<string, string> = {};
        const initialSectionCodes: Record<string, string[]> = {};

        foundPaths.forEach((path) => {
          // Parse the three-digit code
          const [firstDigit, secondDigit, thirdDigit] =
            parseThreeDigitCode(path);

          // Extract the section from the path format
          // We need to map this to a menu item ID
          const section = path.split(".")[0]; // Assume first part is the section

          if (!initialSectionCodes[section]) {
            initialSectionCodes[section] = [];
          }

          initialSectionCodes[section].push(path);

          // For the menu item selection, we need to create a proper menuId
          // This is a simplified approach - you may need to adjust based on your data structure
          const menuId = `${section}.${firstDigit}`;

          // Set the third digit as the action value
          if (thirdDigit && thirdDigit !== "0") {
            // Only set non-zero values
            initialSelectedActions[menuId] = thirdDigit;
          }
        });

        setSelectedActions(initialSelectedActions);
        setSectionCodes(initialSectionCodes);

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

  // Helper function to parse access control codes
  const parsePath = (path: string): [string, string] => {
    // Parse code format like "1.0.2" where the last digit is the action
    const parts = path.split(".");
    if (parts.length === 3) {
      // We're dealing with a three-digit code
      const menuId = `${parts[0]}.${parts[1]}`;
      const action = parts[2];
      return [menuId, action];
    } else if (parts.length >= 2) {
      // Fallback for other formats
      const menuId = parts.slice(0, parts.length - 1).join(".");
      const action = parts[parts.length - 1];
      return [menuId, action];
    }
    return ["", ""];
  };

  // Parse three-digit codes into their components
  const parseThreeDigitCode = (code: string): [string, string, string] => {
    const parts = code.split(".");
    if (parts.length === 3) {
      return [parts[0], parts[1], parts[2]];
    }
    return ["1", "0", "0"]; // Default values if format is unexpected
  };

  // Handler for dropdown value changes
  const handleDropdownChange = (id: string, value: string) => {
    setSelectedActions((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!key) {
      setIsError(true);
      setMessage("No key provided");
      return;
    }

    setLoading(true);
    try {
      // Convert selectedActions object to the format expected by the API
      const updatedPaths: string[] = [];

      // Group menu items by parent section
      const menuGroups: Record<string, { id: string; action: string }[]> = {};

      // First, group all selectedActions by their parent menu (first digit)
      // Format of id is typically like "1.1" where first digit is the parent menu
      Object.entries(selectedActions).forEach(([id, action]) => {
        if (action && action !== "0") {
          // Skip items with no action or "clear access"
          const parentMenu = id.split(".")[0]; // Get the parent menu number

          if (!menuGroups[parentMenu]) {
            menuGroups[parentMenu] = [];
          }

          menuGroups[parentMenu].push({
            id: id.split(".")[1] || "0", // Get submenu number or default to "0"
            action,
          });
        }
      });

      // Now process each parent menu group
      Object.entries(menuGroups).forEach(([parentMenu, items]) => {
        // Group by submenu to check if they all have the same action
        const submenuGroups: Record<string, string[]> = {};
        items.forEach((item) => {
          if (!submenuGroups[item.id]) {
            submenuGroups[item.id] = [];
          }
          submenuGroups[item.id].push(item.action);
        });

        // Check if all submenus have the same action
        const allSameAction = Object.values(submenuGroups).every((actions) => {
          // All actions in this submenu must be identical
          return actions.every((a) => a === actions[0]);
        });

        // Check if there's only one unique action across all submenus
        const allActions = items.map((item) => item.action);
        const uniqueActions = [...new Set(allActions)];
        const onlyOneAction = uniqueActions.length === 1;

        if (onlyOneAction && allSameAction) {
          // If all submenus have the same action, use format: parentMenu.0.action
          updatedPaths.push(`${parentMenu}.0.${uniqueActions[0]}`);
        } else {
          // If different actions, add individual entries for each submenu
          Object.entries(submenuGroups).forEach(([submenu, actions]) => {
            // If this submenu has different actions, add each one
            if (actions.length > 1 && !actions.every((a) => a === actions[0])) {
              actions.forEach((action) => {
                updatedPaths.push(`${parentMenu}.${submenu}.${action}`);
              });
            } else {
              // If all actions in this submenu are the same, just add one entry
              updatedPaths.push(`${parentMenu}.${submenu}.${actions[0]}`);
            }
          });
        }
      });

      const response = await fetch("/api/admin/scopes_access/access_path", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key,
          accessPath: updatedPaths,
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
      // parentPath: string = "",
      section: string,
    ) => {
      // Skip if item doesn't have a label
      if (!item.label) return;

      const currentPath = item.label;

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
          processMenuItem(child, section);
        });
      }
    };

    // Process each section and its menu items
    typedSidebarMenu.forEach((section) => {
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
              processMenuItem(child, menuItem.label);
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
  }, [typedSidebarMenu]);

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

  // Function to get the initial value for a dropdown
  const getInitialValue = (menuId: string): string => {
    return selectedActions[menuId] || "";
  };

  return (
    <div className="border-stroke dark:border-strokedark dark:bg-boxdark rounded-lg border bg-white p-4 shadow-md">
      <form onSubmit={handleSubmit}>
        <div className="my-2 px-4 grid md:grid-cols-3">
          <div className="my-2 md:grid md:grid-cols-2">
            <label className="my-auto font-medium text-black dark:text-white">
              Branch - Department - Role
            </label>
            <input
              type="text"
              disabled
              className="border-primary active:border-primary disabled:bg-whiter dark:bg-form-input w-full rounded-lg border-[1.5px] bg-transparent px-5 py-3 text-black text-center outline-hidden transition disabled:cursor-default md:w-80 dark:text-white"
              value={key || ""}
            />
          </div>
        </div>

        {/* Display status message if there is one */}
        {message && (
          <div
            className={`my-4 rounded-lg p-4 ${isError ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
          >
            {message}
          </div>
        )}

        {/* Display sections and their menu items */}
        <div className="grid gap-4 md:grid-cols-3">
          {Object.entries(groupedMenuItems).map(([sectionLabel, items]) => {
            // Find the original menu item to get its ID
            const sectionItem = typedSidebarMenu
              .flatMap((s) => s.menuItems)
              .find((item) => item.label === sectionLabel);
            const sectionId = sectionItem?.id;

            return (
              <div key={sectionLabel} className="md:px-2">
                <h3 className="mb-4 mt-4 md:mt-6 text-xl font-bold text-black dark:text-white">
                  {/* {sectionLabel} */}
                  {/* Display the ID if available, otherwise just the label */}
                  {sectionId && `${sectionId}. `}
                  {sectionLabel}
                </h3>
                {items.map((item) => (
                  <div key={item.id}>
                    <SelectDropdown
                      subSectionId={item.id}
                      path={item.path}
                      section={item.section}
                      id={item.id}
                      onChange={handleDropdownChange}
                      initialValue={getInitialValue(item.id)}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex space-x-4">
          <input
            type="submit"
            value="Update"
            className="bg-primary hover:bg-primarydark border-stroke rounded-sm px-6 py-2 font-medium text-white transition hover:text-white"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => router.push("/admin/scopes_access")}
            className="border-stroke dark:border-strokedark dark:hover:bg-form-strokedark flex justify-center rounded-sm border px-6 py-2 font-medium text-black hover:bg-gray-200 dark:bg-gray-500 dark:text-white"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormScopes2Access;

// src/app/admin/scopes_access/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Tables from "@/components/Tables";

interface AccessRow {
  no: number;
  branchRef: string;
  branch: string;
  department: string;
  role: string;
  accessPath: string;
  key: string;
  originalKey: string;
  id: string; // Added id field for table operations
}

export default function AccessList() {
  const [data, setData] = useState<AccessRow[]>([]);
  const [accessMap, setAccessMap] = useState<Record<string, string[]>>({});
  const [menuItems, setMenuItems] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchAll = async () => {
    try {
      const accessRes = await fetch("/api/admin/scopes_access/access_path");
      const accessData = await accessRes.json();

      // Create a case-insensitive access map and a mapping of normalized keys to original keys
      const normalizedAccessMap: Record<string, string[]> = {};
      const normalizedToOriginalKeyMap: Record<string, string> = {};

      Object.entries(accessData).forEach(([originalKey, value]) => {
        const normalizedKey = originalKey.toLowerCase(); // Changed to lowercase for consistency
        normalizedAccessMap[normalizedKey] = value as string[];
        normalizedToOriginalKeyMap[normalizedKey] = originalKey;
      });

      // Fetch menu items for reference/display
      const menuRes = await fetch("/api/admin/menu_items");
      const menuData = await menuRes.json();

      // Fetch all branch+department+role combo
      const listRes = await fetch("/api/admin/scopes_access");
      const listData = await listRes.json();

      // Process menu items into a flat map
      const menuMap: Record<string, string> = {};
      const processMenuItems = (items: any[], parentPath = "") => {
        items.forEach((item) => {
          menuMap[item.id] =
            `${parentPath}${parentPath ? " > " : ""}${item.label}`;
          if (item.children?.length) {
            processMenuItems(item.children, menuMap[item.id]);
          }
        });
      };

      menuData.forEach((section: any) => {
        processMenuItems(section.menuItems);
      });
      setMenuItems(menuMap);

      // Format data for the table with case-insensitive key handling
      const formatted = listData.map((row: any, index: number) => {
        // Create a normalized key for lookup
        const normalizedKey =
          `${row.branchRef}.${row.department}.${row.role}`.toLowerCase(); // Changed to lowercase

        // Get access paths using the normalized key
        const paths = normalizedAccessMap[normalizedKey] || [];
        const displayKey = `${row.branchRef}.${row.department}.${row.role}`;

        // Store the original key from the access_control.json
        const originalKey =
          normalizedToOriginalKeyMap[normalizedKey] || displayKey;

        return {
          ...row,
          no: index + 1,
          key: normalizedKey,
          originalKey: originalKey,
          accessPath: paths.join(", "),
          id: originalKey, // Using originalKey as the id for edit purposes
        };
      });

      setAccessMap(normalizedAccessMap);
      setData(formatted);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasFetched.current) {
      fetchAll();
      hasFetched.current = true;
    }
  }, []);

  const columns = [
    { key: "no", title: "No" },
    { key: "branch", title: "Branch" },
    { key: "department", title: "Department" },
    { key: "role", title: "Role" },
    { key: "accessPath", title: "Access Path" },
  ];

  return (
    <DefaultLayout>
      <Breadcrumb pageName="Access List" />
      {loading && <div className="p-4">Loading Access List...</div>}
      {error && <div className="p-4 text-red-500">Error: {error}</div>}
      {!loading && !error && (
        <Tables
          columns={columns}
          data={data}
          filterKeys={["branch", "department", "role"]}
          createLink="/admin/scopes_access/update"
          idParam="key" // Changed to use "key" for ID parameter
          showCreateButton={false} // Set to false to hide the create button
        />
      )}
    </DefaultLayout>
  );
}

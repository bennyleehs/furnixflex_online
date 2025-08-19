// src/app/admin/scopes_access/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Tables from "@/components/Tables";

const MENU = "1";
const SUBMENU = "0";
const PERMISSION_PREFIX = `${MENU}.${SUBMENU}`;

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
  const [scopeAccess, setScopeAccess] = useState<AccessRow[]>([]);
  const [accessMap, setAccessMap] = useState<Record<string, string[]>>({});
  const [menuItems, setMenuItems] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);
  const [currentPage, setCurrentPage] = useState(1);

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
      setScopeAccess(formatted);
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const columns = [
    { key: "no", title: "No" },
    { key: "branch", title: "Branch" },
    { key: "department", title: "Department" },
    { key: "role", title: "Role" },
  ];

  const modalColumns = [
    {
      group: "Access Control",
      key: "compositeKey",
      title: "Composite Key",
      format: (_: any, row: any) => row.originalKey.replace(/\./g, " - "),
    },
    {
      group: "Permissions",
      key: "accessPaths",
      title: "Access Paths",
      format: (_value: any, row: any) => {
        const paths = row.accessPaths || [];
        return (
          <div className="flex flex-wrap gap-1">
            {paths.map((path: string, index: number) => (
              <span key={path}>
                {menuItems[path] || path}
                {index < paths.length - 1 && ", "}
              </span>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <DefaultLayout>
      <Breadcrumb pageName="Access List" />
      {loading && <div className="p-4">Loading Access List...</div>}
      {error && <div className="p-4 text-red-500">Error: {error}</div>}
      {!loading && !error && (
        <Tables
          columns={columns}
          modalTitle="Scopes Access"
          modalColumns={modalColumns}
          data={scopeAccess}
          externalData={accessMap}
          createLink="/admin/scopes_access/update"
          filterKeys={["branch", "department", "role"]}
          idParam="key" // Changed to use "key" for ID parameter
          showCreateButton={false} // Set to false to hide the create button
          createPermissionPrefix={PERMISSION_PREFIX}
          editPermissionPrefix={PERMISSION_PREFIX}
          deletePermissionPrefix={PERMISSION_PREFIX}
          monitorPermissionPrefix={PERMISSION_PREFIX}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          totalItems={scopeAccess.length}
          itemsPerPage={10}
          infoEndpoint="/api/admin/scope_access/access_path"
        />
      )}
    </DefaultLayout>
  );
}

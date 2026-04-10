// src/app/admin/scopes_access/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Tables from "@/components/Tables";

const PERMISSION_PREFIX = "2.5";

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
      format: (_: any, row: any) => {
        const parts = row.originalKey.split(".");
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {parts.map((part: string, i: number) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-semibold">
                  {part}
                </span>
                {i < parts.length - 1 && (
                  <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
                  </svg>
                )}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      group: "Permissions",
      key: "accessPaths",
      title: "Access Paths",
      format: (_value: any, row: any) => {
        const paths = row.accessPaths || [];
        if (paths.length === 0) {
          return <span className="text-gray-400 italic">No permissions assigned</span>;
        }
        return (
          <div className="flex flex-wrap gap-1.5">
            {paths.map((path: string) => (
              <span
                key={path}
                className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                title={path}
              >
                {menuItems[path] || path}
              </span>
            ))}
          </div>
        );
      },
    },
  ];

  // Summary counts
  const uniqueBranches = new Set(scopeAccess.map((r) => r.branch)).size;
  const uniqueDepartments = new Set(scopeAccess.map((r) => r.department)).size;
  const uniqueRoles = new Set(scopeAccess.map((r) => r.role)).size;

  return (
    <DefaultLayout>
      {/* Compact Header: breadcrumb + stats in one row */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Breadcrumb pageName="Access List" noHeader />
        {!loading && !error && (
          <div className="flex items-center gap-2">
            {[
              { label: "Scopes", value: scopeAccess.length, highlight: false },
              { label: "Branches", value: uniqueBranches, highlight: true },
              { label: "Depts", value: uniqueDepartments, highlight: true },
              { label: "Roles", value: uniqueRoles, highlight: true },
            ].map((stat) => (
              <span
                key={stat.label}
                className="border-stroke dark:border-strokedark dark:bg-boxdark inline-flex items-center gap-1 rounded border bg-white px-2 py-1 text-xs"
              >
                <span className="text-gray-400">{stat.label}</span>
                <span className={`font-bold ${stat.highlight ? "text-primary" : "text-black dark:text-white"}`}>
                  {stat.value}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-10">
          <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 dark:border-red-800 dark:bg-red-900/20">
          <svg className="h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
          <button
            onClick={() => { hasFetched.current = false; setLoading(true); setError(null); fetchAll(); }}
            className="bg-primary ml-auto shrink-0 cursor-pointer rounded px-2.5 py-1 text-xs font-medium text-white hover:opacity-80"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <Tables
          columns={columns}
          modalTitle="Scopes Access"
          modalColumns={modalColumns}
          data={scopeAccess}
          externalData={accessMap}
          createLink="/admin/scopes_access/update"
          filterKeys={["branch", "department", "role"]}
          idParam="key"
          showCreateButton={false}
          createPermissionPrefix={PERMISSION_PREFIX}
          editPermissionPrefix={PERMISSION_PREFIX}
          deletePermissionPrefix={PERMISSION_PREFIX}
          monitorPermissionPrefix={PERMISSION_PREFIX}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          totalItems={scopeAccess.length}
          itemsPerPage={15}
          infoEndpoint="/api/admin/scope_access/access_path"
        />
      )}
    </DefaultLayout>
  );
}

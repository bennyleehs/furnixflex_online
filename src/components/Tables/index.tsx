//src/components/Tables/index.tsx
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import "./styles.css";
import usePermissions from "@/hooks/usePermissions";

interface TableProps {
  columns: { key: string; title: string }[];
  data: Record<string, any>[]; // Rows of data
  createLink?: string;
  filterKeys: string[];
  idParam?: string; // For specifying id parameter name (default: "id")
  showCreateButton?: boolean; //prop to control button visibility
  createPermissionPrefix?: string; // To control the create button
  editPermissionPrefix?: string; // To control the edit button
  deletePermissionPrefix?: string; // To control the delete button
  monitorPermissionPrefix?: string; // To control overall visibility (hiding all buttons)
}

export default function Tables({
  columns,
  data,
  createLink,
  filterKeys = [],
  idParam = "id",
  showCreateButton = true, // Default to true for backward compatibility
  createPermissionPrefix,
  editPermissionPrefix,
  deletePermissionPrefix,
  monitorPermissionPrefix,
}: TableProps) {
  const [tableData, setTableData] = useState(data);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string>
  >({});
  const [filterOptions, setFilterOptions] = useState<
    Record<string, { label: string; count: number }[]>
  >({});
  const router = useRouter();

  const { canFullAccess, canEdit, canCreate, canMonitor, loadingPermissions } =
    usePermissions();

  const getMenuSubmenu = (
    permissionPrefix?: string,
  ): { menu: string; submenu: string } | null => {
    if (!permissionPrefix) {
      return null;
    }
    const parts = permissionPrefix.split(".");
    if (parts.length >= 2) {
      return { menu: parts[0], submenu: parts[1] };
    }
    return null;
  };

  const createMenuSubmenu = getMenuSubmenu(createPermissionPrefix);
  const editMenuSubmenu = getMenuSubmenu(editPermissionPrefix);
  const deleteMenuSubmenu = getMenuSubmenu(deletePermissionPrefix);
  const monitorMenuSubmenu = getMenuSubmenu(monitorPermissionPrefix);

  useEffect(() => {
    // Initialize selected filters with "All" for each filterKey (only on first load)
    if (Object.keys(selectedFilters).length === 0) {
      const initialFilters: Record<string, string> = {};
      filterKeys.forEach((key) => {
        initialFilters[key] = "All";
      });
      setSelectedFilters(initialFilters);
    }

    // Calculate column widths...
    const widths = columns.map((col) => {
      let maxLength = col.title.length; // Start with the column title length
      data.forEach((row) => {
        const cellValue = row[col.key]?.toString() || "";
        const segments = cellValue.split(/[/,]/); // Split by '/' or ','
        segments.forEach((segment: string) => {
          maxLength = Math.max(maxLength, segment.trim().length); // Find the longest segment
        });
      });
      return maxLength * 8; // Approximate width in pixels (8px per character)
    });
    setColumnWidths(widths);
  }, [data, columns, filterKeys]);

  useEffect(() => {
    // Apply filters to get filtered data
    let filteredData = [...data];

    Object.entries(selectedFilters).forEach(([key, value]) => {
      if (value !== "All") {
        filteredData = filteredData.filter((row) => row[key] === value);
      }
    });

    // Update the tableData with filtered results
    setTableData(filteredData);

    // Now recalculate filter options based on current filters
    const options: Record<string, { label: string; count: number }[]> = {};

    filterKeys.forEach((currentKey) => {
      // For each filter key, apply all OTHER filters first
      let dataForThisFilter = [...data];

      Object.entries(selectedFilters).forEach(([key, value]) => {
        // Skip the current filter key we're calculating counts for
        if (key !== currentKey && value !== "All") {
          dataForThisFilter = dataForThisFilter.filter(
            (row) => row[key] === value,
          );
        }
      });

      // Now count options for the current filter based on the pre-filtered data
      const counts: Record<string, number> = {};
      dataForThisFilter.forEach((row) => {
        const value = row[currentKey] || "Unknown";
        counts[value] = (counts[value] || 0) + 1;
      });

      options[currentKey] = [
        { label: "All", count: dataForThisFilter.length },
        ...Object.entries(counts)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => a.label.localeCompare(b.label)), // Sort filter options alphabetically
      ];
    });

    setFilterOptions(options);
  }, [selectedFilters, data, filterKeys]);

  const handleEdit = (row: Record<string, any>) => {
    // Determine the appropriate ID to use for the URL
    const idToUse = row.originalKey || row[idParam] || row.id;

    if (idToUse) {
      // using the key as the id parameter => encode it
      const encodedId = encodeURIComponent(idToUse);
      router.push(`${createLink}?${idParam}=${encodedId}`);
    } else {
      console.error("No ID available for editing this row:", row);
    }
  };

  return (
    <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-lg border bg-white px-5 pt-6 pb-2.5 sm:px-7.5 xl:pb-2">
      {/* Table Header with Create Button */}
      <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        {/* Filter Dropdowns */}
        <div className="flex w-full flex-wrap gap-4">
          {filterKeys.map((key) => (
            <div
              key={key}
              className="flex w-full flex-col items-start space-y-2 sm:w-auto sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2"
            >
              <label
                htmlFor={`filter-dropdown-${key}`}
                className="text-sm font-medium text-gray-700"
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}:
              </label>
              <select
                id={`filter-dropdown-${key}`}
                value={selectedFilters[key] || "All"}
                onChange={(e) =>
                  setSelectedFilters((prev) => ({
                    ...prev,
                    [key]: e.target.value,
                  }))
                }
                className="focus:border-primary w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 shadow-xs"
              >
                {(filterOptions[key] || []).map((option, index) => (
                  <option key={`${key}-${option.label}`} value={option.label}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Create Button */}
        {showCreateButton &&
          createLink &&
          createMenuSubmenu &&
          !loadingPermissions &&
          canCreate(createMenuSubmenu.menu, createMenuSubmenu.submenu) && (
            <div className="w-full sm:w-auto">
              <Link
                href={createLink}
                className="flex h-full w-full items-center justify-center rounded-md border border-black bg-white px-4 py-2 text-black hover:bg-gray-100 sm:w-auto"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </Link>
            </div>
          )}
      </div>

      {/* Table */}
      <div className="max-w-full overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-2 dark:bg-meta-4 text-left">
              {columns.map((col, index) => (
                <th
                  key={col.key}
                  style={{ minWidth: `${columnWidths[index]}px` }}
                  className="px-2 py-4 font-medium text-black xl:pl-6 dark:text-white"
                >
                  {col.title}
                </th>
              ))}
              <th className="min-w-[140px] px-2 py-4 font-medium text-black xl:pl-6 dark:text-white">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.length > 0 ? (
              tableData.map((row, rowIndex) => (
                <tr
                  key={`row-${rowIndex}-${row.id || row.originalKey || row.key || rowIndex}`}
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={`cell-${rowIndex}-${col.key}-${colIndex}`}
                      style={{ minWidth: `${columnWidths[colIndex]}px` }}
                      className="dark:border-strokedark break-on-slash border-b border-[#eee] px-2 py-5 xl:pl-6"
                    >
                      {row[col.key]}
                    </td>
                  ))}
                  {/* Action buttons */}
                  <td className="dark:border-strokedark border-b border-[#eee] px-2 py-5 xl:pl-6">
                    <div className="flex items-center space-x-6">
                      {!loadingPermissions &&
                        (monitorMenuSubmenu === null || // Render buttons if no monitor permission is specified
                          !canMonitor(
                            monitorMenuSubmenu.menu,
                            monitorMenuSubmenu.submenu,
                          )) && (
                          <>
                            {editMenuSubmenu &&
                              canEdit(
                                editMenuSubmenu.menu,
                                editMenuSubmenu.submenu,
                              ) && (
                                <button
                                  className="hover:text-primary"
                                  onClick={() => handleEdit(row)}
                                  title="Edit"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="fill-current"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 576 512"
                                  >
                                    <path
                                      d="M402.3 344.9l32-32c5-5 13.7-1.5 13.7 5.7V464c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V112c0-26.5 21.5-48 48-48h273.5c7.1 0 10.7 8.6 5.7 13.7l-32 32c-1.5 1.5-3.5 2.3-5.7 2.3H48v352h352V350.5c0-2.1 .8-4.1 2.3-5.6zm156.6-201.8L296.3 405.7l-90.4 10c-26.2 2.9-48.5-19.2-45.6-45.6l10-90.4L432.9 17.1c22.9-22.9 59.9-22.9 82.7 0l43.2 43.2c22.9-22.9 22.9 60 .1 82.8zM460.1 174L402 115.9 216.2 301.8l-7.3 65.3 65.3-7.3L460.1 174zm64.8-79.7l-43.2-43.2c-4.1-4.1-10.8-4.1-14.8 0L436 82l58.1 58.1 30.9-30.9c4-4.2 4-10.8-.1-14.9z"
                                      fill=""
                                    />
                                  </svg>
                                </button>
                              )}
                            {deleteMenuSubmenu &&
                              canFullAccess(
                                deleteMenuSubmenu.menu,
                                deleteMenuSubmenu.submenu,
                              ) && (
                                <button
                                  className="hover:text-primary"
                                  title="Mark as History"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    <line
                                      x1="10"
                                      y1="11"
                                      x2="10"
                                      y2="17"
                                    ></line>
                                    <line
                                      x1="14"
                                      y1="11"
                                      x2="14"
                                      y2="17"
                                    ></line>
                                  </svg>
                                </button>
                              )}
                          </>
                        )}
                      <button className="hover:text-primary" title="Info">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="2"
                        >
                          <path d="M10 11h2v5m-2 0h4m-2.592-8.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="dark:border-strokedark border-b border-[#eee] px-2 py-5 text-center xl:pl-6"
                >
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

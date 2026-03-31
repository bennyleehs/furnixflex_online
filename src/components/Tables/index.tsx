// src/components/Tables/index.tsx
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
  showCreateButton?: boolean; //prop to control button visibility (from parent)
  createPermissionPrefix?: string; // To control the create button
  editPermissionPrefix?: string; // To control the edit button
  deletePermissionPrefix?: string; // To control the delete button
  monitorPermissionPrefix?: string; // To control overall visibility (hiding all buttons)
  currentPage?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  infoEndpoint?: string; // info prop
  modalTitle?: string;
  modalColumns?: {
    key: string;
    title?: string;
    group?: string;
    format?: (value: any, row?: any) => React.ReactNode;
  }[];
  externalData?: Record<string, any>; //prop for scope_access page
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
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange = () => {},
  infoEndpoint,
  modalTitle,
  modalColumns,
  externalData,
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

  // FIX 1: Added 'canDelete' to the destructuring here
  const {
    canFullAccess,
    canEdit,
    canCreate,
    canDelete,
    canMonitor,
    loadingPermissions,
  } = usePermissions();

  //state for modal
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoData, setInfoData] = useState<Record<string, any> | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);

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
  }, [data, columns, filterKeys, selectedFilters]);

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

  // Function to handle info button click
  const handleInfoClick = async (row: Record<string, any>) => {
    if (!infoEndpoint) return;

    // Case 2: Standard API fetch (for branch)
    const idToUse = row.originalKey || row[idParam] || row.id;
    if (!idToUse) {
      console.error("No ID available for info:", row);
      return;
    }

    try {
      setIsLoadingInfo(true);
      setInfoError(null);

      // Case 1: Use externalData if provided (for scope_access)
      if (externalData) {
        setInfoData({
          ...row, // Include all row data
          accessPaths: externalData[row.key] || [], // Get from externalData
        });
        setIsInfoModalOpen(true);
        return;
      }

      const response = await fetch(
        `${infoEndpoint}?id=${encodeURIComponent(idToUse)}`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch info");
      }

      setInfoData(data);
      setIsInfoModalOpen(true);
    } catch (err) {
      console.error("Info fetch error:", err);
      setInfoError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingInfo(false);
    }
  };

  // pagination
  const renderPagination = () => {
    if (!totalItems || !onPageChange) return null;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    const pages: (number | string)[] = [];
    const maxPagesToShow = 5;

    const addPage = (page: number | string) => pages.push(page);

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) addPage(i);
    } else {
      addPage(1);
      const left = Math.max(currentPage - 1, 2);
      const right = Math.min(currentPage + 1, totalPages - 1);

      if (left > 2) addPage("...");

      for (let i = left; i <= right; i++) addPage(i);

      if (right < totalPages - 1) addPage("...");
      addPage(totalPages);
    }

    return (
      <div className="flex flex-col items-center justify-between gap-4 py-4 sm:flex-row sm:items-center">
        <div className="flex w-full flex-col space-y-2 sm:w-auto sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2 sm:text-center md:items-start">
          <p className="text-center text-sm font-bold text-gray-500 dark:text-gray-400">
            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}{" "}
            to {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
            <span className="text-primary">{totalItems} entries</span>
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-1">
          {/* <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="bg-primary rounded-sm px-3 py-1 text-white hover:opacity-80 disabled:opacity-50"
        >
          First
        </button> */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="bg-primary flex cursor-pointer items-center rounded-sm py-1 pr-2 text-white hover:opacity-80 disabled:opacity-50"
          >
            <svg
              className="h-5 w-5 text-white"
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m15 19-7-7 7-7"
              />
            </svg>
            Prev
          </button>

          {pages.map((page, index) => (
            <button
              key={`${page}-${index}`}
              onClick={() => typeof page === "number" && onPageChange(page)}
              disabled={page === "..."}
              className={`cursor-pointer rounded px-3 py-1 ${
                currentPage === page
                  ? "bg-primary text-white"
                  : typeof page === "string"
                    ? "cursor-default bg-transparent text-gray-500"
                    : "hover:bg-primary dark:bg-meta-4 dark:hover:bg-primary bg-gray-200 hover:text-white dark:hover:text-white"
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="bg-primary flex cursor-pointer items-center rounded-sm py-1 pl-2 text-white hover:opacity-80 disabled:opacity-50"
          >
            Next
            <svg
              className="h-5 w-5 text-white"
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m9 5 7 7-7 7"
              />
            </svg>
          </button>
          {/* <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="bg-primary rounded-sm px-3 py-1 text-white hover:opacity-80 disabled:opacity-50"
        >
          Last
        </button> */}
        </div>
      </div>
    );
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
                className="text-sm font-medium text-gray-700 dark:text-white"
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
                className="focus:border-primary dark:focus:border-primary border-stroke dark:border-strokedark dark:bg-meta-4 w-full rounded-md border bg-white px-4 py-2 text-gray-700 shadow-xs outline-hidden transition dark:text-white"
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

        {/* Create Button - Controlled by showCreateButton prop and canCreate */}
        {showCreateButton &&
          createLink &&
          createMenuSubmenu &&
          !loadingPermissions &&
          canCreate(createMenuSubmenu.menu, createMenuSubmenu.submenu) && (
            <div className="w-full sm:w-30">
              <Link
                href={createLink}
                className="bg-primary hover:bg-primarydark dark:border-strokedark flex h-full w-full items-center justify-center rounded-md border px-4 py-2 text-white sm:w-auto"
              >
                CREATE
              </Link>
            </div>
          )}
      </div>

      {/* Table */}
      {/* Table Container */}
      <div className="relative max-w-full overflow-x-auto">
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
              <th className="bg-gray-2 dark:bg-meta-4 sticky right-0 z-10 min-w-30 px-4 py-4 text-center font-medium text-black xl:pl-6 dark:text-white">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.length > 0 ? (
              tableData
                .slice(
                  (currentPage - 1) * itemsPerPage,
                  currentPage * itemsPerPage,
                ) //for pagination
                .map((row, rowIndex) => (
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
                    {/* Action buttons - sticky column */}
                    <td className="dark:border-strokedark dark:bg-boxdark sticky right-0 z-10 border-b border-[#eee] bg-white px-4 py-5 xl:pl-6">
                      <div className="flex items-center justify-center space-x-2">
                        {!loadingPermissions && ( // Only render buttons if permissions are loaded
                          <>
                            {/* Edit Button */}
                            {editMenuSubmenu &&
                              canEdit(
                                editMenuSubmenu.menu,
                                editMenuSubmenu.submenu,
                              ) && (
                                <button
                                  className="hover:text-primary cursor-pointer"
                                  onClick={() => handleEdit(row)}
                                  title="Edit Details"
                                >
                                  <svg
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
                            {/* Delete Button */}
                            {deleteMenuSubmenu &&
                              canDelete(
                                // FIX 2: Changed from canFullAccess to canDelete here
                                deleteMenuSubmenu.menu,
                                deleteMenuSubmenu.submenu,
                              ) && (
                                <button
                                  className="hover:text-red cursor-pointer"
                                  title="Mark as History"
                                >
                                  <svg
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
                        {/* Info Button (always visible, or controlled by its own permission if desired) */}
                        <button
                          className="hover:text-primary cursor-pointer"
                          title="Details"
                          onClick={() => handleInfoClick(row)}
                          disabled={isLoadingInfo}
                        >
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

      {/* Modal for Info */}
      {isInfoModalOpen && infoData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 dark:bg-white/30">
          <div className="dark:bg-boxdark relative mt-20 w-full max-w-4xl rounded-lg bg-white shadow-lg">
            {/* Modal Header */}
            <div className="dark:border-strokedark dark:bg-boxdark sticky top-0 flex items-center justify-between rounded-t-lg border-b bg-white p-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                {modalTitle} Details
              </h3>
              <button
                onClick={() => setIsInfoModalOpen(false)}
                className="text-primary cursor-pointer text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[65vh] overflow-y-auto p-4">
              {modalColumns &&
                Object.entries(
                  modalColumns.reduce<Record<string, typeof modalColumns>>(
                    (acc, column) => {
                      const group = column.group || "Other";
                      if (!acc[group]) acc[group] = [];
                      acc[group].push(column);
                      return acc;
                    },
                    {},
                  ),
                ).map(([group, fields]) => (
                  <div key={group} className="mb-6">
                    <h4 className="text-md mb-3 font-medium text-gray-700 dark:text-gray-300">
                      {group}
                    </h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {fields.map((col) => (
                        <div key={col.key}>
                          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {col.title}
                          </label>
                          <div className="border-stroke dark:border-strokedark dark:bg-meta-4 rounded-md border bg-gray-50 px-3 py-2 text-sm">
                            {col.format
                              ? col.format(infoData[col.key], infoData)
                              : infoData[col.key] || "-"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>

            {/* Modal Footer */}
            <div className="dark:border-strokedark dark:bg-boxdark sticky bottom-0 rounded-b-lg border-t bg-white p-4">
              <button
                onClick={() => setIsInfoModalOpen(false)}
                className="bg-primary hover:bg-primarydark dark:border-strokedark w-full cursor-pointer rounded-md px-4 py-2 font-medium text-white"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Pagination */}
      {renderPagination()}
    </div>
  );
}

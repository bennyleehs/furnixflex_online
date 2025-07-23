import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import "./styles.css"; // Import the CSS file
import usePermissions from "@/hooks/usePermissions";

interface TableProps {
  columns: {
    width: string;
    key: string;
    title: string;
  }[]; // Defines column keys & titles
  data: Record<string, any>[]; // Rows of data
  createLink?: string;
  filterKeys: string[]; // Keys to filter the data (e.g., ["country", "status"])
  currentPage?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  statusCounts?: Record<string, number>; // Optional status counts for filters
  onFilterChange?: (key: string, value: string) => void; // Callback for filter changes
  onSearchChange?: (query: string) => void; // Add new prop for search changes
  selectedStatus?: string; // Add this new prop
  showCreateButton?: boolean; //prop to control button visibility (from parent)
  createPermissionPrefix?: string; // To control the create button
  editPermissionPrefix?: string; // To control the edit button
  deletePermissionPrefix?: string; // To control the delete button
  monitorPermissionPrefix?: string; // To control overall visibility (hiding all buttons)
  infoEndpoint?: string; // info prop
  modalColumns?: {
    key: string;
    title: string;
    group?: string;
    format?: (value: any, row?: any) => React.ReactNode;
  }[];
}

export default function Tables({
  columns,
  data,
  createLink,
  filterKeys = [],
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange = () => {},
  statusCounts,
  onFilterChange,
  onSearchChange, // Add onSearchChange to props
  selectedStatus = "All", // Default to "Active" if not provided
  showCreateButton = true, // Default to true for backward compatibility
  createPermissionPrefix,
  editPermissionPrefix,
  deletePermissionPrefix,
  monitorPermissionPrefix,
  infoEndpoint,
  modalColumns,
}: TableProps) {
  const [tableData, setTableData] = useState(data);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string>
  >({});
  const [filterOptions, setFilterOptions] = useState<
    Record<string, { label: string; count: number }[]>
  >({});
  const [searchQuery, setSearchQuery] = useState(""); // Add new state for search query
  const router = useRouter();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for search timeout
  const [filterCounts, setFilterCounts] = useState<
    Record<string, Record<string, number>>
  >({});

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
    // Initialize with the selected status from props
    if (Object.keys(selectedFilters).length === 0) {
      const initialFilters: Record<string, string> = {};
      filterKeys.forEach((key) => {
        initialFilters[key] = key === "status" ? selectedStatus : "All";
      });
      setSelectedFilters(initialFilters);
    }

    // Calculate column widths...
    const widths = columns.map((col) => {
      let maxLength = col.title.length; // Start with the column title length
      data.forEach((row) => {
        const cellValue = row[col.key]?.toString() || "";
        const segments = cellValue.split(/[/,]/); // Split by '/' or ','
        segments.forEach(
          (segment: {
            trim: () => { (): any; new (): any; length: number };
          }) => {
            maxLength = Math.max(maxLength, segment.trim().length); // Find the longest segment
          },
        );
      });
      return maxLength * 8; // Approximate width in pixels (8px per character)
    });
    setColumnWidths(widths);
  }, [data, columns, filterKeys, selectedStatus, selectedFilters]);

  useEffect(() => {
    // Always start with the original data
    let filteredData = [...data];

    // First apply all dropdown filters (including status)
    Object.entries(selectedFilters).forEach(([key, value]) => {
      if (value !== "All") {
        filteredData = filteredData.filter((row) => row[key] === value);
      }
    });

    // Then apply search filter on the status-filtered data
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      filteredData = filteredData.filter((row) => {
        // Search through all column values
        return columns.some((column) => {
          const cellValue = row[column.key];
          return (
            cellValue && cellValue.toString().toLowerCase().includes(query)
          );
        });
      });
    }

    // Update the tableData with filtered results
    setTableData(filteredData);

    // Rest of your filter options calculation...
  }, [selectedFilters, searchQuery, data, columns, filterKeys]);

  useEffect(() => {
    // Set table data
    setTableData(data);

    // Calculate counts for all filter keys that don't have pre-calculated counts
    const newFilterCounts: Record<string, Record<string, number>> = {};

    filterKeys.forEach((key) => {
      // Skip status if we already have statusCounts
      if (key === "status" && statusCounts) return;

      // Calculate counts for this filter key
      const counts: Record<string, number> = {};
      data.forEach((row) => {
        const value = String(row[key] || "");
        counts[value] = (counts[value] || 0) + 1;
      });

      newFilterCounts[key] = counts;
    });

    setFilterCounts(newFilterCounts);

    // Existing code...
  }, [data, columns, filterKeys, statusCounts]);

  const handleEdit = (row: Record<string, any>) => {
    router.push(`${createLink || "/"}?id=${row.id}`);
  };

  // Function to handle info button click
  const handleInfoClick = async (row: Record<string, any>) => {
    if (!infoEndpoint) return;

    const idToUse = row.id || row.originalKey;
    // const idToUse = row.id;
    if (!idToUse) {
      console.error("No ID available for info:", row);
      return;
    }

    try {
      setIsLoadingInfo(true);
      setInfoError(null);

      const response = await fetch(
        `${infoEndpoint}?id=${encodeURIComponent(idToUse)}`,
      );
      const dataRes = await response.json();
      console.log("Info API Response:", dataRes); //here

      if (!response.ok) {
        throw new Error(dataRes.error || "Failed to fetch info");
      }

      // Extract the lead data from the response
    const leadData = dataRes.listLead?.[0] || dataRes;
    console.log("Lead Data to Display:", leadData); // Debug log

    if (!leadData) {
      throw new Error("No lead data found in response");
    }

      setInfoData(leadData);
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
            className="bg-primary flex items-center rounded-sm py-1 pr-2 text-white hover:opacity-80 disabled:opacity-50"
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
              className={`rounded px-3 py-1 ${
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
            className="bg-primary flex items-center rounded-sm py-1 pl-2 text-white hover:opacity-80 disabled:opacity-50"
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

  const handleFilterChange = (key: string, value: string) => {
    // Update local state
    setSelectedFilters((prev) => ({
      ...prev,
      [key]: value,
    }));

    // Call parent component's filter handler if provided
    if (onFilterChange) {
      onFilterChange(key, value);
    }

    // Reset to page 1 when filter changes
    if (onPageChange) {
      onPageChange(1);
    }
  };

  const renderFilter = (key: string) => {
    // Determine which counts object to use
    const counts =
      key === "status" && statusCounts ? statusCounts : filterCounts[key] || {};

    // Get unique values for this key (if no counts available)
    let options: Array<{ value: string; label: string; count: number }> = [];

    if (Object.keys(counts).length > 0) {
      // Create options from counts
      options = Object.entries(counts).map(([value, count]) => ({
        value: value === "null" ? "" : value,
        label: value === "null" ? "(Empty)" : value,
        count,
      }));
    } else {
      // Fallback to unique values without counts
      const uniqueValues = [
        ...new Set(data.map((row) => String(row[key] || ""))),
      ];
      options = uniqueValues.map((value) => ({
        value,
        label: value || "(Empty)",
        count: 0,
      }));
    }

    // Add "All" option
    options.unshift({ value: "All", label: "All", count: totalItems });

    return (
      <div className="flex w-full flex-col items-start space-y-2 sm:w-auto sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
        <select
          id={`filter-${key}`}
          value={selectedFilters[key] || "All"}
          onChange={(e) => handleFilterChange(key, e.target.value)}
          className="focus:border-primary dark:focus:border-primary border-stroke dark:border-strokedark dark:bg-meta-4 w-full rounded-md border bg-white px-4 py-2 text-gray-700 shadow-xs outline-hidden transition dark:text-white"
        >
          {options.map((option, index) => (
            <option
              key={`${key}-${option.value}-${index}`}
              value={option.value}
            >
              {option.label} ({option.count})
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-lg border bg-white px-5 pt-6 pb-2.5 sm:px-7.5 xl:pb-2">
      {/* Table Header with inline filters & search */}
      <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        {/* Filter area - make everything inline */}
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
              {renderFilter(key)}
            </div>
          ))}

          {/* Search and Results Count Container */}
          {/* Search Input */}
          <div className="relative flex w-full flex-col items-start space-y-2 sm:w-auto sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
            <div className="relative w-full md:w-[200px]">
              <input
                type="text"
                placeholder={`Search in ${selectedFilters["status"] || "All"}...`}
                className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-4 py-2 text-sm transition outline-none"
                value={searchQuery}
                onChange={(e) => {
                  const newQuery = e.target.value;
                  setSearchQuery(newQuery);

                  if (onSearchChange) {
                    if (searchTimeoutRef.current) {
                      clearTimeout(searchTimeoutRef.current);
                    }
                    searchTimeoutRef.current = setTimeout(() => {
                      onSearchChange(newQuery);
                      if (onPageChange) {
                        onPageChange(1);
                      }
                    }, 300);
                  }
                }}
              />
              {/* <svg
                className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg> */}
              {searchQuery && (
                <button
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                  onClick={() => {
                    setSearchQuery("");
                    if (onSearchChange) {
                      onSearchChange("");
                    }
                    if (onPageChange) {
                      onPageChange(1);
                    }
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Results count text */}
          {/* <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {searchQuery ? 
                `Showing ${tableData.length} of ${totalItems} total results for "${searchQuery}"` : 
                selectedFilters['status'] && selectedFilters['status'] !== 'All' ?
                  `Showing ${Math.min(tableData.length, totalItems)} of ${totalItems} ${selectedFilters['status']} records` :
                  `Showing ${Math.min(itemsPerPage, totalItems)} of ${totalItems} records`}
            </span> */}
          {/* </div> */}
        </div>

        {/* Create Button */}
        {showCreateButton &&
          createLink &&
          createMenuSubmenu &&
          !loadingPermissions &&
          canCreate(createMenuSubmenu.menu, createMenuSubmenu.submenu) && (
            <div className="w-full sm:w-30">
              <Link
                href={createLink || "/"}
                className="bg-primary hover:bg-primarydark dark:border-strokedark flex h-full w-full items-center justify-center rounded-md border px-4 py-2 text-white sm:w-auto"
              >
                CREATE
              </Link>
            </div>
          )}
      </div>

      {/* Table */}
      <div className="relative max-w-full overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-2 dark:bg-meta-4 text-left">
              {columns.map((col) => (
                <th
                  key={col.key}
                  // style={{ minWidth: `${columnWidths[index]}px` }} // Apply calculated width
                  // className="px-2 py-4 font-medium text-black min-w-[180px] xl:pl-6 dark:text-white"
                  // className={`px-2 py-4 font-medium text-black min-w-[180px] xl:pl-6 dark:text-white ${col.width || 'min-w-[180px]'}`}
                  className={`px-2 py-4 font-medium text-black xl:pl-6 dark:text-white ${col.width}`}
                >
                  {col.title}
                </th>
              ))}
              <th className="bg-gray-2 dark:bg-meta-4 sticky right-0 z-10 min-w-[140px] px-4 py-4 text-center font-medium text-black dark:text-white">
                Overview
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((col, index) => (
                  <td
                    key={col.key}
                    // style={{ minWidth: `${columnWidths[index]}px` }} // Apply calculated width
                    // className="dark:border-strokedark border-b border-[#eee] px-2 py-5 xl:pl-6"
                    // className={`dark:border-strokedark border-b border-[#eee] px-2 py-5 xl:pl-6 ${
                    //   col.width || "min-w-[180px]"
                    // }`}
                    className={`dark:border-strokedark border-b border-[#eee] px-2 py-5 xl:pl-6 ${
                      col.width
                    }`}
                  >
                    {row[col.key]}
                  </td>
                ))}
                {/* action */}
                <td className="dark:border-strokedark dark:bg-boxdark sticky right-0 z-10 border-b border-[#eee] bg-white px-4 py-4 text-center">
                  <div className="flex items-center space-x-6">
                    {!loadingPermissions && ( // Only render buttons if permissions are loaded
                      <>
                        {/* Edit Button */}
                        {editMenuSubmenu &&
                          canEdit(
                            editMenuSubmenu.menu,
                            editMenuSubmenu.submenu,
                          ) && (
                            <button
                              className="hover:text-primary"
                              onClick={() => handleEdit(row)}
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
                          canDelete(
                            deleteMenuSubmenu.menu,
                            deleteMenuSubmenu.submenu,
                          ) && (
                            <button
                              className="hover:text-red"
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
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                            </button>
                          )}
                      </>
                    )}
                    <button className="hover:text-primary" title="Info"
                        onClick={() => handleInfoClick(row)}
                        disabled={isLoadingInfo}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      >
                        <path d="M10 11h2v5m-2 0h4m-2.592-8.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for Info */}
      {isInfoModalOpen && infoData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="dark:bg-boxdark relative mt-20 w-full max-w-4xl rounded-lg bg-white shadow-lg">
            {/* Modal Header */}
            <div className="dark:border-strokedark dark:bg-boxdark sticky top-0 flex items-center justify-between rounded-t-lg border-b bg-white p-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Branch Details
              </h3>
              <button onClick={() => setIsInfoModalOpen(false)}>×</button>
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
                    {/* <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    </div> */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((col) => {
          const value = infoData[col.key];
          return (
            <div key={col.key}>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {col.title}
              </label>
              <div className="border-stroke dark:border-strokedark dark:bg-meta-4 rounded-md border bg-gray-50 px-3 py-2 text-sm">
                {col.format
                  ? col.format(value, infoData)
                  : value !== null && value !== undefined
                    ? value.toString()
                    : "-"}
              </div>
            </div>
          );
        })}
      </div>
                  </div>
                ))}
            </div>

            {/* Modal Footer */}
            <div className="dark:border-strokedark dark:bg-boxdark sticky bottom-0 rounded-b-lg border-t bg-white p-4">
              <button
                onClick={() => setIsInfoModalOpen(false)}
                className="dark:border-strokedark dark:hover:bg-meta-4 w-full rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:text-white"
              >
                Close
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

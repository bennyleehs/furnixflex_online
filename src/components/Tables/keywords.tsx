import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import "./styles.css"; // Import the CSS file

interface TableProps {
  columns: { key: string; title: string }[]; // Defines column keys & titles
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
}: TableProps) {
  const [tableData, setTableData] = useState(data);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [filterOptions, setFilterOptions] = useState<Record<string, { label: string; count: number }[]>>({});
  const [searchQuery, setSearchQuery] = useState(''); // Add new state for search query
  const router = useRouter();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for search timeout
  const [filterCounts, setFilterCounts] = useState<Record<string, Record<string, number>>>({});

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
        segments.forEach((segment: { trim: () => { (): any; new(): any; length: number; }; }) => {
          maxLength = Math.max(maxLength, segment.trim().length); // Find the longest segment
        });
      });
      return maxLength * 8; // Approximate width in pixels (8px per character)
    });
    setColumnWidths(widths);
  }, [data, columns, filterKeys, selectedStatus]);

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
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filteredData = filteredData.filter((row) => {
        // Search through all column values
        return columns.some(column => {
          const cellValue = row[column.key];
          return cellValue && 
            cellValue.toString().toLowerCase().includes(query);
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
    
    filterKeys.forEach(key => {
      // Skip status if we already have statusCounts
      if (key === "status" && statusCounts) return;
      
      // Calculate counts for this filter key
      const counts: Record<string, number> = {};
      data.forEach(row => {
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

  const renderPagination = () => {
    if (!totalItems || !onPageChange) return null;
    
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;
    
    const pages = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = startPage + maxPagesToShow - 1;
    
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return (
      <div className="flex items-center justify-between py-4">
        <div>
          <p className="text-sm text-gray-500">
            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
          </p>
        </div>
        <div className="flex space-x-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded-sm bg-gray-200 disabled:opacity-50"
          >
            First
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded-sm bg-gray-200 disabled:opacity-50"
          >
            Prev
          </button>
          
          {pages.map(page => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 rounded ${
                currentPage === page ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded-sm bg-gray-200 disabled:opacity-50"
          >
            Next
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded-sm bg-gray-200 disabled:opacity-50"
          >
            Last
          </button>
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
    const counts = key === "status" && statusCounts 
      ? statusCounts 
      : filterCounts[key] || {};
    
    // Get unique values for this key (if no counts available)
    let options: Array<{value: string, label: string, count: number}> = [];
    
    if (Object.keys(counts).length > 0) {
      // Create options from counts
      options = Object.entries(counts).map(([value, count]) => ({
        value: value === "null" ? "" : value,
        label: value === "null" ? "(Empty)" : value,
        count
      }));
    } else {
      // Fallback to unique values without counts
      const uniqueValues = [...new Set(data.map(row => String(row[key] || "")))];
      options = uniqueValues.map(value => ({
        value,
        label: value || "(Empty)",
        count: 0
      }));
    }
    
    // Add "All" option
    options.unshift({ value: "All", label: "All", count: totalItems });
    
    // Remove the mb-4 mr-4 margins that were pushing elements apart
    return (
      <div>
        <select
          id={`filter-${key}`}
          value={selectedFilters[key] || "All"}
          onChange={(e) => handleFilterChange(key, e.target.value)}
          className="p-2 border rounded-sm min-w-[130px]"
        >
          {options.map((option, index) => (
            <option key={`${key}-${option.value}-${index}`} value={option.value}>
              {option.label} ({option.count})
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-2">
      {/* Table Header with inline filters & search */}
      <div className="flex justify-between items-center mb-4">
        {/* Filter area - make everything inline */}
        <div className="flex items-center flex-wrap gap-3 flex-1">
          {filterKeys.map((key) => (
            <div key={key} className="flex items-center space-x-1">
              <span className="text-sm font-medium whitespace-nowrap">{key.charAt(0).toUpperCase() + key.slice(1)}:</span>
              {renderFilter(key)}
            </div>
          ))}
          
          {/* Search and Results Count Container */}
          <div className="flex items-center space-x-2">
            {/* Search Input */}
            <div className="relative w-[200px]">
              <input
                type="text"
                placeholder={`Search in ${selectedFilters['status'] || 'All'}...`}
                className="border border-stroke dark:border-strokedark px-8 py-2 rounded-sm text-sm w-full"
                value={searchQuery}
                onChange={(e) => {
                  const newQuery = e.target.value;
                  setSearchQuery(newQuery);
                  
                  // Debounce logic remains the same...
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
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400"
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
              </svg>
              {searchQuery && (
                <button
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400"
                  onClick={() => {
                    setSearchQuery('');
                    if (onSearchChange) {
                      onSearchChange('');
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
            
            {/* Results count text */}
            {/* <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {searchQuery ? 
                `Showing ${tableData.length} of ${totalItems} total results for "${searchQuery}"` : 
                selectedFilters['status'] && selectedFilters['status'] !== 'All' ?
                  `Showing ${Math.min(tableData.length, totalItems)} of ${totalItems} ${selectedFilters['status']} records` :
                  `Showing ${Math.min(itemsPerPage, totalItems)} of ${totalItems} records`}
            </span> */}
          </div>
        </div>

        {/* Create Button */}
        <div className="shrink-0 ml-3">
          <Link
            href={createLink || "/"}
            className="flex items-center justify-center rounded-md bg-white dark:bg-boxdark border border-stroke px-4 py-2 hover:bg-gray-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-full overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-meta-4">
              {columns.map((col, index) => (
                <th
                  key={col.key}
                  style={{ minWidth: `${columnWidths[index]}px` }} // Apply calculated width
                  className="px-2 py-4 font-medium text-black dark:text-white xl:pl-6"
                >
                  {col.title}
                </th>
              ))}
              <th className="min-w-[140px] px-2 py-4 font-medium text-black dark:text-white xl:pl-6">
                Overview/Options
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((col, index) => (
                  <td
                    key={col.key}
                    style={{ minWidth: `${columnWidths[index]}px` }} // Apply calculated width
                    className="border-b border-[#eee] px-2 py-5 dark:border-strokedark xl:pl-6"
                  >
                    {row[col.key]}
                  </td>
                ))}
                {/* action */}
                <td className="border-b border-[#eee] px-2 py-5 dark:border-strokedark xl:pl-6">
                  <div className="flex items-center space-x-6">
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
                    <button className="hover:text-primary">
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

      {/* Pagination */}
      {renderPagination()}
    </div>
  );
}


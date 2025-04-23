import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import "./styles.css"; // Import the CSS file

interface TableProps {
  columns: { key: string; title: string }[]; // Defines column keys & titles
  data: Record<string, any>[]; // Rows of data
  createLink?: string;
  filterKeys: string[]; // Keys to filter the data (e.g., ["country", "status"])
}

export default function Tables({
  columns,
  data,
  createLink,
  filterKeys = [],
}: TableProps) {
  const [tableData, setTableData] = useState(data);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>(
    {}
  );
  const [filterOptions, setFilterOptions] = useState<
    Record<string, { label: string; count: number }[]>
  >({});
  const router = useRouter();

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
        segments.forEach((segment: { trim: () => { (): any; new(): any; length: number; }; }) => {
          maxLength = Math.max(maxLength, segment.trim().length); // Find the longest segment
        });
      });
      return maxLength * 8; // Approximate width in pixels (8px per character)
    });
    setColumnWidths(widths);
  }, [data, columns, filterKeys]);

  useEffect(() => {
    // Apply filters to get filtered data
    let filteredData = data;
    
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
      let dataForThisFilter = data;
      
      Object.entries(selectedFilters).forEach(([key, value]) => {
        // Skip the current filter key we're calculating counts for
        if (key !== currentKey && value !== "All") {
          dataForThisFilter = dataForThisFilter.filter((row) => row[key] === value);
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
        ...Object.entries(counts).map(([label, count]) => ({ label, count })),
      ];
    });
    
    setFilterOptions(options);
  }, [selectedFilters, data, filterKeys]);

  const handleEdit = (row: Record<string, any>) => {
    router.push(`${createLink || "/"}?id=${row.id}`);
  };

  return (
    <div className="rounded-lg border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-2">
      {/* Table Header with Create Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        {/* Filter Dropdowns */}
        <div className="flex flex-wrap gap-4 w-full">
          {filterKeys.map((key) => (
            <div
              key={key}
              className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto"
            >
              <label
                htmlFor={`filter-dropdown-${key}`}
                className="text-sm font-medium text-gray-700"
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}:
              </label>
              <select
                id={`filter-dropdown-${key}`}
                value={selectedFilters[key]}
                onChange={(e) =>
                  setSelectedFilters((prev) => ({
                    ...prev,
                    [key]: e.target.value,
                  }))
                }
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 shadow-xs focus:border-primary"
              >
                {filterOptions[key]?.map((option, index) => (
                  <option key={index} value={option.label}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Create Button */}
        <div className="w-full sm:w-auto">
          <Link
            href={createLink || "/"}
            className="w-full sm:w-auto h-full flex items-center justify-center rounded-md bg-white text-black border border-black px-4 py-2 hover:bg-gray-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
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
                    className="border-b border-[#eee] px-2 py-5 dark:border-strokedark xl:pl-6 break-on-slash"
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
    </div>
  );
}

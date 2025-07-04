"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Tables from "@/components/Tables/progress";
import DefaultLayout from "@/components/Layouts/DefaultLayout";

export default function Page() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false);
  const title = "task";
  const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  // const [selectedStatus, setSelectedStatus] = useState("All"); // Initialize with "All" to see all statuses
  const [filteredStatus, setFilteredStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState(""); // Add search query state

  const fetchData = useCallback(async () => {
    try {
      // const statusParam =
      //   selectedStatus !== "All" ? `&status=${selectedStatus}` : ""; // Add status filter to API request if not "All"
      const statusParam =
        filteredStatus !== "All" ? `&status=${filteredStatus}` : "";
      const searchParam = searchQuery
        ? `&search=${encodeURIComponent(searchQuery)}`
        : ""; // Add search query parameter
      const res = await fetch(
        `/api/sales/${title}?page=${currentPage}&limit=${itemsPerPage}${statusParam}${searchParam}`,
      );
      if (!res.ok) throw new Error(`Failed to fetch ${capitalizedTitle}`);

      const response = await res.json();
      const newData = response[`list${capitalizedTitle}`] || [];
      const formattedRows = newData.map((item: any) => ({
        ...item,
        id: `${item.id}`,
        source: `${item.source} / ${item.interested} / ${item.add_info}`,
        name: `${item.name} / ${item.nric}`,
        contact: `${item.phone1} / ${item.phone2} / ${item.email}`,
        address: `${item.address_line1}, ${item.address_line2}, 
                  ${item.city}, ${item.state}, ${item.country}`,
        date: new Date(item.created_at).toLocaleDateString(),
        status: `${item.status}`,
        sales_uid: `${item.sales_uid}`,
        pic: `${item.sales_name} / ${item.sales_uid}`,
      }));

      // setData(formattedRows);
      // setData((prev) => [...prev, ...formattedRows]);
      setData((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const uniqueNew = formattedRows.filter(
          (row: { id: any }) => !seen.has(row.id),
        );
        return [...prev, ...uniqueNew];
      });
      setHasMore(formattedRows.length === itemsPerPage);
      setTotalItems(response.totalCount || formattedRows.length);
      setStatusCounts(response.statusCounts || {});
    } catch (err) {
      setError("Error fetching DB data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    itemsPerPage,
    filteredStatus,
    // selectedStatus,
    searchQuery,
    title,
    capitalizedTitle,
  ]);

  useEffect(() => {
    // Always fetch on first render or when filter parameters change
    fetchData();

    // Only set this flag on initial load to prevent duplicate fetches
    if (!hasFetchedData.current) {
      hasFetchedData.current = true;
    }
  }, [fetchData]);

  // const handleFilterChange = (key: string, value: string) => {
  //   if (key === "status") {
  //     setSelectedStatus(value);
  //     setCurrentPage(1); // Reset to page 1
  //     setData([]);
  //     setHasMore(true);
  //     hasFetchedData.current = false; // Force reload data
  //   }
  // }; //not used? bcs define the function inside table on  the onFilterChange

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    setData([]);
    setHasMore(true);
    hasFetchedData.current = false; // Force reload data with new search
  };

  const columns = [
    { key: "id", title: "ID" },
    { key: "source", title: "From / Interest" },
    { key: "name", title: "Name / NRIC" },
    { key: "contact", title: "Contact" },
    { key: "address", title: "Address" },
    { key: "date", title: "Date" },
    { key: "status", title: "Status" },
    { key: "pic", title: "PIC" },
  ];

  return (
    <DefaultLayout>
      {/* <Breadcrumb pageName={`${capitalizedTitle} List`} /> */}
      {loading && <p>Loading {title}s...</p>}
      {error && <p className="text-red-500">{error}</p>}
      <Tables
        data={data}
        statusCounts={statusCounts}
        totalItems={totalItems}
        pageName={`${capitalizedTitle} List`}
        // selectedStatus={selectedStatus}
        // onFilterChange={handleFilterChange}
        // onSearchChange={handleSearchChange}
        selectedStatus={filteredStatus}
        onFilterChange={(key, val) => {
          if (key === "status") setFilteredStatus(val);
        }}
        onSearchChange={(query) => {
          setSearchQuery(query);
        }}
      />
      {hasMore && !loading && (
        <div className="mt-4 text-center">
          <button
            className="bg-primary rounded px-4 py-2 text-white"
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Load More
          </button>
        </div>
      )}
    </DefaultLayout>
  );
}

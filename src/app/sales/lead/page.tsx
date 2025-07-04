"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Tables from "@/components/Tables/keywords";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import usePermissions from "@/hooks/usePermissions";

// const title = "Lead List";
const MENU = "2";
const SUBMENU = "2";
const PERMISSION_PREFIX = `${MENU}.${SUBMENU}`;

export default function LeadPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false);
  const title = "lead";
  const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [selectedStatus, setSelectedStatus] = useState("Assign PIC"); // Initialize with a proper default status
  const [searchQuery, setSearchQuery] = useState(""); // Add search query state
  const { canCreate, loadingPermissions } = usePermissions(); // Use the custom hook
  const canCreateButton = canCreate(MENU, SUBMENU);

  const fetchData = useCallback(async () => {
    try {
      const statusParam =
        selectedStatus !== "All" ? `&status=${selectedStatus}` : ""; // Add status filter to API request if not "All"
      const searchParam = searchQuery
        ? `&search=${encodeURIComponent(searchQuery)}`
        : ""; // Add search query parameter
      const res = await fetch(
        `/api/sales/${title}?page=${currentPage}&limit=${itemsPerPage}${statusParam}${searchParam}`,
      );
      if (!res.ok) throw new Error(`Failed to fetch ${capitalizedTitle}`);

      const response = await res.json();
      const formattedRows = response[`list${capitalizedTitle}`].map(
        (item: any) => ({
          ...item,
          id: `${item.id}`,
          source: `${item.source} / ${item.interested} / ${item.add_info}`,
          name: `${item.name} / ${item.nric}`,
          contact: `${item.phone1} / ${item.phone2} / ${item.email}`,
          address: `${item.address_line1}, ${item.address_line2}, 
                  ${item.city}, ${item.state}, ${item.country}`,
          type: `${item.property} / ${item.guard}`,
          date: new Date(item.created_at).toLocaleDateString(), // Format date as needed
          status: `${item.status}`,
          pic: `${item.sales_name} / ${item.sales_uid}`, // Assuming sales_id and sales_name are available
        }),
      );

      setData(formattedRows);
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
    selectedStatus,
    searchQuery,
    capitalizedTitle,
  ]);

  useEffect(() => {
    // Always fetch on first render or when filter parameters change
    fetchData();

    // Only set this flag on initial load to prevent duplicate fetches
    if (!hasFetchedData.current) {
      hasFetchedData.current = true;
    }
  }, [fetchData, canCreateButton, loadingPermissions]);

  const handleFilterChange = (key: string, value: string) => {
    if (key === "status") {
      setSelectedStatus(value);
      setCurrentPage(1); // Reset to page 1
      hasFetchedData.current = false; // Force reload data
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    hasFetchedData.current = false; // Force reload data with new search
  };

  const columns = [
    { key: "id", title: "ID", width: "w-10" },
    { key: "source", title: "From", width: "min-w-[140px]" },
    { key: "name", title: "Name / NRIC", width: "min-w-[140px]" },
    { key: "contact", title: "Contact", width: "min-w-[180px]" },
    { key: "address", title: "Address", width: "min-w-[260px]" },
    { key: "type", title: "Type", width: "min-w-[180px]" },
    { key: "date", title: "Date", width: "w-32" },
    { key: "status", title: "Status", width: "min-w-[140px]" },
    { key: "pic", title: "PIC", width: "min-w-[180px]" },
  ];
  
  return (
    <DefaultLayout>
      {/* <Breadcrumb noHeader={true} pageName={`${capitalizedTitle} List`} /> */}
      <Breadcrumb pageName={`${capitalizedTitle} List`} />
      {loading && <p>Loading Leads...</p>}
      {error && <p className="text-red-500">{error}</p>}
      <Tables
        columns={columns}
        data={data}
        createLink={`/sales/${title}/create`}
        filterKeys={["status"]}
        statusCounts={statusCounts}
        selectedStatus={selectedStatus} // Pass this prop
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={(page) => {
          setCurrentPage(page);
          hasFetchedData.current = false; // Force reload data
        }}
        onFilterChange={handleFilterChange} // Add this prop
        onSearchChange={handleSearchChange} // Add search handler
        showCreateButton={!loadingPermissions && canCreateButton}
        createPermissionPrefix={PERMISSION_PREFIX}
        editPermissionPrefix={PERMISSION_PREFIX}
        deletePermissionPrefix={PERMISSION_PREFIX}
        monitorPermissionPrefix={PERMISSION_PREFIX}
      />
    </DefaultLayout>
  );
}

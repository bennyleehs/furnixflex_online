"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Tables from "@/components/Tables/keywords";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import usePermissions from "@/hooks/usePermissions";
import { Lead } from "@/types/sales-lead";
import { useAuth } from "@/context/AuthContext";

// const title = "Lead List";
const MENU = "2";
const SUBMENU = "2";
const PERMISSION_PREFIX = `${MENU}.${SUBMENU}`;

export default function LeadPage() {
  const { user } = useAuth();
  const [dataLead, setDataLead] = useState([]);
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
    // 1. Determine the sales_uid to use for filtering
    // If the user is an 'Admin' (or another designated role), they see all leads.
    // Otherwise, filter by their own UID.
    // const userRole = user?.role.toLowerCase() || "";
    const userRole = user?.role || "";
    const isSalesPerson = ![
      "Managing Director",
      "Director",
      "Supervisor",
      "Manager",
      "Assistant Manager",
    ].includes(userRole); // Adjust roles as needed

    // Use the logged-in user's UID for filtering if they are a sales person
    const filterSalesUid = isSalesPerson ? user?.uid : null;

    const salesUidParam = filterSalesUid
      ? `&salesUid=${encodeURIComponent(filterSalesUid)}`
      : ""; // <--- New salesUid parameter
    try {
      const statusParam =
        selectedStatus !== "All" ? `&status=${selectedStatus}` : ""; // Add status filter to API request if not "All"
      const searchParam = searchQuery
        ? `&search=${encodeURIComponent(searchQuery)}`
        : ""; // Add search query parameter
      // const res = await fetch(
      //   `/api/sales/${title}?page=${currentPage}&limit=${itemsPerPage}${statusParam}${searchParam}`,
      // );
      const res = await fetch(
        `/api/sales/${title}?page=${currentPage}&limit=${itemsPerPage}${statusParam}${searchParam}${salesUidParam}`,
      );
      if (!res.ok) throw new Error(`Failed to fetch ${capitalizedTitle}`);

      const response = await res.json();
      const formattedRows = response[`list${capitalizedTitle}`].map(
        (item: Lead) => ({
          ...item,
          originalKey: item.id,
          // Add computed fields for table display
          contact: item.phone1 || "Not Provided",
          address:
            [item.city, item.state, item.country].filter(Boolean).join(", ") ||
            "Not Provided",
          // type:
          //   [item.property, item.guard].filter(Boolean).join(" / ") ||
          //   "Not Provided",
          pic: item.sales_name || "Not Assigned",
          created_at: item.created_at
            ? new Date(item.created_at).toLocaleDateString("en-GB", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })
            : "N/A",
        }),
      );

      setDataLead(formattedRows);
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
    user,
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
    { key: "created_at", title: "Date", width: "w-32" },
    { key: "name", title: "Name", width: "min-w-[140px]" },
    { key: "contact", title: "Contact", width: "min-w-[180px]" },
    { key: "address", title: "Address", width: "min-w-[260px]" },
    // { key: "type", title: "Type", width: "min-w-[180px]" },
    { key: "status", title: "Status", width: "min-w-[140px]" },
    { key: "pic", title: "PIC", width: "min-w-[180px]" },
  ];

  const modalColumns = [
    { key: "id", group: "Basic Information", title: "Lead ID" },
    { key: "name", group: "Basic Information", title: "Full Name" },
    { key: "source", group: "Basic Information", title: "Source" },
    {
      key: "nric",
      group: "Basic Information",
      title: "NRIC",
      format: (value: string) => value || "Not provided",
    },
    { key: "status", group: "Basic Information", title: "Current Status" },
    {
      key: "created_at",
      group: "Basic Information",
      title: "Created Date",
      // format: (value: Date) => value ? new Date(value).toLocaleDateString() : 'N/A'
      format: (value: Date) =>
        new Date(value).toLocaleDateString("en-GB", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
    },
    { key: "phone1", group: "Contact Details", title: "Phone 1" },
    {
      key: "phone2",
      group: "Contact Details",
      title: "Phone 2",
      format: (value: string) => value || "Not provided",
    },
    {
      key: "email",
      group: "Contact Details",
      title: "Email",
      format: (value: string) => value || "Not provided",
    },
    {
      group: "Address",
      key: "full_address",
      title: "Full Address",
      format: (_: any, row: Lead) => {
        const parts = [
          row.address_line1 ? `${row.address_line1},` : "-",
          row.address_line2 || "-",
          [row.city, row.state].filter(Boolean).join(", ") || "-",
          [row.postcode, row.country].filter(Boolean).join(", ") || "-",
        ];

        return <div className="whitespace-pre-line">{parts.join("\n")}</div>;
      },
    },
    { key: "property", group: "Property", title: "Property Type" },
    { key: "guard", group: "Property", title: "Gated/Guarded" },
    { key: "interested", group: "Property", title: "Interested" },
    {
      key: "add_info",
      group: "Property",
      title: "Additional Info",
      format: (value: string) => value || "Not provided",
    },
    {
      key: "salesNameUid",
      group: "PIC",
      title: "Salesperson",
      format: (_: any, row: Lead) => {
        const salesName = row.sales_name;
        const salesUid = row.sales_uid;

        // If both are falsy, return the fallback
        if (!salesName && !salesUid) {
          return "No salesperson assigned";
        }

        return `${salesName} | ${salesUid}`;
      },
    },
    {
      key: "assignBy",
      group: "PIC",
      title: "Assigned By",
      format: (_: any, row: Lead) => {
        const assignedBy = row.assigned_name;
        const assignUid = row.assigned_by;

        // Check falsy and return the fallback, using ternary operator
        return !assignedBy && !assignUid
          ? "Not assigned yet"
          : `${assignedBy} | ${assignUid}`;
      },
    },
  ];

  return (
    <DefaultLayout>
      {/* <Breadcrumb noHeader={true} pageName={`${capitalizedTitle} List`} /> */}
      <Breadcrumb pageName={`${capitalizedTitle} List`} />
      {loading && <p>Loading Leads...</p>}
      {error && <p className="text-red-500">{error}</p>}
      <Tables
        columns={columns}
        modalColumns={modalColumns}
        data={dataLead}
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
        infoEndpoint="/api/sales/lead"
      />
    </DefaultLayout>
  );
}

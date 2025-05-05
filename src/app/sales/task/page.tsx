"use client";
import { useEffect, useState, useRef } from "react";
// import Tables from "@/components/Tables/keywords";
import Tables from "@/components/Tables/progress";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

export default function Page() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false);
  const title = "task";
  const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [selectedStatus, setSelectedStatus] = useState("All"); // Initialize with "All" to see all statuses
  const [searchQuery, setSearchQuery] = useState(""); // Add search query state

  const fetchData = async () => {
    try {
      const statusParam = selectedStatus !== "All" ? `&status=${selectedStatus}` : ''; // Add status filter to API request if not "All"
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''; // Add search query parameter
      const res = await fetch(`/api/sales/${title}?page=${currentPage}&limit=${itemsPerPage}${statusParam}${searchParam}`);
      if (!res.ok) throw new Error(`Failed to fetch ${capitalizedTitle}`);

      const response = await res.json();
      const formattedRows = response[`list${capitalizedTitle}`].map((item: any) => ({
        ...item,
        id: `${item.id}`,
        source: `${item.source} / ${item.interested} / ${item.add_info}`,
        name: `${item.name} / ${item.nric}`, 
        contact: `${item.phone1} / ${item.phone2} / ${item.email}`,
        address: `${item.address_line1}, ${item.address_line2}, 
                  ${item.city}, ${item.state}, ${item.country}`,
        date: new Date(item.created_at).toLocaleDateString(), // Format date as needed
        status: `${item.status}`, 
        sales_uid: `${item.sales_uid}`, // Assuming sales_id and sales_name are available
        pic: `${item.sales_name} / ${item.sales_uid}`, // Assuming sales_id and sales_name are available
      }));
      
      setData(formattedRows);
      setTotalItems(response.totalCount || formattedRows.length);
      setStatusCounts(response.statusCounts || {});
    } catch (err) {
      setError("Error fetching DB data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Always fetch on first render or when filter parameters change
    fetchData();
    
    // Only set this flag on initial load to prevent duplicate fetches
    if (!hasFetchedData.current) {
      hasFetchedData.current = true;
    }
  }, [currentPage, itemsPerPage, selectedStatus, searchQuery]);

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
    { key: "id", title: "ID" },
    { key: "source", title: "From / Interest" },
    { key: "name", title: "Name / NRIC" },
    { key: "contact", title: "Contact" },
    { key: "address", title: "Address" },
    { key: "date", title: "Date" },
    { key: "status", title: "Status" },
    { key: "pic", title: "PIC" },
  ];

  if (loading) return <p>Loading {title}s...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <DefaultLayout>
      {/* <Breadcrumb pageName={`${capitalizedTitle} List`} /> */}
      <Tables
        data={data}
        statusCounts={statusCounts} 
        totalItems={totalItems} 
        pageName={`${capitalizedTitle} List`}
      />
      
      {/* Add Progress Table */}
      {/* <Tables 
        columns={columns} 
        data={data} 
        createLink={`/sales/${title}/create`}
        filterKeys={["pic"]}
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
      /> */}
    </DefaultLayout>
  );
}

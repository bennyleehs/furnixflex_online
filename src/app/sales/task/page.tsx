"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Tables from "@/components/Tables/progress";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import { useAuth } from "@/context/AuthContext";

export default function Page() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const title = "task";
  const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(
    async (pageToFetch: number = 1) => {
      if (!isAuthenticated || !user?.uid || !user?.role) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const statusParam =
          selectedStatus !== "All" ? `&status=${selectedStatus}` : "";
        const searchParam = searchQuery ? `&search=${searchQuery}` : "";

        const userUidParam = `&userUid=${user.uid}`;
        const userRoleParam = `&userRole=${user.role}`;

        const response = await fetch(
          `/api/sales/task?page=${pageToFetch}&limit=${itemsPerPage}${statusParam}${searchParam}${userUidParam}${userRoleParam}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }
        const result = await response.json();

        const newData = result.listTask || [];
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

        if (pageToFetch === 1) {
          setData(formattedRows);
        } else {
          setData((prev) => {
            const uniqueNew = formattedRows.filter(
              (row: { id: any }) => !prev.some((p) => p.id === row.id),
            );
            return [...prev, ...uniqueNew];
          });
        }

        setHasMore(result.listTask.length === itemsPerPage);
        setTotalItems(result.totalCount);
        setStatusCounts(result.statusCounts);
        setCurrentPage(pageToFetch);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [itemsPerPage, selectedStatus, searchQuery, isAuthenticated, user],
  );

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      setData([]);
      fetchData(1);
    }
  }, [
    fetchData,
    isAuthenticated,
    isLoading,
    selectedStatus,
    searchQuery,
    user,
  ]);

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      // Functional state update to ensure we use the latest currentPage
      setCurrentPage((prevPage) => {
        const nextPage = prevPage + 1;
        fetchData(nextPage);
        return nextPage;
      });
    }
  };

  if (isLoading) {
    return (
      <DefaultLayout>
        <p>Loading user data...</p>
      </DefaultLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <DefaultLayout>
        <p className="text-red-500">Please log in to view this page.</p>
      </DefaultLayout>
    );
  }

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
      <Tables
        data={data}
        statusCounts={statusCounts}
        totalItems={totalItems}
        pageName={`${capitalizedTitle} List`}
        selectedStatus={selectedStatus}
        onFilterChange={(key, val) => {
          if (key === "status") {
            setSelectedStatus(val);
            setCurrentPage(1);
          }
        }}
        onSearchChange={(query) => {
          setSearchQuery(query);
          setCurrentPage(1);
        }}
      />
      {loading && <p className="text-center">Loading {title}s...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {hasMore && !loading && (
        <div className="mt-4 text-center">
          <button
            onClick={handleLoadMore}
            className="border-primary bg-primary hover:bg-primarydark w-sm cursor-pointer rounded-lg border p-3 font-semibold text-white transition"
          >
            Load More ({data.length}/{totalItems})
          </button>
        </div>
      )}
    </DefaultLayout>
  );
}

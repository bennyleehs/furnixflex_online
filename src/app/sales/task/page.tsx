// "use client";
// import { useEffect, useState, useRef, useCallback } from "react";
// import Tables from "@/components/Tables/progress";
// import DefaultLayout from "@/components/Layouts/DefaultLayout";

// export default function Page() {
//   const [data, setData] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const hasFetchedData = useRef(false);
//   const title = "task";
//   const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);

//   const [currentPage, setCurrentPage] = useState(1);
//   const [itemsPerPage, setItemsPerPage] = useState(20);
//   const [hasMore, setHasMore] = useState(true);
//   const [totalItems, setTotalItems] = useState(0);
//   const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
//   const [selectedStatus, setSelectedStatus] = useState("All"); // Initialize with "All" to see all statuses
//   // const [filteredStatus, setFilteredStatus] = useState("All");
//   const [searchQuery, setSearchQuery] = useState(""); // Add search query state

//   const fetchData = useCallback(async () => {
//     try {
//       // const statusParam =
//       //   selectedStatus !== "All" ? `&status=${selectedStatus}` : ""; // Add status filter to API request if not "All"
//       // const statusParam =
//       //   filteredStatus !== "All" ? `&status=${filteredStatus}` : "";
//       const searchParam = searchQuery
//         ? `&search=${encodeURIComponent(searchQuery)}`
//         : ""; // Add search query parameter
//       // const res = await fetch(
//       //   `/api/sales/${title}?page=${currentPage}&limit=${itemsPerPage}${statusParam}${searchParam}`,
//       // );
//       const res = await fetch(
//     `/api/sales/${title}?page=${currentPage}&limit=${itemsPerPage}${searchParam}`,
//   );
//       if (!res.ok) throw new Error(`Failed to fetch ${capitalizedTitle}`);

//       const response = await res.json();
//       const newData = response[`list${capitalizedTitle}`] || [];
//       const formattedRows = newData.map((item: any) => ({
//         ...item,
//         id: `${item.id}`,
//         source: `${item.source} / ${item.interested} / ${item.add_info}`,
//         name: `${item.name} / ${item.nric}`,
//         contact: `${item.phone1} / ${item.phone2} / ${item.email}`,
//         address: `${item.address_line1}, ${item.address_line2},
//                   ${item.city}, ${item.state}, ${item.country}`,
//         date: new Date(item.created_at).toLocaleDateString(),
//         status: `${item.status}`,
//         sales_uid: `${item.sales_uid}`,
//         pic: `${item.sales_name} / ${item.sales_uid}`,
//       }));

//       // setData(formattedRows);
//       // setData((prev) => [...prev, ...formattedRows]);
//       setData((prev) => {
//         const seen = new Set(prev.map((p) => p.id));
//         const uniqueNew = formattedRows.filter(
//           (row: { id: any }) => !seen.has(row.id),
//         );
//         return [...prev, ...uniqueNew];
//       });
//       setHasMore(formattedRows.length === itemsPerPage);
//       setTotalItems(response.totalCount || formattedRows.length);
//       setStatusCounts(response.statusCounts || {});
//     } catch (err) {
//       setError("Error fetching DB data");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   }, [
//     currentPage,
//     itemsPerPage,
//     // filteredStatus,
//     // selectedStatus,
//     searchQuery,
//     title,
//     capitalizedTitle,
//   ]);

//   useEffect(() => {
//     // Always fetch on first render or when filter parameters change
//     fetchData();

//     // Only set this flag on initial load to prevent duplicate fetches
//     if (!hasFetchedData.current) {
//       hasFetchedData.current = true;
//     }
//   }, [fetchData]);

//   // const handleFilterChange = (key: string, value: string) => {
//   //   if (key === "status") {
//   //     setSelectedStatus(value);
//   //     setCurrentPage(1); // Reset to page 1
//   //     setData([]);
//   //     setHasMore(true);
//   //     hasFetchedData.current = false; // Force reload data
//   //   }
//   // }; //not used? bcs define the function inside table on  the onFilterChange

//   const handleSearchChange = (query: string) => {
//     setSearchQuery(query);
//     setCurrentPage(1);
//     setData([]);
//     setHasMore(true);
//     hasFetchedData.current = false; // Force reload data with new search
//   };

//   const columns = [
//     { key: "id", title: "ID" },
//     { key: "source", title: "From / Interest" },
//     { key: "name", title: "Name / NRIC" },
//     { key: "contact", title: "Contact" },
//     { key: "address", title: "Address" },
//     { key: "date", title: "Date" },
//     { key: "status", title: "Status" },
//     { key: "pic", title: "PIC" },
//   ];

//   return (
//     <DefaultLayout>
//       {/* <Breadcrumb pageName={`${capitalizedTitle} List`} /> */}
//       {loading && <p>Loading {title}s...</p>}
//       {error && <p className="text-red-500">{error}</p>}
//       <Tables
//         data={data}
//         statusCounts={statusCounts}
//         totalItems={totalItems}
//         pageName={`${capitalizedTitle} List`}
//         selectedStatus={selectedStatus}
//         // onFilterChange={handleFilterChange}
//         // onSearchChange={handleSearchChange}
//         // selectedStatus={filteredStatus}
//         onFilterChange={(key, val) => {
//           // if (key === "status") setFilteredStatus(val);
//           if (key === "status") setSelectedStatus(val);
//         }}
//         onSearchChange={(query) => {
//           setSearchQuery(query);
//         }}
//       />
//       {hasMore && !loading && (
//         <div className="mt-4 text-center">
//           <button
//             className="bg-primary rounded px-4 py-2 text-white"
//             onClick={() => setCurrentPage((p) => p + 1)}
//           >
//             Load More
//           </button>
//         </div>
//       )}
//     </DefaultLayout>
//   );
// }

// //v2.2
// "use client";
// import { useEffect, useState, useRef, useCallback } from "react";
// import Tables from "@/components/Tables/progress";
// import DefaultLayout from "@/components/Layouts/DefaultLayout";
// import { useAuth } from "@/context/AuthContext";

// export default function Page() {
//   const { user, isAuthenticated, isLoading } = useAuth();
//   const [data, setData] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const hasFetchedData = useRef(false);
//   const title = "task";
//   const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);

//   const [currentPage, setCurrentPage] = useState(1);
//   const [itemsPerPage, setItemsPerPage] = useState(20);
//   const [hasMore, setHasMore] = useState(true);
//   const [totalItems, setTotalItems] = useState(0);
//   const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
//   const [selectedStatus, setSelectedStatus] = useState("All");
//   const [searchQuery, setSearchQuery] = useState("");

//   const fetchData = useCallback(async (pageToFetch: number = 1) => {
//     // Make sure we have a user and authentication state is ready
//     if (!isAuthenticated || !user?.uid || !user?.role) {
//       setLoading(false);
//       return;
//     }

//     setLoading(true);
//     setError(null);
//     try {
//       const statusParam =
//         selectedStatus !== "All" ? `&status=${selectedStatus}` : "";
//       const searchParam = searchQuery ? `&search=${searchQuery}` : "";
//       const userUidParam = `&userUid=${user.uid}`;
//       const userRoleParam = `&userRole=${user.role}`; // ADDED: Send user role

//       const response = await fetch(
//         `/api/sales/task?page=${pageToFetch}&limit=${itemsPerPage}${statusParam}${searchParam}${userUidParam}${userRoleParam}`,
//       );
//       if (!response.ok) {
//         throw new Error("Failed to fetch data");
//       }
//       const result = await response.json();

//       const newData = result.listTask || [];
//       const formattedRows = newData.map((item: any) => ({
//         ...item,
//         id: `${item.id}`,
//         source: `${item.source} / ${item.interested} / ${item.add_info}`,
//         name: `${item.name} / ${item.nric}`,
//         contact: `${item.phone1} / ${item.phone2} / ${item.email}`,
//         address: `${item.address_line1}, ${item.address_line2},
//                    ${item.city}, ${item.state}, ${item.country}`,
//         date: new Date(item.created_at).toLocaleDateString(),
//         status: `${item.status}`,
//         sales_uid: `${item.sales_uid}`,
//         pic: `${item.sales_name} / ${item.sales_uid}`,
//       }));

//       // If fetching the first page, replace data. Otherwise, append.
//       if (pageToFetch === 1) {
//         setData(formattedRows);
//       } else {
//         setData((prev) => {
//           const seen = new Set(prev.map((p) => p.id));
//           const uniqueNew = formattedRows.filter(
//             (row: { id: any }) => !seen.has(row.id),
//           );
//           return [...prev, ...uniqueNew];
//         });
//       }

//       setHasMore(result.listTask.length === itemsPerPage);
//       setTotalItems(result.totalCount);
//       setStatusCounts(result.statusCounts);
//       setCurrentPage(pageToFetch);

//     } catch (err: any) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   }, [
//     itemsPerPage,
//     selectedStatus,
//     searchQuery,
//     isAuthenticated,
//     user,
//   ]);

//   // useEffect(() => {
//   //   if (!isLoading && isAuthenticated && user) {
//   //     fetchData(1);
//   //   }
//   // }, [fetchData, isAuthenticated, isLoading, selectedStatus, searchQuery, user]);
//   useEffect(() => {
//     // Only fetch data when user object is available after login or when filters change
//     if (!isLoading && isAuthenticated && user) {
//       setData([]); // Clear data to ensure a fresh fetch
//       fetchData(1);
//     }
//   }, [fetchData, isAuthenticated, isLoading, selectedStatus, searchQuery, user]);

//   const handleLoadMore = () => {
//     if (hasMore && !loading) {
//       fetchData(currentPage + 1);
//     }
//   };

//   if (isLoading) {
//     return (
//       <DefaultLayout>
//         <p>Loading user data...</p>
//       </DefaultLayout>
//     );
//   }

//   if (!isAuthenticated) {
//     return (
//       <DefaultLayout>
//         <p className="text-red-500">Please log in to view this page.</p>
//       </DefaultLayout>
//     );
//   }

//   const columns = [
//     { key: "id", title: "ID" },
//     { key: "source", title: "From / Interest" },
//     { key: "name", title: "Name / NRIC" },
//     { key: "contact", title: "Contact" },
//     { key: "address", title: "Address" },
//     { key: "date", title: "Date" },
//     { key: "status", title: "Status" },
//     { key: "pic", title: "PIC" },
//   ];

//   return (
//     <DefaultLayout>
//       {loading && <p>Loading {title}s...</p>}
//       {error && <p className="text-red-500">{error}</p>}
//       <Tables
//         data={data}
//         statusCounts={statusCounts}
//         totalItems={totalItems}
//         pageName={`${capitalizedTitle} List`}
//         selectedStatus={selectedStatus}
//         onFilterChange={(key, val) => {
//           if (key === "status") setSelectedStatus(val);
//         }}
//         onSearchChange={(query) => {
//           setSearchQuery(query);
//         }}
//       />
//       {hasMore && !loading && (
//       <div className="mt-4 text-center">
//         <button
//           onClick={handleLoadMore}
//           className="w-sm cursor-pointer rounded-lg border border-primary bg-primary p-3 font-semibold text-white transition hover:bg-opacity-90"
//         >
//           Load More ({data.length}/{totalItems})
//         </button></div>
//       )}
//     </DefaultLayout>
//   );
// }

//v2.3
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
            className="border-primary bg-primary hover:bg-opacity-90 w-sm cursor-pointer rounded-lg border p-3 font-semibold text-white transition"
          >
            Load More ({data.length}/{totalItems})
          </button>
        </div>
      )}
    </DefaultLayout>
  );
}

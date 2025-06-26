"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import Link from "next/link";

// Quotation interface
interface Quotation {
  id: string;
  task_id: string;
  customerName: string;
  customerContact: string;
  quotationDate: string;
  validUntil: string;
  salesRepresentative: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  quote_ref: string;
  quotation_number: string;
  created_at: string;
}

export default function QuotationListPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [statusFilter, setStatusFilter] = useState("all");
  const [salesRepFilter, setSalesRepFilter] = useState("");
  const [salesReps, setSalesReps] = useState<string[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalQuotations, setTotalQuotations] = useState(0);

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(
    null,
  );
  const [isLoadingQuotation, setIsLoadingQuotation] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // PDF modal states
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfFiles, setPdfFiles] = useState<
    { name: string; lastModified: string }[]
  >([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Fetch quotations with filters
  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      // Build query string with all filters
      let queryString = `?page=${page}&pageSize=${pageSize}`;

      if (searchTerm) {
        queryString += `&search=${encodeURIComponent(searchTerm)}`;
      }

      if (dateRange.from) {
        queryString += `&from=${dateRange.from}`;
      }

      if (dateRange.to) {
        queryString += `&to=${dateRange.to}`;
      }

      if (statusFilter !== "all") {
        queryString += `&status=${statusFilter}`;
      }

      if (salesRepFilter) {
        queryString += `&salesRep=${encodeURIComponent(salesRepFilter)}`;
      }

      const response = await fetch(`/api/sales/quotation/list${queryString}`);

      if (!response.ok) {
        throw new Error("Failed to fetch quotations");
      }

      const data = await response.json();
      setQuotations(data.quotations);
      setTotalQuotations(data.total);
      console.log("Fetched quotations:", data.quotations);

      // Extract unique sales reps for the filter dropdown
      if (data.salesReps) {
        setSalesReps(data.salesReps);
      }
    } catch (error) {
      console.error("Error fetching quotations:", error);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    searchTerm,
    dateRange.from,
    dateRange.to,
    statusFilter,
    salesRepFilter,
  ]);

  // Initial fetch
  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page
    fetchQuotations();
  };

  // Handle reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setDateRange({ from: "", to: "" });
    setStatusFilter("all");
    setSalesRepFilter("");
    setPage(1);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-MY", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Function to redirect to quotation editor with task ID
  const handleEditQuotation = async (task_id: string) => {
    setIsLoadingQuotation(true);

    try {
      const response = await fetch(`/api/sales/quotation?taskId=${task_id}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch quotation");
      }

      const data = await response.json();

      // Get the task_id from the quotation data
      const taskId = data.quotation.task_id;

      if (!taskId) {
        alert("This quotation doesn't have an associated task.");
        return;
      }

      // Redirect to the quotation editor with the task ID
      router.push(`/sales/quotation/auto?taskId=${taskId}`);
    } catch (error) {
      console.error("Error fetching quotation:", error);
      alert(
        "Failed to load quotation: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    } finally {
      setIsLoadingQuotation(false);
    }
  };

  // Function to update the quotation
  const handleUpdateQuotation = async (formData: any) => {
    setIsLoadingQuotation(true);
    setUpdateError(null);

    try {
      const response = await fetch(
        `/api/sales/quotation?id=${editingQuotation?.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update quotation");
      }

      // Close modal and refresh quotation list
      setIsEditModalOpen(false);
      fetchQuotations(); // Assuming you have a function to refresh the list
    } catch (error) {
      console.error("Error updating quotation:", error);
      setUpdateError(
        error instanceof Error ? error.message : "Failed to update quotation",
      );
    } finally {
      setIsLoadingQuotation(false);
    }
  };

  // Function to handle PDF viewing
  const handleViewPdf = async (taskId: string) => {
    if (!taskId) {
      alert("No task ID associated with this quotation");
      return;
    }

    try {
      // Fetch list of PDFs for this task
      const response = await fetch(
        `/api/sales/quotation/files?taskId=${taskId}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch PDFs");
      }

      const data = await response.json();

      if (!data.files || data.files.length === 0) {
        alert("No PDFs found for this quotation. You can generate a new one.");
        return;
      }

      if (data.files.length === 1) {
        // If only one PDF, open it directly
        window.open(
          `/api/sales/quotation/view-pdf?filePath=/sales/${taskId}/quotation/${data.files[0].name}`,
          "_blank",
        );
      } else {
        // If multiple PDFs, open modal for selection
        setPdfFiles(data.files);
        setSelectedTaskId(taskId);
        setIsPdfModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching PDFs:", error);
      alert(
        "Error fetching PDFs: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    }
  };

  // Function to handle status update
  const handleStatusUpdate = async (taskId: string, status: string) => {
    if (!taskId) {
      alert("No task ID associated with this quotation");
      return;
    }

    try {
      let response;

      if (status === "invoice") {
        // Use the new dedicated endpoint for invoice conversion
        response = await fetch(`/api/sales/invoice`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ taskId }),
        });
      } else {
        // Use the existing endpoint for other status updates
        response = await fetch(`/api/sales/quotation?taskId=${taskId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }

      alert(
        `Quotation has been ${status === "invoice" ? "converted to invoice" : status}!`,
      );
      fetchQuotations();

      if (status === "invoice") {
        router.push(`/sales/invoice?taskId=${taskId}`);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert(
        "Failed to update status: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    }
  };

  return (
    <DefaultLayout>
      <div className="mb-6 flex flex-col items-center justify-between md:flex-row">
        <Breadcrumb pageName="Quotations" noHeader={true} />

        <div className="mt-4 md:mt-0">
          <Link
            href="/sales/quotation/auto"
            className="bg-primary hover:bg-primary/90 inline-flex items-center rounded-md px-4 py-2 text-white transition"
          >
            <svg
              className="mr-1 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              ></path>
            </svg>
            Create New Quotation
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark mb-6 rounded-xs border bg-white p-5">
        <form
          onSubmit={handleSearch}
          className="grid grid-cols-1 gap-4 md:grid-cols-4"
        >
          {/* Search */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by quote #, customer..."
              className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-sm border-[1.5px] bg-transparent px-4 py-2 text-sm outline-hidden transition"
            />
          </div>

          {/* Date Range From */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
              Date From
            </label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) =>
                setDateRange({ ...dateRange, from: e.target.value })
              }
              className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-sm border-[1.5px] bg-transparent px-4 py-2 text-sm outline-hidden transition"
            />
          </div>

          {/* Date Range To */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
              Date To
            </label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) =>
                setDateRange({ ...dateRange, to: e.target.value })
              }
              className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-sm border-[1.5px] bg-transparent px-4 py-2 text-sm outline-hidden transition"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-sm border-[1.5px] bg-transparent px-4 py-2 text-sm outline-hidden transition"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Sales Rep Filter */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
              Sales Representative
            </label>
            <select
              value={salesRepFilter}
              onChange={(e) => setSalesRepFilter(e.target.value)}
              className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-sm border-[1.5px] bg-transparent px-4 py-2 text-sm outline-hidden transition"
            >
              <option value="">All Representatives</option>
              {salesReps.map((rep) => (
                <option key={rep} value={rep}>
                  {rep}
                </option>
              ))}
            </select>
          </div>

          {/* Search and Reset Buttons */}
          <div className="flex items-end space-x-2 md:col-span-2">
            <button
              type="submit"
              className="bg-primary hover:bg-primary/90 rounded-md px-4 py-2 text-white transition"
            >
              Search
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className="dark:bg-meta-4 dark:hover:bg-meta-3 rounded-md bg-gray-200 px-4 py-2 text-gray-700 transition hover:bg-gray-300 dark:text-gray-300"
            >
              Reset Filters
            </button>
          </div>
        </form>
      </div>

      {/* Quotations Table */}
      <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-xs border bg-white px-5 pt-6 pb-2.5">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="dark:bg-meta-4 bg-gray-50 text-left">
                <th className="px-4 py-4 font-medium text-gray-500 dark:text-gray-400">
                  Quotation #
                </th>
                <th className="px-4 py-4 font-medium text-gray-500 dark:text-gray-400">
                  Customer
                </th>
                <th className="px-4 py-4 font-medium text-gray-500 dark:text-gray-400">
                  Date
                </th>
                <th className="px-4 py-4 font-medium text-gray-500 dark:text-gray-400">
                  Valid Until
                </th>
                <th className="px-4 py-4 font-medium text-gray-500 dark:text-gray-400">
                  Sales Rep
                </th>
                <th className="px-4 py-4 text-right font-medium text-gray-500 dark:text-gray-400">
                  Amount
                </th>
                <th className="px-4 py-4 text-center font-medium text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-4 py-4 text-center font-medium text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-5 text-center">
                    <div className="flex items-center justify-center">
                      <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"></div>
                      <span className="ml-2">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-5 text-center">
                    No quotations found
                  </td>
                </tr>
              ) : (
                quotations.map((quotation) => (
                  <tr
                    key={quotation.id}
                    className="border-stroke dark:border-strokedark dark:hover:bg-meta-4/30 border-b hover:bg-gray-50"
                  >
                    <td className="px-4 py-4 font-medium">
                      {quotation.quotation_number}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium">
                        {quotation.customerName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {quotation.customerContact}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {formatDate(quotation.quotationDate)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {formatDate(quotation.validUntil)}
                    </td>
                    <td className="px-4 py-4">
                      {quotation.salesRepresentative}
                    </td>
                    <td className="px-4 py-4 text-right font-medium">
                      {formatCurrency(quotation.total)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadge(quotation.status)}`}
                      >
                        {quotation.status.charAt(0).toUpperCase() +
                          quotation.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center space-x-3.5">
                        <button
                          onClick={() => handleEditQuotation(quotation.task_id)}
                          className="text-primary hover:text-primary/80"
                          title="Edit quotation"
                        >
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            ></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleViewPdf(quotation.task_id)}
                          className="text-warning hover:text-warning/80"
                          title="View PDF"
                        >
                          {/* Replace the current download icon with a document/PDF icon */}
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="M12 11v6m-3-3h6"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() =>
                            handleStatusUpdate(quotation.task_id, "invoice")
                          }
                          className={`text-success hover:text-success/80 ${quotation.status === "accepted" ? "hidden" : ""}`}
                          title="Mark as Invoice"
                        >
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="M5 13l4 4L19 7"
                            ></path>
                          </svg>
                        </button>
                        <button
                          onClick={() =>
                            handleStatusUpdate(quotation.task_id, "draft")
                          }
                          className={`text-danger hover:text-danger/80 ${quotation.status === "history" ? "hidden" : ""}`}
                          title="Mark as Rejected"
                        >
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="M6 18L18 6M6 6l12 12"
                            ></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex flex-col items-center justify-between space-y-3 md:flex-row md:space-y-0">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {quotations.length > 0 ? (page - 1) * pageSize + 1 : 0} -{" "}
            {Math.min(page * pageSize, totalQuotations)} of {totalQuotations}{" "}
            quotations
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="border-stroke dark:border-strokedark rounded-md border p-2 disabled:opacity-50"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                ></path>
              </svg>
            </button>

            <span className="dark:bg-meta-4 rounded-md bg-gray-100 px-4 py-2">
              {page}
            </span>

            <button
              onClick={() => setPage(page + 1)}
              disabled={page * pageSize >= totalQuotations}
              className="border-stroke dark:border-strokedark rounded-md border p-2 disabled:opacity-50"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                ></path>
              </svg>
            </button>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1); // Reset to first page when changing page size
              }}
              className="border-stroke dark:border-strokedark rounded-md border bg-transparent px-2 py-1"
            >
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Edit Quotation Modal */}
      {isEditModalOpen && editingQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/50">
          <div className="dark:bg-boxdark mx-4 w-full max-w-4xl rounded-sm bg-white p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-black dark:text-white">
                Edit Quotation #{editingQuotation.quotation_number}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {updateError && (
              <div className="mb-4 rounded border border-red-400 bg-red-100 p-3 text-red-700">
                {updateError}
              </div>
            )}

            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* You can either implement a full form here or use an iframe */}
              {/* Option 1: iframe approach */}
              <iframe
                src={`/sales/quotation/auto?id=${editingQuotation.id}&modal=true`}
                className="h-[calc(100vh-200px)] w-full border-none"
              />

              {/* Option 2: Direct form implementation 
        <form id="editQuotationForm" onSubmit={(e) => {
          e.preventDefault();
          // Get form data and call handleUpdateQuotation
        }}>
          ... form fields ...
        </form>
        */}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="dark:bg-meta-4 dark:hover:bg-meta-3 rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="editQuotationForm" // Match this to your form's id if using Option 2
                className="bg-primary hover:bg-primary/90 rounded-md px-4 py-2 text-white"
                disabled={isLoadingQuotation}
              >
                {isLoadingQuotation ? (
                  <>
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Selection Modal */}
      {isPdfModalOpen && selectedTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/50">
          <div className="dark:bg-boxdark mx-4 w-full max-w-md rounded-sm bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-black dark:text-white">
                Select PDF
              </h3>
              <button
                onClick={() => setIsPdfModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {pdfFiles.map((file, index) => (
                  <li key={index} className="py-2">
                    <button
                      onClick={() => {
                        window.open(
                          `/api/sales/quotation/view-pdf?filePath=/sales/${selectedTaskId}/quotation/${file.name}`,
                          "_blank",
                        );
                        setIsPdfModalOpen(false);
                      }}
                      className="dark:hover:bg-meta-4 flex w-full items-center rounded px-2 py-2 text-left hover:bg-gray-100"
                    >
                      <svg
                        className="text-warning mr-2 h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M12 11v6m-3-3h6"
                        />
                      </svg>
                      <div>
                        <span className="block font-medium">
                          {file.name.length > 30
                            ? `${file.name.substring(0, 27)}...`
                            : file.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(file.lastModified).toLocaleString()}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setIsPdfModalOpen(false)}
                className="dark:bg-meta-4 dark:hover:bg-meta-3 rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DefaultLayout>
  );
}

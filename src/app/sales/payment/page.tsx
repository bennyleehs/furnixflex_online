"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import Link from "next/link";
import { Quotation, PaymentRecord } from "@/types/sales-quotation"; // Import Quotation interface

export default function QuotationListPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]); // fetch in array
  const [loading, setLoading] = useState(true);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  // const [statusFilter, setStatusFilter] = useState("all");
  const [salesRepFilter, setSalesRepFilter] = useState("");
  const [salesReps, setSalesReps] = useState<string[]>([]);

  // Payment stats
  const [totalPaid, setTotalPaid] = useState(0);
  const [balance, setBalance] = useState(0);
  const [paymentProgress, setPaymentProgress] = useState(0);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalQuotations, setTotalQuotations] = useState(0);

  // Add this with your other useState declarations at the top of your component
  const [generatingInv, setgeneratingInv] = useState(false);

  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfFiles, setPdfFiles] = useState<
    { name: string; lastModified: string }[]
  >([]);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(
    null,
  );

  // Fetch quotations with filters
  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      // Build query string with all filters
      let queryString = `?page=${page}&pageSize=${pageSize}&status=payment`;
      if (searchTerm) queryString += `&search=${searchTerm}`;
      if (dateRange.from) queryString += `&from=${dateRange.from}`;
      if (dateRange.to) queryString += `&to=${dateRange.to}`;
      if (salesRepFilter) queryString += `&salesRep=${salesRepFilter}`;

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
    // statusFilter,
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
    // setStatusFilter("all");
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
  // const formatDate = (dateString: string) => {
  //   const date = new Date(dateString);
  //   return date.toLocaleDateString("en-MY", {
  //     year: "numeric",
  //     month: "short",
  //     day: "numeric",
  //   });
  // };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return "N/A";

    // Replace space with 'T' to support "YYYY-MM-DD HH:mm:ss" formats
    const formattedString = dateString.replace(" ", "T");
    const date = new Date(formattedString);

    // Check if the date is actually valid
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

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
      case "partial":
        return "bg-yellow-100 text-yellow-800";
      case "paid":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Handle generating payment statement PDF
  const handleGeneratePaymentStatement = async (quotationId: string) => {
    try {
      setgeneratingInv(true);
      setSelectedQuotationId(quotationId);

      // Fetch quotation details
      const quotationResponse = await fetch(
        `/api/sales/quotation?quotationId=${quotationId}`,
      );
      if (!quotationResponse.ok) {
        throw new Error("Failed to fetch quotation details");
      }
      const quotationData = await quotationResponse.json();

      // Fetch payment records
      const paymentResponse = await fetch(
        `/api/sales/payment?quotationId=${quotationId}`,
      );
      if (!paymentResponse.ok) {
        throw new Error("Failed to fetch payment records");
      }
      const paymentData = await paymentResponse.json();

      if (!quotationData.quotation) {
        throw new Error("No quotation found");
      }

      const quotation = quotationData.quotation;
      const paymentRecords = paymentData.payments || [];

      // Calculate payment summary
      const totalPaid = paymentRecords.reduce(
        (sum: number, payment: PaymentRecord) =>
          sum + (payment.amount_inv || 0),
        0,
      );
      const balance = quotation.total - totalPaid;
      const paymentProgress =
        quotation.total > 0 ? (totalPaid / quotation.total) * 100 : 0;

      const statementData = {
        task_id: quotation.task_id,

        // Customer info
        customer_name: quotation.customer_name || "",
        customer_nric: quotation.customer_nric || "",
        customer_contact: quotation.customer_contact || "",
        customer_email: quotation.customer_email || "",
        customer_address: quotation.customer_address || "",
        customer_property: quotation.customer_property || "",
        customer_guard: quotation.customer_guard || "",
        sales_representative: quotation.sales_representative || "",
        sales_uid: quotation.sales_uid || "",

        // Quotation details
        quotation_number: quotation.quotation_number || "",
        quotation_date: quotation.quotation_date || "",
        quotation_total: quotation.total || 0,

        // Payment summary
        total_paid: totalPaid || 0,
        balance: balance || 0,
        payment_progress: paymentProgress || 0,

        // Payment records
        payments: paymentRecords.map((payment: PaymentRecord) => ({
          id: payment.id,
          invoice_number: payment.invoice_number || "",
          payment_date: payment.payment_date,
          payment_reference: payment.payment_reference,
          payment_method: payment.payment_method,
          amount: payment.amount_inv,
          balance: payment.balance,
          received: payment.received,
          received_date: payment.received_date,
          notes: payment.notes,
        })),

        // Company info
        company: {
          name: "CLASSYPRO Aluminium Kitchen",
          address: `3, Jalan Empire 2, Taman Perindustrian Empire Park, 81550 Gelang Patah, Johor Darul Ta'zim`,
          phone: "+6016-8866001",
          email: "inquiry@classy-pro.com",
          website: "www.classy-pro.com",
          logo: "/images/logo/classy_logo_gray.png",
        },

        // PDF format
        format: {
          pageSize: "A4",
          orientation: "portrait",
          margins: { top: 50, right: 50, bottom: 50, left: 50 },
          header: true,
          footer: true,
          tableLines: true,
          currencySymbol: "RM",
        },

        // Statement specific
        statement_date: new Date().toISOString().split("T")[0],
        statement_title: `Payment Statement - ${quotation.quotation_number}`,
      };

      // Call the API endpoint to generate PDF
      const response = await fetch("/api/sales/payment/generate-statement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(statementData),
      });

      if (!response.ok) {
        throw new Error("Failed to generate payment statement");
      }

      // Get PDF blob and trigger download
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Payment_Statement_${quotation.quotation_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      // Show success message
      // alert('Payment statement generated successfully');
    } catch (error) {
      console.error("Error generating payment statement:", error);
      alert(
        "Failed to generate payment statement: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    } finally {
      setgeneratingInv(false);
    }
  };

  // Update task db (customers) status
  async function updateDBTaskStatus(taskId: string, status: string) {
    try {
      const response = await fetch("/api/sales/task", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: taskId,
          status: status,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error updating status:", error);
      throw error;
    }
  }

  // Function to update status
  const handleStatusUpdate = async (taskId: string, status: string) => {
    if (!taskId) {
      alert("No task ID associated with this quotation");
      return;
    }

    try {
      // For other statuses, proceed as before
      const response = await fetch(`/api/sales/quotation?taskId=${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (status === "draft") {
        await updateDBTaskStatus(taskId, "Quotation");

        const formData = new FormData();
        formData.append("id", taskId);
        formData.append("status", "Quotation");
        formData.append("oldStatus", "Payment");
        formData.append("notes", "Payment update to Quotation draft");
        formData.append("userName", "Current User"); // Replace with actual username

        await fetch(`/api/sales/task/update`, {
          method: "POST",
          body: formData,
        });

        alert(`Payment update to Quotation ${status}`);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }

      // alert(`Payment change to Quotation draft ${status}`);
      fetchQuotations();
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
      {/* <div className="mb-6 flex flex-col items-center justify-between md:flex-row">
        <Breadcrumb pageName="Payments" noHeader={true}/>

      </div> */}

      <Breadcrumb pageName="Payments" />

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
          <div className="dark:scheme-dark">
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
          <div className="dark:scheme-dark">
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
          </div>
        </form>
        {/* Search and Reset Buttons */}
        <div className="flex items-end space-x-2 pt-4 md:col-span-2">
          {/* <button
            type="submit"
            className="bg-primary hover:bg-primary/90 cursor-pointer rounded-md px-4 py-2 text-white transition"
          >
            Search
          </button> */}

          <button
            type="button"
            onClick={resetFilters}
            className="dark:bg-meta-4 dark:hover:bg-primary/90 hover:bg-primary cursor-pointer rounded-md bg-gray-200 px-4 py-2 text-gray-700 transition hover:text-white dark:text-white"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-xs border bg-white px-5 pt-6 pb-2.5">
        <div className="pb-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1); // Reset to first page when changing page size
            }}
            className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary rounded-sm border bg-transparent px-2 py-1 outline-hidden transition"
          >
            <option value="10">10 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>
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
                  Sales Rep
                </th>
                <th className="px-4 py-4 text-right font-medium text-gray-500 dark:text-gray-400">
                  Amount
                </th>
                {/* New Paid column */}
                <th className="px-4 py-4 text-right font-medium text-gray-500 dark:text-gray-400">
                  Paid
                </th>
                {/* New Balance column */}
                <th className="px-4 py-4 text-right font-medium text-gray-500 dark:text-gray-400">
                  Balance
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
                  <td colSpan={9} className="px-4 py-5 text-center">
                    <div className="flex items-center justify-center">
                      <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"></div>
                      <span className="ml-2">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-5 text-center">
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
                        {quotation.customer_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {quotation.customer_contact}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {/* {formatDate(quotation.quotation_date)} */}
                      {formatDate(quotation.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      {quotation.sales_representative}
                    </td>
                    <td className="px-4 py-4 text-right font-medium">
                      {formatCurrency(quotation.total)}
                    </td>
                    {/* New Paid cell */}
                    <td className="text-success px-4 py-4 text-right font-medium">
                      {formatCurrency(quotation.paid || 0)}
                    </td>
                    {/* New Balance cell */}
                    <td className="text-meta-10 px-4 py-4 text-right font-medium">
                      {formatCurrency(
                        (quotation.total || 0) - (quotation.paid || 0),
                      )}
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
                        <Link
                          href={`/sales/payment/auto?quotationId=${quotation.quotation_number}&taskId=${quotation.task_id}`}
                          onClick={() =>
                            handleStatusUpdate(quotation.task_id, "payment")
                          }
                          className={`text-success hover:text-success/80 cursor-pointer ${quotation.status === "done" ? "hidden" : ""}`}
                          title="Track Payments"
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
                              strokeWidth="1.5"
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            ></path>
                          </svg>
                        </Link>
                        <button
                          onClick={() =>
                            handleGeneratePaymentStatement(
                              quotation.quotation_number,
                            )
                          }
                          disabled={
                            generatingInv &&
                            selectedQuotationId === quotation.quotation_number
                          }
                          className="text-warning hover:text-warning/80 relative cursor-pointer"
                          title="Print Statement"
                        >
                          {generatingInv &&
                          selectedQuotationId === quotation.quotation_number ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="border-warning h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                            </div>
                          ) : (
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
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() =>
                            handleStatusUpdate(quotation.task_id, "draft")
                          }
                          className={`text-danger hover:text-danger/80 cursor-pointer ${quotation.status === "history" ? "hidden" : ""}`}
                          title="Mark as Rejected"
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
            payments
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
          </div>
        </div>
      </div>

      {/* PDF Selection Modal */}
      {isPdfModalOpen && selectedQuotationId && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black">
          <div className="dark:bg-boxdark mx-4 w-full max-w-lg rounded-sm bg-white p-6 shadow-lg">
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
                          `/api/sales/quotation/view-pdf?filePath=/sales/${selectedQuotationId}/quotation/${file.name}`,
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

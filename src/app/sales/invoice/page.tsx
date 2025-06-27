'use client';

import { useState, useEffect, SetStateAction } from 'react';
import DefaultLayout from '@/components/Layouts/DefaultLayout';
import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Datepicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface Invoice {
  id: string | number;
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  customer_email: string;
  total: number | string;
  status: string;
  due_date: string;
}

export default function InvoiceListPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Filter state
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<{
    startDate: string | null;
    endDate: string | null;
  }>({
    startDate: null,
    endDate: null,
  });
  const [status, setStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Get current date for display
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    fetchInvoices();
  }, [page, pageSize, status]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      
      if (search) params.append('search', search);
      if (dateRange.startDate) params.append('from', dateRange.startDate);
      if (dateRange.endDate) params.append('to', dateRange.endDate);
      if (status !== 'all') params.append('status', status);

      const response = await fetch(`/api/sales/invoice?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      
      const data = await response.json();
      setInvoices(data.invoices || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setPage(1); // Reset to first page when searching
    fetchInvoices();
  };
  
  const handleDateRangeChange = (range: SetStateAction<{ startDate: string | null; endDate: string | null; }>) => {
    setDateRange(range);
  };

  const handleFilterApply = () => {
    setPage(1); // Reset to first page when applying filters
    fetchInvoices();
    setShowFilters(false);
  };

  const handleFilterReset = () => {
    setSearch('');
    setDateRange({ startDate: null, endDate: null });
    setStatus('all');
    setPage(1);
    fetchInvoices();
    setShowFilters(false);
  };

  const handleExportCSV = async () => {
    try {
      // Build query parameters for export (all data, not paginated)
      const params = new URLSearchParams();
      params.append('export', 'csv');
      if (search) params.append('search', search);
      if (dateRange.startDate) params.append('from', dateRange.startDate);
      if (dateRange.endDate) params.append('to', dateRange.endDate);
      if (status !== 'all') params.append('status', status);

      const response = await fetch(`/api/sales/invoice/export?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to export invoices');
      }
      
      // Download the CSV file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `invoices-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting invoices:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      alert(`Failed to export invoices: ${errorMessage}`);
    }
  };

  // Get status badge color
  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format currency
  const formatCurrency = (amount: string | number | bigint) => {
    try {
      // Convert string or bigint to number if needed
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
      
      // Format the number as currency
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numAmount);
    } catch (err) {
      console.error('Error formatting currency:', err);
      // Return a fallback format in case of error
      return `$${amount}`;
    }
  };

  return (
    <DefaultLayout>
      <div className="mx-auto">
        <Breadcrumb pageName="Invoices" noHeader={true}/>

        <div className="rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
          {/* Header with actions */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-title-md2 font-bold text-black dark:text-white">
              Invoices
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => router.push('/sales/invoice/new')}
                className="inline-flex items-center gap-2.5 rounded-md bg-primary px-4 py-2 font-medium text-white hover:bg-opacity-90"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                New Invoice
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-2.5 rounded-md border border-stroke px-4 py-2 font-medium hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                Filter
              </button>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2.5 rounded-md border border-stroke px-4 py-2 font-medium hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Export
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="mb-4.5">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search by invoice #, customer, or amount..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-stroke bg-transparent py-3 pl-4 pr-12 outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:focus:border-primary"
              />
              <button type="submit" className="absolute right-4 top-3.5">
                <svg className="h-5 w-5 text-body dark:text-bodydark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
            </form>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="mb-6 rounded-lg border border-stroke bg-white p-4 dark:border-strokedark dark:bg-boxdark">
              <h3 className="mb-3 text-lg font-semibold text-black dark:text-white">
                Filter Options
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.startDate || ''}
                    onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                    className="w-full rounded-lg border border-stroke bg-transparent py-3 pl-4 pr-12 outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.endDate || ''}
                    onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                    className="w-full rounded-lg border border-stroke bg-transparent py-3 pl-4 pr-12 outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-lg border border-stroke bg-transparent py-3 pl-4 pr-12 outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:focus:border-primary"
                  >
                    <option value="all">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="partial">Partially Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={handleFilterApply}
                  className="rounded-md bg-primary px-4 py-2 font-medium text-white hover:bg-opacity-90"
                >
                  Apply Filters
                </button>
                <button
                  onClick={handleFilterReset}
                  className="rounded-md border border-stroke px-4 py-2 font-medium hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Invoices Table */}
          <div className="max-w-full overflow-x-auto">
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
              </div>
            ) : error ? (
              <div className="flex h-40 items-center justify-center">
                <p className="text-lg text-danger">{error}</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center">
                <p className="text-lg text-body dark:text-bodydark">No invoices found</p>
                <p className="mt-1 text-sm text-body dark:text-bodydark">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            ) : (
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-2 text-left dark:bg-meta-4">
                    <th className="py-4 px-4 font-medium text-black dark:text-white xl:pl-11">
                      Invoice #
                    </th>
                    <th className="py-4 px-4 font-medium text-black dark:text-white">
                      Date
                    </th>
                    <th className="py-4 px-4 font-medium text-black dark:text-white">
                      Customer
                    </th>
                    <th className="py-4 px-4 font-medium text-black dark:text-white">
                      Amount
                    </th>
                    <th className="py-4 px-4 font-medium text-black dark:text-white">
                      Status
                    </th>
                    <th className="py-4 px-4 font-medium text-black dark:text-white">
                      Due Date
                    </th>
                    <th className="py-4 px-4 font-medium text-black dark:text-white">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice, index) => (
                    <tr key={invoice.id} className="border-b border-[#eee] dark:border-strokedark">
                      <td className="py-5 px-4 pl-9 xl:pl-11">
                        <Link href={`/sales/invoice/${invoice.id}`} className="text-primary hover:underline">
                          {invoice.invoice_number}
                        </Link>
                      </td>
                      <td className="py-5 px-4">
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </td>
                      <td className="py-5 px-4">
                        <h5 className="font-medium text-black dark:text-white">
                          {invoice.customer_name}
                        </h5>
                        <p className="text-sm">{invoice.customer_email}</p>
                      </td>
                      <td className="py-5 px-4">
                        <span className="text-black dark:text-white">
                          {formatCurrency(invoice.total)}
                        </span>
                      </td>
                      <td className="py-5 px-4">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${getStatusBadgeClass(invoice.status)}`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-5 px-4">
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </td>
                      <td className="py-5 px-4">
                        <div className="flex items-center space-x-3.5">
                          <Link href={`/sales/invoice/${invoice.id}`} className="hover:text-primary">
                            <svg
                              className="fill-current"
                              width="18"
                              height="18"
                              viewBox="0 0 18 18"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M8.99981 14.8219C3.43106 14.8219 0.674805 9.50624 0.562305 9.28124C0.47793 9.11249 0.47793 8.88749 0.562305 8.71874C0.674805 8.49374 3.43106 3.20624 8.99981 3.20624C14.5686 3.20624 17.3248 8.49374 17.4373 8.71874C17.5217 8.88749 17.5217 9.11249 17.4373 9.28124C17.3248 9.50624 14.5686 14.8219 8.99981 14.8219ZM1.85605 8.99999C2.4748 10.0406 4.89356 13.5562 8.99981 13.5562C13.1061 13.5562 15.5248 10.0406 16.1436 8.99999C15.5248 7.95936 13.1061 4.44374 8.99981 4.44374C4.89356 4.44374 2.4748 7.95936 1.85605 8.99999Z"
                                fill=""
                              />
                              <path
                                d="M9 11.3906C7.67812 11.3906 6.60938 10.3219 6.60938 9C6.60938 7.67813 7.67812 6.60938 9 6.60938C10.3219 6.60938 11.3906 7.67813 11.3906 9C11.3906 10.3219 10.3219 11.3906 9 11.3906ZM9 7.875C8.38125 7.875 7.875 8.38125 7.875 9C7.875 9.61875 8.38125 10.125 9 10.125C9.61875 10.125 10.125 9.61875 10.125 9C10.125 8.38125 9.61875 7.875 9 7.875Z"
                                fill=""
                              />
                            </svg>
                          </Link>
                          <Link
                            href={`/api/sales/invoice/pdf/${invoice.id}`}
                            target="_blank"
                            className="hover:text-primary"
                          >
                            <svg
                              className="fill-current"
                              width="18"
                              height="18"
                              viewBox="0 0 18 18"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M16.8754 11.6719C16.5379 11.6719 16.2285 11.9531 16.2285 12.3187V14.8219C16.2285 15.075 16.0316 15.2719 15.7785 15.2719H2.22227C1.96914 15.2719 1.77227 15.075 1.77227 14.8219V12.3187C1.77227 11.9812 1.49102 11.6719 1.12539 11.6719C0.759766 11.6719 0.478516 11.9531 0.478516 12.3187V14.8219C0.478516 15.7781 1.23789 16.5375 2.19414 16.5375H15.7785C16.7348 16.5375 17.4941 15.7781 17.4941 14.8219V12.3187C17.5223 11.9531 17.2129 11.6719 16.8754 11.6719Z"
                                fill=""
                              />
                              <path
                                d="M8.55074 12.3469C8.66324 12.4594 8.83199 12.5156 9.00074 12.5156C9.16949 12.5156 9.31012 12.4594 9.45074 12.3469L13.4726 8.43752C13.7257 8.1844 13.7257 7.79065 13.5007 7.53752C13.2476 7.2844 12.8539 7.2844 12.6007 7.5094L9.64762 10.4063V2.1094C9.64762 1.7719 9.36637 1.46252 9.00074 1.46252C8.66324 1.46252 8.35387 1.74377 8.35387 2.1094V10.4063L5.40074 7.53752C5.14762 7.2844 4.75387 7.31252 4.50074 7.53752C4.24762 7.79065 4.27574 8.1844 4.50074 8.43752L8.55074 12.3469Z"
                                fill=""
                              />
                            </svg>
                          </Link>
                          <button
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this invoice?")) {
                                // Handle delete
                              }
                            }}
                            className="hover:text-danger"
                          >
                            <svg
                              className="fill-current"
                              width="18"
                              height="18"
                              viewBox="0 0 18 18"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M13.7535 2.47502H11.5879V1.9969C11.5879 1.15315 10.9129 0.478149 10.0691 0.478149H7.90352C7.05977 0.478149 6.38477 1.15315 6.38477 1.9969V2.47502H4.21914C3.40352 2.47502 2.72852 3.15002 2.72852 3.96565V4.8094C2.72852 5.42815 3.09414 5.9344 3.62852 6.1594L4.07852 15.4688C4.13477 16.6219 5.09102 17.5219 6.24414 17.5219H11.7004C12.8535 17.5219 13.8098 16.6219 13.866 15.4688L14.3441 6.13127C14.8785 5.90627 15.2441 5.3719 15.2441 4.78127V3.93752C15.2441 3.15002 14.5691 2.47502 13.7535 2.47502ZM7.67852 1.9969C7.67852 1.85627 7.79102 1.74377 7.93164 1.74377H10.0973C10.2379 1.74377 10.3504 1.85627 10.3504 1.9969V2.47502H7.70664V1.9969H7.67852ZM4.02227 3.96565C4.02227 3.85315 4.10664 3.74065 4.24727 3.74065H13.7535C13.866 3.74065 13.9785 3.82502 13.9785 3.96565V4.8094C13.9785 4.9219 13.8941 5.0344 13.7535 5.0344H4.24727C4.13477 5.0344 4.02227 4.95002 4.02227 4.8094V3.96565ZM11.7285 16.2563H6.27227C5.79414 16.2563 5.40039 15.8906 5.37227 15.3844L4.95039 6.2719H13.0785L12.6566 15.3844C12.6004 15.8625 12.2066 16.2563 11.7285 16.2563Z"
                                fill=""
                              />
                              <path
                                d="M9.00039 9.11255C8.66289 9.11255 8.35352 9.3938 8.35352 9.75942V13.3313C8.35352 13.6688 8.63477 13.9782 9.00039 13.9782C9.33789 13.9782 9.64727 13.6969 9.64727 13.3313V9.75942C9.64727 9.3938 9.33789 9.11255 9.00039 9.11255Z"
                                fill=""
                              />
                              <path
                                d="M10.8754 9.11255C10.5379 9.11255 10.2285 9.3938 10.2285 9.75942V13.3313C10.2285 13.6688 10.5098 13.9782 10.8754 13.9782C11.2129 13.9782 11.5223 13.6969 11.5223 13.3313V9.75942C11.5223 9.3938 11.2129 9.11255 10.8754 9.11255Z"
                                fill=""
                              />
                              <path
                                d="M7.12545 9.11255C6.78795 9.11255 6.47858 9.3938 6.47858 9.75942V13.3313C6.47858 13.6688 6.75983 13.9782 7.12545 13.9782C7.46295 13.9782 7.77233 13.6969 7.77233 13.3313V9.75942C7.77233 9.3938 7.46295 9.11255 7.12545 9.11255Z"
                                fill=""
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {!loading && !error && invoices.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-between py-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-body dark:text-bodydark">
                  Showing {(page - 1) * pageSize + 1} to{' '}
                  {Math.min(page * pageSize, total)} of {total} invoices
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className={`flex h-9 min-w-[36px] items-center justify-center rounded-md border border-stroke px-4 text-sm hover:border-primary hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4 ${
                    page === 1
                      ? 'cursor-not-allowed opacity-50'
                      : 'cursor-pointer'
                  }`}
                >
                  Previous
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, Math.ceil(total / pageSize)) }, (_, i) => {
                  // Logic to show correct page numbers when many pages exist
                  let pageNum;
                  const totalPages = Math.ceil(total / pageSize);
                  
                  if (totalPages <= 5) {
                    // If 5 or fewer pages, show all page numbers
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    // If current page is among first 3, show pages 1-5
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    // If current page is among last 3, show last 5 pages
                    pageNum = totalPages - 4 + i;
                  } else {
                    // Otherwise, show 2 pages before and after current page
                    pageNum = page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`flex h-9 min-w-[36px] items-center justify-center rounded-md border ${
                        page === pageNum
                          ? 'border-primary bg-primary text-white'
                          : 'border-stroke hover:border-primary hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4'
                      } px-4 text-sm`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setPage(Math.min(Math.ceil(total / pageSize), page + 1))}
                  disabled={page === Math.ceil(total / pageSize)}
                  className={`flex h-9 min-w-[36px] items-center justify-center rounded-md border border-stroke px-4 text-sm hover:border-primary hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4 ${
                    page === Math.ceil(total / pageSize)
                      ? 'cursor-not-allowed opacity-50'
                      : 'cursor-pointer'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DefaultLayout>
  );
}
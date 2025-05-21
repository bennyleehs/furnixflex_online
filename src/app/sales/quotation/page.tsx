'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import Link from 'next/link';

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
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  quote_ref: string;
  quotation_number: string;
  created_at: string;
}

export default function QuotationListPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [statusFilter, setStatusFilter] = useState('all');
  const [salesRepFilter, setSalesRepFilter] = useState('');
  const [salesReps, setSalesReps] = useState<string[]>([]);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalQuotations, setTotalQuotations] = useState(0);
  
  // Fetch quotations with filters
  const fetchQuotations = async () => {
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
      
      if (statusFilter !== 'all') {
        queryString += `&status=${statusFilter}`;
      }
      
      if (salesRepFilter) {
        queryString += `&salesRep=${encodeURIComponent(salesRepFilter)}`;
      }
      
      const response = await fetch(`/api/sales/quotation/list${queryString}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch quotations');
      }
      
      const data = await response.json();
      setQuotations(data.quotations);
      setTotalQuotations(data.total);
      
      // Extract unique sales reps for the filter dropdown
      if (data.salesReps) {
        setSalesReps(data.salesReps);
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchQuotations();
  }, [page, pageSize, statusFilter, dateRange.from, dateRange.to, salesRepFilter]);
  
  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page
    fetchQuotations();
  };
  
  // Handle reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setDateRange({ from: '', to: '' });
    setStatusFilter('all');
    setSalesRepFilter('');
    setPage(1);
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <DefaultLayout>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <Breadcrumb pageName="Quotations" />
        
        <div className="mt-4 md:mt-0">
          <Link
            href="/sales/quotation/auto"
            className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Create New Quotation
          </Link>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="mb-6 rounded-xs border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by quote #, customer..."
              className="w-full rounded-sm border-[1.5px] border-stroke bg-transparent py-2 px-4 text-sm outline-hidden transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary"
            />
          </div>
          
          {/* Date Range From */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Date From</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
              className="w-full rounded-sm border-[1.5px] border-stroke bg-transparent py-2 px-4 text-sm outline-hidden transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary"
            />
          </div>
          
          {/* Date Range To */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Date To</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
              className="w-full rounded-sm border-[1.5px] border-stroke bg-transparent py-2 px-4 text-sm outline-hidden transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary"
            />
          </div>
          
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-sm border-[1.5px] border-stroke bg-transparent py-2 px-4 text-sm outline-hidden transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary"
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
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Sales Representative</label>
            <select
              value={salesRepFilter}
              onChange={(e) => setSalesRepFilter(e.target.value)}
              className="w-full rounded-sm border-[1.5px] border-stroke bg-transparent py-2 px-4 text-sm outline-hidden transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary"
            >
              <option value="">All Representatives</option>
              {salesReps.map((rep) => (
                <option key={rep} value={rep}>{rep}</option>
              ))}
            </select>
          </div>
          
          {/* Search and Reset Buttons */}
          <div className="flex items-end space-x-2 md:col-span-2">
            <button
              type="submit"
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition"
            >
              Search
            </button>
            
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition dark:bg-meta-4 dark:hover:bg-meta-3 dark:text-gray-300"
            >
              Reset Filters
            </button>
          </div>
        </form>
      </div>
      
      {/* Quotations Table */}
      <div className="rounded-xs border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-50 dark:bg-meta-4 text-left">
                <th className="py-4 px-4 font-medium text-gray-500 dark:text-gray-400">Quotation #</th>
                <th className="py-4 px-4 font-medium text-gray-500 dark:text-gray-400">Customer</th>
                <th className="py-4 px-4 font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="py-4 px-4 font-medium text-gray-500 dark:text-gray-400">Valid Until</th>
                <th className="py-4 px-4 font-medium text-gray-500 dark:text-gray-400">Sales Rep</th>
                <th className="py-4 px-4 font-medium text-gray-500 dark:text-gray-400 text-right">Amount</th>
                <th className="py-4 px-4 font-medium text-gray-500 dark:text-gray-400 text-center">Status</th>
                <th className="py-4 px-4 font-medium text-gray-500 dark:text-gray-400 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-5 px-4 text-center">
                    <div className="flex items-center justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      <span className="ml-2">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-5 px-4 text-center">
                    No quotations found
                  </td>
                </tr>
              ) : (
                quotations.map((quotation) => (
                  <tr key={quotation.id} className="border-b border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4/30">
                    <td className="py-4 px-4 font-medium">
                      {quotation.quotation_number}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium">{quotation.customerName}</div>
                      <div className="text-sm text-gray-500">{quotation.customerContact}</div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {formatDate(quotation.quotationDate)}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {formatDate(quotation.validUntil)}
                    </td>
                    <td className="py-4 px-4">
                      {quotation.salesRepresentative}
                    </td>
                    <td className="py-4 px-4 text-right font-medium">
                      {formatCurrency(quotation.total)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(quotation.status)}`}>
                        {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center space-x-3.5">
                        <Link
                          href={`/sales/quotation?id=${quotation.id}`}
                          className="text-primary hover:text-primary/80"
                          title="Edit quotation"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                          </svg>
                        </Link>
                        <button
                          onClick={() => router.push(`/api/sales/quotation/pdf?id=${quotation.id}`)}
                          className="text-warning hover:text-warning/80"
                          title="Generate PDF"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Are you sure you want to mark this quotation as accepted?')) {
                              try {
                                const response = await fetch(`/api/sales/quotation/status`, {
                                  method: 'PUT',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    id: quotation.id,
                                    status: 'accepted'
                                  }),
                                });
                                
                                if (response.ok) {
                                  fetchQuotations();
                                }
                              } catch (error) {
                                console.error('Error updating status:', error);
                              }
                            }
                          }}
                          className={`text-success hover:text-success/80 ${quotation.status === 'accepted' ? 'hidden' : ''}`}
                          title="Mark as Accepted"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13l4 4L19 7"></path>
                          </svg>
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Are you sure you want to mark this quotation as rejected?')) {
                              try {
                                const response = await fetch(`/api/sales/quotation/status`, {
                                  method: 'PUT',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    id: quotation.id,
                                    status: 'rejected'
                                  }),
                                });
                                
                                if (response.ok) {
                                  fetchQuotations();
                                }
                              } catch (error) {
                                console.error('Error updating status:', error);
                              }
                            }
                          }}
                          className={`text-danger hover:text-danger/80 ${quotation.status === 'rejected' ? 'hidden' : ''}`}
                          title="Mark as Rejected"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"></path>
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
        <div className="flex flex-col md:flex-row justify-between items-center mt-4 space-y-3 md:space-y-0">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {quotations.length > 0 ? (page - 1) * pageSize + 1 : 0} - {Math.min(page * pageSize, totalQuotations)} of {totalQuotations} quotations
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 border border-stroke dark:border-strokedark rounded-md disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>
            
            <span className="px-4 py-2 bg-gray-100 dark:bg-meta-4 rounded-md">
              {page}
            </span>
            
            <button
              onClick={() => setPage(page + 1)}
              disabled={page * pageSize >= totalQuotations}
              className="p-2 border border-stroke dark:border-strokedark rounded-md disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
            
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1); // Reset to first page when changing page size
              }}
              className="px-2 py-1 border border-stroke dark:border-strokedark rounded-md bg-transparent"
            >
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}
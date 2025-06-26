'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

// Invoice item interface
interface InvoiceItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  unit?: string;
}

// Payment interface
interface Payment {
  id?: number;
  date: string;
  amount: number;
  method: string;
  reference: string;
  notes?: string;
  gateway?: string;
  status?: string;
}

// Bank details interface
interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  swiftCode: string;
}

// Invoice interface
interface Invoice {
  reference: string;
  id?: number;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  customerName: string;
  customerContact: string;
  customerEmail: string;
  customerAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
  terms: string;
  status: string;
  quotationId?: string;
  jobOrderId?: string;
  taskId?: string;
  payments: Payment[];
  amountPaid: number;
  balance: number;
  enableOnlinePayment: boolean;
  paymentGateway: string;
  bankDetails?: BankDetails;
  created_at?: string;
  updated_at?: string;
}

// Payment status badge component
const PaymentStatusBadge = ({ status, paid, total }: { status: string; paid: number; total: number }) => {
  let badgeClass = '';
  let statusText = '';
  
  if (status === 'paid' || paid >= total) {
    badgeClass = 'bg-success/10 text-success';
    statusText = 'Paid';
  } else if (status === 'overdue') {
    badgeClass = 'bg-danger/10 text-danger';
    statusText = 'Overdue';
  } else if (paid > 0) {
    badgeClass = 'bg-warning/10 text-warning';
    statusText = 'Partial';
  } else if (status === 'sent') {
    badgeClass = 'bg-info/10 text-info';
    statusText = 'Sent';
  } else {
    badgeClass = 'bg-gray-100 text-gray-600 dark:bg-meta-4 dark:text-gray-300';
    statusText = 'Draft';
  }
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
      {statusText}
    </span>
  );
};

export default function InvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quotationId = searchParams.get('quotationId');
  const jobOrderId = searchParams.get('jobOrderId');
  const taskId = searchParams.get('taskId');
  const invoiceId = searchParams.get('id');
  
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!!invoiceId);
  const [invoiceData, setInvoiceData] = useState<Invoice>({
    reference: '',
    invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 30 days
    customerName: '',
    customerContact: '',
    customerEmail: '',
    customerAddress: '',
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    notes: '',
    terms: 'Payment is due within 30 days. Late payments are subject to a 5% fee.',
    status: 'draft',
    quotationId: quotationId || '',
    jobOrderId: jobOrderId || '',
    taskId: taskId || '',
    // Payment tracking fields
    payments: [],
    amountPaid: 0,
    balance: 0,
    // Payment gateway options
    enableOnlinePayment: false,
    paymentGateway: 'stripe',
    bankDetails: {
      bankName: '',
      accountNumber: '',
      accountName: '',
      swiftCode: ''
    }
  });
  
  // Fetch invoice data if editing
  useEffect(() => {
    if (invoiceId) {
      fetchInvoice(invoiceId);
    } else if (quotationId) {
      fetchQuotationData(quotationId);
    } else if (taskId) {
      fetchCustomerData(taskId);
    }
  }, [invoiceId, quotationId, taskId]);
  
  // Fetch invoice data for editing
  const fetchInvoice = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sales/invoice?id=${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch invoice');
      }
      
      const data = await response.json();
      if (data.invoice) {
        // Format dates properly
        const invoice = {
          ...data.invoice,
          invoiceDate: data.invoice.invoice_date || data.invoice.invoiceDate || new Date().toISOString().split('T')[0],
          dueDate: data.invoice.due_date || data.invoice.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          payments: data.invoice.payments || [],
          amountPaid: data.invoice.amountPaid || 0,
          balance: data.invoice.balance || data.invoice.total || 0,
          enableOnlinePayment: data.invoice.enableOnlinePayment || false,
          paymentGateway: data.invoice.paymentGateway || 'stripe',
        };
        
        setInvoiceData(invoice);
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      alert('Failed to fetch invoice details');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch quotation data to pre-fill invoice
  const fetchQuotationData = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sales/quotation?id=${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch quotation');
      }
      
      const data = await response.json();
      if (data.quotation) {
        const quotation = data.quotation;
        
        // Map quotation items to invoice items
        const items = quotation.items?.map((item: { description: any; quantity: any; unit_price: any; unitPrice: any; amount: any; unit: any; }) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unit_price || item.unitPrice,
          amount: item.amount,
          unit: item.unit
        })) || [];
        
        // Calculate totals
        const subtotal = items.reduce((sum: any, item: { amount: any; }) => sum + (item.amount || 0), 0);
        const tax = subtotal * 0.06; // 6% tax
        const total = subtotal + tax;
        
        setInvoiceData({
          ...invoiceData,
          customerName: quotation.customer_name || '',
          customerContact: quotation.customer_contact || '',
          customerEmail: quotation.customer_email || '',
          customerAddress: quotation.customer_address || '',
          quotationId: id,
          taskId: quotation.task_id || taskId || '',
          items: items,
          subtotal: subtotal,
          tax: tax,
          total: total,
          balance: total
        });
      }
    } catch (error) {
      console.error('Error fetching quotation:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch customer data from task
  const fetchCustomerData = async (task_id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sales/tasks?taskId=${task_id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch customer data');
      }
      
      const data = await response.json();
      if (data.task) {
        const task = data.task;
        
        setInvoiceData({
          ...invoiceData,
          customerName: task.customer_name || '',
          customerContact: task.phone || task.contact || '',
          customerEmail: task.email || '',
          customerAddress: task.address || '',
          taskId: task_id,
        });
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Validate items
      if (invoiceData.items.length === 0) {
        alert("Please add at least one item to the invoice");
        setLoading(false);
        return;
      }
      
      // Calculate payment totals to ensure they're correct
      let totalPaid = 0;
      if (invoiceData.payments && invoiceData.payments.length > 0) {
        totalPaid = invoiceData.payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
      }
      
      const balance = invoiceData.total - totalPaid;
      
      // Determine invoice status based on payments
      let status = invoiceData.status;
      if (totalPaid >= invoiceData.total) {
        status = 'paid';
      } else if (totalPaid > 0 && status !== 'overdue') {
        status = 'partial';
      }
      
      // Prepare data for API
      const invoiceToSave = {
        ...invoiceData,
        status: status,
        subtotal: Number(invoiceData.subtotal),
        tax: Number(invoiceData.tax),
        total: Number(invoiceData.total),
        amountPaid: totalPaid,
        balance: balance,
        items: invoiceData.items.map(item => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          amount: Number(item.amount)
        })),
        payments: invoiceData.payments ? invoiceData.payments.map(payment => ({
          ...payment,
          amount: Number(payment.amount)
        })) : []
      };
      
      // API endpoint and method
      const url = isEditing ? `/api/sales/invoice?id=${invoiceId}` : '/api/sales/invoice';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceToSave),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} invoice`);
      }
      
      const result = await response.json();
      
      // Show success message
      alert(`Invoice ${isEditing ? 'updated' : 'created'} successfully!`);
      
      // Redirect to invoice list or view
      router.push('/sales/invoices');
      
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} invoice:`, error);
      alert(`Failed to ${isEditing ? 'update' : 'create'} invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <DefaultLayout>
      <div className="mx-auto">
        <Breadcrumb pageName={isEditing ? "Edit Invoice" : "Create Invoice"} noHeader={true}/>
        
        <div className="bg-white dark:bg-boxdark rounded-sm shadow-default p-6 mb-8">
          <h2 className="text-title-md2 font-bold text-black dark:text-white mb-5">
            {isEditing ? `Edit Invoice #${invoiceData.invoiceNumber}` : 'Create New Invoice'}
          </h2>
          
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Invoice & Customer Details Section */}
              <div className="bg-white dark:bg-boxdark rounded-sm border border-stroke dark:border-strokedark p-6">
                <h2 className="mb-4 text-xl font-semibold text-black dark:text-white">
                  Invoice Details
                </h2>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Invoice number */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black dark:text-white">
                      Invoice Number
                    </label>
                    <input
                      type="text"
                      value={invoiceData.invoiceNumber}
                      onChange={(e) => setInvoiceData({...invoiceData, invoiceNumber: e.target.value})}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent px-3 py-2 text-sm font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                      required
                    />
                  </div>
                  
                  {/* Invoice Date */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black dark:text-white">
                      Invoice Date
                    </label>
                    <input
                      type="date"
                      value={invoiceData.invoiceDate}
                      onChange={(e) => setInvoiceData({...invoiceData, invoiceDate: e.target.value})}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent px-3 py-2 text-sm font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                      required
                    />
                  </div>
                  
                  {/* Due Date */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black dark:text-white">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={invoiceData.dueDate}
                      onChange={(e) => setInvoiceData({...invoiceData, dueDate: e.target.value})}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent px-3 py-2 text-sm font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                      required
                    />
                  </div>
                  
                  {/* Status */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black dark:text-white">
                      Status
                    </label>
                    <select
                      value={invoiceData.status}
                      onChange={(e) => setInvoiceData({...invoiceData, status: e.target.value})}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent px-3 py-2 text-sm font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="partial">Partial</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                  
                  {/* Customer Name */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black dark:text-white">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={invoiceData.customerName}
                      onChange={(e) => setInvoiceData({...invoiceData, customerName: e.target.value})}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent px-3 py-2 text-sm font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                      required
                    />
                  </div>
                  
                  {/* Customer Contact */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black dark:text-white">
                      Contact Number
                    </label>
                    <input
                      type="text"
                      value={invoiceData.customerContact}
                      onChange={(e) => setInvoiceData({...invoiceData, customerContact: e.target.value})}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent px-3 py-2 text-sm font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                    />
                  </div>
                  
                  {/* Customer Email */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black dark:text-white">
                      Email
                    </label>
                    <input
                      type="email"
                      value={invoiceData.customerEmail}
                      onChange={(e) => setInvoiceData({...invoiceData, customerEmail: e.target.value})}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent px-3 py-2 text-sm font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                    />
                  </div>
                  
                  {/* Reference */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black dark:text-white">
                      Reference/PO Number
                    </label>
                    <input
                      type="text"
                      value={invoiceData.reference || ''}
                      onChange={(e) => setInvoiceData({...invoiceData, reference: e.target.value})}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent px-3 py-2 text-sm font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                      placeholder="Purchase order or reference number"
                    />
                  </div>
                  
                  {/* Customer Address - Spans full width */}
                  <div className="lg:col-span-4">
                    <label className="mb-1 block text-sm font-medium text-black dark:text-white">
                      Billing Address
                    </label>
                    <textarea
                      value={invoiceData.customerAddress}
                      onChange={(e) => setInvoiceData({...invoiceData, customerAddress: e.target.value})}
                      rows={2}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent px-3 py-2 text-sm font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                    ></textarea>
                  </div>
                </div>
              </div>
              
              {/* Line Items Section */}
              <div className="bg-white dark:bg-boxdark rounded-sm border border-stroke dark:border-strokedark p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-black dark:text-white">
                    Invoice Items
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceData({
                        ...invoiceData,
                        items: [
                          ...invoiceData.items,
                          { id: Date.now(), description: '', quantity: 1, unitPrice: 0, amount: 0 }
                        ]
                      });
                    }}
                    className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1 rounded-md text-sm flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    Add Item
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="border-b border-stroke dark:border-strokedark">
                        <th className="p-2.5 text-left text-sm font-medium text-black dark:text-white">Description</th>
                        <th className="p-2.5 text-right text-sm font-medium text-black dark:text-white w-24">Quantity</th>
                        <th className="p-2.5 text-right text-sm font-medium text-black dark:text-white w-32">Unit Price</th>
                        <th className="p-2.5 text-right text-sm font-medium text-black dark:text-white w-32">Amount</th>
                        <th className="p-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceData.items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-gray-500 dark:text-gray-400">
                            No items added yet. Click "Add Item" to add invoice line items.
                          </td>
                        </tr>
                      ) : (
                        invoiceData.items.map((item, index) => (
                          <tr key={item.id || index} className="border-b border-stroke dark:border-strokedark">
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => {
                                  const updatedItems = [...invoiceData.items];
                                  updatedItems[index].description = e.target.value;
                                  setInvoiceData({ ...invoiceData, items: updatedItems });
                                }}
                                className="w-full border-0 bg-transparent px-3 py-1 text-sm outline-none focus:border-b-[1.5px] focus:border-primary"
                                placeholder="Item description"
                                required
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const updatedItems = [...invoiceData.items];
                                  updatedItems[index].quantity = Number(e.target.value);
                                  updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].unitPrice;
                                  
                                  // Recalculate totals
                                  const subtotal = updatedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
                                  const tax = subtotal * 0.06; // 6% tax
                                  const total = subtotal + tax;
                                  const balance = total - (invoiceData.amountPaid || 0);
                                  
                                  setInvoiceData({ 
                                    ...invoiceData, 
                                    items: updatedItems,
                                    subtotal,
                                    tax,
                                    total,
                                    balance
                                  });
                                }}
                                className="w-full border-0 bg-transparent px-3 py-1 text-sm outline-none focus:border-b-[1.5px] focus:border-primary text-right"
                                required
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const updatedItems = [...invoiceData.items];
                                  updatedItems[index].unitPrice = Number(e.target.value);
                                  updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].unitPrice;
                                  
                                  // Recalculate totals
                                  const subtotal = updatedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
                                  const tax = subtotal * 0.06; // 6% tax
                                  const total = subtotal + tax;
                                  const balance = total - (invoiceData.amountPaid || 0);
                                  
                                  setInvoiceData({ 
                                    ...invoiceData, 
                                    items: updatedItems,
                                    subtotal,
                                    tax,
                                    total,
                                    balance
                                  });
                                }}
                                className="w-full border-0 bg-transparent px-3 py-1 text-sm outline-none focus:border-b-[1.5px] focus:border-primary text-right"
                                required
                              />
                            </td>
                            <td className="p-2.5 text-right font-medium">
                              {(item.amount || 0).toFixed(2)}
                            </td>
                            <td className="p-2.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedItems = invoiceData.items.filter((_, i) => i !== index);
                                  
                                  // Recalculate totals
                                  const subtotal = updatedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
                                  const tax = subtotal * 0.06; // 6% tax
                                  const total = subtotal + tax;
                                  const balance = total - (invoiceData.amountPaid || 0);
                                  
                                  setInvoiceData({ 
                                    ...invoiceData, 
                                    items: updatedItems,
                                    subtotal,
                                    tax,
                                    total,
                                    balance
                                  });
                                }}
                                className="text-danger hover:text-danger/70"
                                title="Remove item"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-stroke dark:border-strokedark">
                        <td colSpan={3} className="p-2.5 text-right font-medium">Subtotal:</td>
                        <td className="p-2.5 text-right font-medium">
                          {invoiceData.subtotal.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="p-2.5 text-right font-medium">Tax (6%):</td>
                        <td className="p-2.5 text-right font-medium">
                          {invoiceData.tax.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                      <tr className="bg-gray-50 dark:bg-meta-4">
                        <td colSpan={3} className="p-2.5 text-right font-semibold">Total:</td>
                        <td className="p-2.5 text-right font-semibold">
                          {invoiceData.total.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              
              {/* Payment History Section */}
              <div className="bg-white dark:bg-boxdark rounded-sm border border-stroke dark:border-strokedark p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-black dark:text-white">
                    Payment History
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceData({
                        ...invoiceData,
                        payments: [
                          ...(invoiceData.payments || []),
                          { 
                            id: Date.now(),
                            amount: 0,
                            date: new Date().toISOString().split('T')[0],
                            method: 'cash',
                            reference: '',
                            notes: ''
                          }
                        ]
                      });
                    }}
                    className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1 rounded-md text-sm flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    Add Payment
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="border-b border-stroke dark:border-strokedark">
                        <th className="p-2.5 text-left text-sm font-medium text-black dark:text-white">Date</th>
                        <th className="p-2.5 text-left text-sm font-medium text-black dark:text-white">Method</th>
                        <th className="p-2.5 text-left text-sm font-medium text-black dark:text-white">Reference</th>
                        <th className="p-2.5 text-right text-sm font-medium text-black dark:text-white w-32">Amount</th>
                        <th className="p-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {!invoiceData.payments || invoiceData.payments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-gray-500 dark:text-gray-400">
                            No payments recorded yet. Click "Add Payment" to record a payment.
                          </td>
                        </tr>
                      ) : (
                        invoiceData.payments.map((payment, index) => (
                          <tr key={payment.id || index} className="border-b border-stroke dark:border-strokedark">
                            <td className="p-2.5">
                              <input
                                type="date"
                                value={payment.date}
                                onChange={(e) => {
                                  const updatedPayments = [...invoiceData.payments];
                                  updatedPayments[index].date = e.target.value;
                                  setInvoiceData({ ...invoiceData, payments: updatedPayments });
                                }}
                                className="w-full border-0 bg-transparent px-3 py-1 text-sm outline-none focus:border-b-[1.5px] focus:border-primary"
                                required
                              />
                            </td>
                            <td className="p-2.5">
                              <select
                                value={payment.method}
                                onChange={(e) => {
                                  const updatedPayments = [...invoiceData.payments];
                                  updatedPayments[index].method = e.target.value;
                                  setInvoiceData({ ...invoiceData, payments: updatedPayments });
                                }}
                                className="w-full border-0 bg-transparent px-3 py-1 text-sm outline-none focus:border-b-[1.5px] focus:border-primary"
                                required
                              >
                                <option value="cash">Cash</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="credit_card">Credit Card</option>
                                <option value="online">Online Payment</option>
                                <option value="check">Check</option>
                                <option value="other">Other</option>
                              </select>
                            </td>
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={payment.reference}
                                onChange={(e) => {
                                  const updatedPayments = [...invoiceData.payments];
                                  updatedPayments[index].reference = e.target.value;
                                  setInvoiceData({ ...invoiceData, payments: updatedPayments });
                                }}
                                className="w-full border-0 bg-transparent px-3 py-1 text-sm outline-none focus:border-b-[1.5px] focus:border-primary"
                                placeholder="Transaction reference"
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={payment.amount}
                                onChange={(e) => {
                                  const updatedPayments = [...invoiceData.payments];
                                  updatedPayments[index].amount = Number(e.target.value);
                                  
                                  // Calculate remaining balance
                                  const totalPaid = updatedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                                  const remainingBalance = invoiceData.total - totalPaid;
                                  
                                  setInvoiceData({ 
                                    ...invoiceData, 
                                    payments: updatedPayments,
                                    amountPaid: totalPaid,
                                    balance: remainingBalance
                                  });
                                }}
                                className="w-full border-0 bg-transparent px-3 py-1 text-sm outline-none focus:border-b-[1.5px] focus:border-primary text-right"
                                required
                              />
                            </td>
                            <td className="p-2.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedPayments = invoiceData.payments.filter((_, i) => i !== index);
                                  
                                  // Recalculate totals
                                  const totalPaid = updatedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                                  const remainingBalance = invoiceData.total - totalPaid;
                                  
                                  setInvoiceData({ 
                                    ...invoiceData, 
                                    payments: updatedPayments,
                                    amountPaid: totalPaid,
                                    balance: remainingBalance
                                  });
                                }}
                                className="text-danger hover:text-danger/70"
                                title="Remove payment"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {invoiceData.payments && invoiceData.payments.length > 0 && (
                      <tfoot>
                        <tr className="border-t border-stroke dark:border-strokedark">
                          <td colSpan={3} className="p-2.5 text-right font-medium">Total Paid:</td>
                          <td className="p-2.5 text-right font-medium">
                            {(invoiceData.amountPaid || 0).toFixed(2)}
                          </td>
                          <td></td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-meta-4">
                          <td colSpan={3} className="p-2.5 text-right font-semibold">Remaining Balance:</td>
                          <td className="p-2.5 text-right font-semibold">
                            {(invoiceData.balance || invoiceData.total).toFixed(2)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
              
              {/* Payment Gateway Options Section */}
              <div className="bg-white dark:bg-boxdark rounded-sm border border-stroke dark:border-strokedark p-6">
                <h2 className="mb-4 text-xl font-semibold text-black dark:text-white">
                  Payment Options
                </h2>
                
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium text-black dark:text-white">
                    Enable Online Payment
                  </label>
                  <div className="flex items-center">
                    <label className="flex cursor-pointer select-none items-center mr-4">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={invoiceData.enableOnlinePayment}
                          onChange={(e) => setInvoiceData({...invoiceData, enableOnlinePayment: e.target.checked})}
                          className="sr-only"
                        />
                        <div className={`box mr-2 flex h-5 w-5 items-center justify-center rounded border ${
                          invoiceData.enableOnlinePayment ? 'border-primary bg-primary' : 'border-stroke dark:border-strokedark'
                        }`}>
                          <span className={`opacity-0 ${invoiceData.enableOnlinePayment ? '!opacity-100' : ''}`}>
                            <svg
                              className="h-3.5 w-3.5 stroke-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-medium">Enable payment link in customer email</span>
                    </label>
                  </div>
                </div>
                
                {invoiceData.enableOnlinePayment && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="border border-stroke dark:border-strokedark rounded-md p-3 flex items-center">
                      <input
                        type="radio"
                        id="gateway-stripe"
                        name="paymentGateway"
                        value="stripe"
                        checked={invoiceData.paymentGateway === 'stripe'}
                        onChange={(e) => setInvoiceData({...invoiceData, paymentGateway: e.target.value})}
                        className="mr-2"
                      />
                      <label htmlFor="gateway-stripe" className="flex items-center cursor-pointer">
                        <span className="bg-blue-50 text-blue-700 p-2 rounded mr-2">
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                            <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                          </svg>
                        </span>
                        <div>
                          <span className="font-medium block">Stripe</span>
                          <span className="text-xs text-gray-500">Credit/Debit Cards</span>
                        </div>
                      </label>
                    </div>
                    
                    <div className="border border-stroke dark:border-strokedark rounded-md p-3 flex items-center">
                      <input
                        type="radio"
                        id="gateway-paypal"
                        name="paymentGateway"
                        value="paypal"
                        checked={invoiceData.paymentGateway === 'paypal'}
                        onChange={(e) => setInvoiceData({...invoiceData, paymentGateway: e.target.value})}
                        className="mr-2"
                      />
                      <label htmlFor="gateway-paypal" className="flex items-center cursor-pointer">
                        <span className="bg-blue-50 text-blue-700 p-2 rounded mr-2">
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.273 5.625A4.483 4.483 0 015.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0018.75 3H5.25a3 3 0 00-2.977 2.625zM2.273 8.625A4.483 4.483 0 015.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0018.75 6H5.25a3 3 0 00-2.977 2.625zM5.25 9a3 3 0 00-3 3v6a3 3 0 003 3h13.5a3 3 0 003-3v-6a3 3 0 00-3-3H15a.75.75 0 00-.75.75 2.25 2.25 0 01-4.5 0A.75.75 0 009 9H5.25z" />
                          </svg>
                        </span>
                        <div>
                          <span className="font-medium block">PayPal</span>
                          <span className="text-xs text-gray-500">PayPal Account</span>
                        </div>
                      </label>
                    </div>
                    
                    <div className="border border-stroke dark:border-strokedark rounded-md p-3 flex items-center">
                      <input
                        type="radio"
                        id="gateway-bank"
                        name="paymentGateway"
                        value="bank_transfer"
                        checked={invoiceData.paymentGateway === 'bank_transfer'}
                        onChange={(e) => setInvoiceData({...invoiceData, paymentGateway: e.target.value})}
                        className="mr-2"
                      />
                      <label htmlFor="gateway-bank" className="flex items-center cursor-pointer">
                        <span className="bg-blue-50 text-blue-700 p-2 rounded mr-2">
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.584 2.376a.75.75 0 01.832 0l9 6a.75.75 0 11-.832 1.248L12 3.901 3.416 9.624a.75.75 0 01-.832-1.248l9-6z" />
                            <path fillRule="evenodd" d="M20.25 10.332v9.918H21a.75.75 0 010 1.5H3a.75.75 0 010-1.5h.75v-9.918a.75.75 0 01.634-.74A49.109 49.109 0 0112 9c2.59 0 5.134.202 7.616.592a.75.75 0 01.634.74zm-7.5 2.418a.75.75 0 00-1.5 0v6.75a.75.75 0 001.5 0v-6.75zm3-.75a.75.75 0 01.75.75v6.75a.75.75 0 01-1.5 0v-6.75a.75.75 0 01.75-.75zM9 12.75a.75.75 0 00-1.5 0v6.75a.75.75 0 001.5 0v-6.75z" clipRule="evenodd" />
                            <path d="M12 7.875a1.125 1.125 0 100-2.25 1.125 1.125 0 000 2.25z" />
                          </svg>
                        </span>
                        <div>
                          <span className="font-medium block">Bank Transfer</span>
                          <span className="text-xs text-gray-500">Direct Bank Transfer</span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
                
                {invoiceData.enableOnlinePayment && invoiceData.paymentGateway === 'bank_transfer' && (
                  <div className="mt-4 bg-gray-50 dark:bg-meta-4 p-3 rounded">
                    <h3 className="font-medium mb-2">Bank Account Details</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          value={invoiceData.bankDetails?.bankName || ''}
                          onChange={(e) => setInvoiceData({
                            ...invoiceData, 
                            bankDetails: {
                              accountNumber: invoiceData.bankDetails?.accountNumber || '',
                              accountName: invoiceData.bankDetails?.accountName || '',
                              swiftCode: invoiceData.bankDetails?.swiftCode || '',
                              bankName: e.target.value
                            }
                          })}
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent px-3 py-1 text-sm outline-none focus:border-primary active:border-primary"
                          placeholder="Bank name"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium">
                          Account Number
                        </label>
                        <input
                          type="text"
                          value={invoiceData.bankDetails?.accountNumber || ''}
                          onChange={(e) => setInvoiceData({
                            ...invoiceData, 
                            bankDetails: {
                              bankName: invoiceData.bankDetails?.bankName || '',
                              accountNumber: e.target.value,
                              accountName: invoiceData.bankDetails?.accountName || '',
                              swiftCode: invoiceData.bankDetails?.swiftCode || ''
                            }
                          })}
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent px-3 py-1 text-sm outline-none focus:border-primary active:border-primary"
                          placeholder="Account number"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium">
                          Account Name
                        </label>
                        <input
                          type="text"
                          value={invoiceData.bankDetails?.accountName || ''}
                          onChange={(e) => setInvoiceData({
                            ...invoiceData, 
                            bankDetails: {
                              bankName: invoiceData.bankDetails?.bankName || '',
                              accountNumber: invoiceData.bankDetails?.accountNumber || '',
                              swiftCode: invoiceData.bankDetails?.swiftCode || '',
                              accountName: e.target.value
                            }
                          })}
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent px-3 py-1 text-sm outline-none focus:border-primary active:border-primary"
                          placeholder="Account holder name"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium">
                          Branch Code / SWIFT
                        </label>
                        <input
                          type="text"
                          value={invoiceData.bankDetails?.swiftCode || ''}
                          onChange={(e) => setInvoiceData({
                            ...invoiceData, 
                            bankDetails: {
                              bankName: invoiceData.bankDetails?.bankName || '',
                              accountNumber: invoiceData.bankDetails?.accountNumber || '',
                              accountName: invoiceData.bankDetails?.accountName || '',
                              swiftCode: e.target.value
                            }
                          })}
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent px-3 py-1 text-sm outline-none focus:border-primary active:border-primary"
                          placeholder="SWIFT code"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Notes & Terms Section */}
              <div className="bg-white dark:bg-boxdark rounded-sm border border-stroke dark:border-strokedark p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black dark:text-white">
                      Notes
                    </label>
                    <textarea
                      value={invoiceData.notes}
                      onChange={(e) => setInvoiceData({...invoiceData, notes: e.target.value})}
                      rows={3}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent px-3 py-2 text-sm font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                      placeholder="Additional notes for the customer (optional)"
                    ></textarea>
                  </div>
                  
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black dark:text-white">
                      Terms & Conditions
                    </label>
                    <textarea
                      value={invoiceData.terms}
                      onChange={(e) => setInvoiceData({...invoiceData, terms: e.target.value})}
                      rows={3}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent px-3 py-2 text-sm font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                      placeholder="Payment terms and conditions"
                    ></textarea>
                  </div>
                </div>
              </div>
              
              {/* Submit button */}
              <div className="flex justify-end space-x-4 mt-6">
                <button 
                  type="button"
                  onClick={() => router.back()}
                  className="bg-gray-200 dark:bg-meta-4 text-gray-700 dark:text-gray-300 px-5 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-meta-3"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white px-5 py-2 rounded-md hover:bg-primary/90 flex items-center"
                  disabled={loading}
                >
                  {loading && (
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  )}
                  {isEditing ? 'Update Invoice' : 'Create Invoice'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </DefaultLayout>
  );
}
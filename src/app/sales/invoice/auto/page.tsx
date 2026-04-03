"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import Link from "next/link";
import { useCountry } from "@/context/CountryContext";

// Invoice interface
interface InvoiceData {
  id?: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  customer_name: string;
  customer_nric: string; // Add this new field
  customer_email: string;
  customer_contact: string;
  customer_address: string;
  sales_representative: string;
  sales_uid?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  quotation_total: number; // Add this field
  notes?: string;
  terms?: string;
  status: string;
  task_id?: string;
  quotation_id?: string;
  quotation_number?: string;
  amount_paid: number;
  balance: number;
  payments: PaymentRecord[]; // Add this field
}

// Invoice item interface
interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  unit?: string;
}

// Quotation interface
interface Quotation {
  id: string;
  task_id: string;
  customerName: string;
  customerContact: string;
  customerEmail?: string;
  customerAddress?: string;
  quotationDate: string;
  validUntil: string;
  salesRepresentative: string;
  salesUID?: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  quote_ref: string;
  quotation_number: string;
  created_at: string;
  items?: QuotationItem[];
}

// Quotation item interface
interface QuotationItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  unit?: string;
}

// Add this new interface for payment tracking
interface PaymentRecord {
  id?: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_reference?: string;
  notes?: string;
}

export default function AutoInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quotationId = searchParams.get("quotationId");
  const taskId = searchParams.get("taskId");
  const { country } = useCountry();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    customer_name: "",
    customer_nric: "", // Add this new field
    customer_email: "",
    customer_contact: "",
    customer_address: "",
    sales_representative: "",
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    quotation_total: 0, // Add this
    status: "draft",
    amount_paid: 0,
    balance: 0,
    notes: "Thank you for your business!",
    terms: "Payment is due within 30 days.",
    payments: [], // Initialize empty payments array
  });

  // Add state for the new payment form
  const [newPayment, setNewPayment] = useState<PaymentRecord>({
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: "cash",
    payment_reference: "",
    notes: "",
  });

  // Add state for payment gateway selection
  const [selectedGateway, setSelectedGateway] = useState<string>("none");

  // Fetch quotation data and populate invoice form
  const fetchQuotationData = useCallback(async () => {
    if (!quotationId && !taskId) {
      setError("No quotation ID or task ID provided");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const queryParam = quotationId ? `quotationId=${quotationId}` : `taskId=${taskId}`;
      const response = await fetch(`/api/sales/quotation?${queryParam}`);

      if (!response.ok) {
        throw new Error("Failed to fetch quotation data");
      }

      const data = await response.json();
      if (!data.quotation) {
        throw new Error("No quotation found");
      }

      const quotation = data.quotation;
      
      // Calculate due date (30 days from today)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      // Map quotation items to invoice items
      const items = quotation.items?.map((item: QuotationItem) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
        unit: item.unit
      })) || [];

      // Set invoice data based on quotation
      setInvoiceData({
        invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        customer_name: quotation.customerName || quotation.customer_name || "",
        customer_nric: quotation.customerNRIC || quotation.customer_nric || "", // Add this line
        customer_email: quotation.customerEmail || quotation.customer_email || "",
        customer_contact: quotation.customerContact || quotation.customer_contact || "",
        customer_address: quotation.customerAddress || quotation.customer_address || "",
        sales_representative: quotation.salesRepresentative || quotation.sales_representative || "",
        sales_uid: quotation.salesUID || quotation.sales_uid,
        items: items,
        subtotal: quotation.subtotal,
        tax: quotation.tax,
        total: quotation.total,
        quotation_total: quotation.total, // Set quotation total
        status: "draft",
        task_id: quotation.task_id,
        quotation_id: quotation.id,
        quotation_number: quotation.quotation_number,
        amount_paid: 0,
        balance: quotation.total,
        notes: "Thank you for your business!",
        terms: "Payment is due within 30 days.",
        payments: [], // Initialize empty payments array
      });

      setError(null);
    } catch (err) {
      console.error("Error fetching quotation:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, [quotationId, taskId]);

  useEffect(() => {
    fetchQuotationData();
  }, [fetchQuotationData]);

  // Update item details and recalculate totals
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...invoiceData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Recalculate amount if quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? Number(value) : updatedItems[index].quantity;
      const unitPrice = field === 'unit_price' ? Number(value) : updatedItems[index].unit_price;
      updatedItems[index].amount = quantity * unitPrice;
    }

    // Recalculate totals
    const subtotal = updatedItems.reduce((sum, item) => sum + Number(item.amount), 0);
    const tax = subtotal * 0.06; // 6% tax rate
    const total = subtotal + tax;
    const balance = total - invoiceData.amount_paid;

    setInvoiceData({
      ...invoiceData,
      items: updatedItems,
      subtotal,
      tax,
      total,
      balance,
    });
  };

  // Add new item
  const addItem = () => {
    setInvoiceData({
      ...invoiceData,
      items: [
        ...invoiceData.items,
        { description: "", quantity: 1, unit_price: 0, amount: 0 },
      ],
    });
  };

  // Remove item
  const removeItem = (index: number) => {
    if (invoiceData.items.length === 1) {
      // Don't remove if it's the last item
      return;
    }

    const updatedItems = invoiceData.items.filter((_, i) => i !== index);
    
    // Recalculate totals
    const subtotal = updatedItems.reduce((sum, item) => sum + Number(item.amount), 0);
    const tax = subtotal * 0.06;
    const total = subtotal + tax;
    const balance = total - invoiceData.amount_paid;

    setInvoiceData({
      ...invoiceData,
      items: updatedItems,
      subtotal,
      tax,
      total,
      balance,
    });
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Special handling for amount_paid to update balance
    if (name === 'amount_paid') {
      const amountPaid = Number(value);
      const balance = invoiceData.total - amountPaid;
      setInvoiceData({
        ...invoiceData,
        amount_paid: amountPaid,
        balance,
      });
    } else {
      setInvoiceData({
        ...invoiceData,
        [name]: value,
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Also update quotation status to 'invoiced'
      const updateQuotationResponse = await fetch(`/api/sales/quotation?taskId=${invoiceData.task_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'invoiced' }),
      });
      
      if (!updateQuotationResponse.ok) {
        throw new Error('Failed to update quotation status');
      }
      
      // Create the invoice with payments
      const response = await fetch('/api/sales/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...invoiceData,
          // Convert temporary payment IDs to null for database insertion
          payments: invoiceData.payments.map(payment => ({
            ...payment,
            id: payment.id?.startsWith('temp-') ? undefined : payment.id
          }))
        }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create invoice');
    }

    const data = await response.json();
    setSuccess(true);
    
    // Redirect to invoice view after 2 seconds
    setTimeout(() => {
      router.push(`/sales/invoice?id=${data.invoice.id}`);
    }, 2000);
    
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle adding a new payment
  const handleAddPayment = () => {
    if (newPayment.amount <= 0) {
      alert("Payment amount must be greater than zero");
      return;
    }

    // Calculate new amount_paid and balance
    const totalPaid = invoiceData.payments.reduce((sum, payment) => sum + payment.amount, 0) + newPayment.amount;
    const newBalance = invoiceData.total - totalPaid;
    
    // Determine new status based on payment
    let newStatus = invoiceData.status;
    if (totalPaid >= invoiceData.total) {
      newStatus = "paid";
    } else if (totalPaid > 0) {
      newStatus = "partial";
    }
    
    // Update invoice data with new payment
    setInvoiceData({
      ...invoiceData,
      payments: [...invoiceData.payments, { ...newPayment, id: `temp-${Date.now()}` }],
      amount_paid: totalPaid,
      balance: newBalance,
      status: newStatus
    });
    
    // Reset payment form
    setNewPayment({
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: "cash",
      payment_reference: "",
      notes: "",
    });
  };

  // Handle payment input changes
  const handlePaymentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'amount') {
      setNewPayment({
        ...newPayment,
        [name]: parseFloat(value) || 0
      });
    } else {
      setNewPayment({
        ...newPayment,
        [name]: value
      });
    }
  };

  // Handle removing a payment
  const handleRemovePayment = (index: number) => {
    const updatedPayments = [...invoiceData.payments];
    updatedPayments.splice(index, 1);
    
    // Recalculate amount_paid and balance
    const totalPaid = updatedPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const newBalance = invoiceData.total - totalPaid;
    
    // Determine new status based on payment
    let newStatus = "draft";
    if (totalPaid >= invoiceData.total) {
      newStatus = "paid";
    } else if (totalPaid > 0) {
      newStatus = "partial";
    }
    
    setInvoiceData({
      ...invoiceData,
      payments: updatedPayments,
      amount_paid: totalPaid,
      balance: newBalance,
      status: newStatus
    });
  };

  // Handle payment gateway selection
  const handleGatewayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGateway(e.target.value);
    
    // Pre-fill amount with remaining balance
    setNewPayment({
      ...newPayment,
      amount: invoiceData.balance,
      payment_method: e.target.value === "none" ? "cash" : e.target.value
    });
  };

  // Process payment through gateway
  const processGatewayPayment = async () => {
    if (selectedGateway === "none" || newPayment.amount <= 0) {
      alert("Please select a payment gateway and enter a valid amount");
      return;
    }
    
    setLoading(true);
    
    try {
      // This would be replaced with actual API calls to your payment gateways
      let gatewayResponse;
      
      switch (selectedGateway) {
        case "stripe":
          // Simulate Stripe API call
          gatewayResponse = await simulateGatewayPayment("Stripe", newPayment.amount);
          break;
        case "paypal":
          // Simulate PayPal API call
          gatewayResponse = await simulateGatewayPayment("PayPal", newPayment.amount);
          break;
        case "billplz":
          // Simulate Billplz API call
          gatewayResponse = await simulateGatewayPayment("BillPlz", newPayment.amount);
          break;
        default:
          throw new Error("Invalid payment gateway");
      }
      
      // If payment successful, add it to the payments list
      if (gatewayResponse.success) {
        const updatedPayment = {
          ...newPayment,
          payment_reference: gatewayResponse.transactionId,
          notes: `Paid via ${selectedGateway}: ${gatewayResponse.message}`
        };
        
        handleAddPayment();
      } else {
        throw new Error(gatewayResponse.message);
      }
    } catch (error) {
      console.error("Payment processing error:", error);
      alert(`Payment failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  // Simulate payment gateway API call (for demo purposes)
  const simulateGatewayPayment = (gateway: string, amount: number) => {
    return new Promise<{success: boolean, transactionId: string, message: string}>((resolve) => {
      // Simulate API delay
      setTimeout(() => {
        // 90% success rate for demo
        if (Math.random() > 0.1) {
          resolve({
            success: true,
            transactionId: `${gateway}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            message: `Payment of ${formatCurrency(amount)} processed successfully`
          });
        } else {
          resolve({
            success: false,
            transactionId: "",
            message: "Payment declined by provider"
          });
        }
      }, 1500);
    });
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: country.currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <DefaultLayout>
      <div className="mb-6">
        <Breadcrumb pageName="Create Invoice from Quotation" noHeader={true}/>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black dark:text-white">
            Auto-Generate Invoice
          </h2>
          <Link
            href="/sales/invoice"
            className="border-stroke dark:border-strokedark dark:bg-meta-4 dark:hover:bg-meta-3 flex items-center rounded-md border bg-gray-100 px-4 py-2 text-sm font-medium text-black hover:bg-gray-200 dark:text-white"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              ></path>
            </svg>
            Back to Invoices
          </Link>
        </div>
      </div>

      {loading && !success ? (
        <div className="flex h-40 items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
          <span className="ml-2">Loading invoice data...</span>
        </div>
      ) : error ? (
        <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/30">
          <div className="flex">
            <svg
              className="h-5 w-5 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            </div>
          </div>
        </div>
      ) : success ? (
        <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/30">
          <div className="flex">
            <svg
              className="h-5 w-5 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                Success
              </h3>
              <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                Invoice created successfully! Redirecting...
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="border-stroke dark:border-strokedark dark:bg-boxdark mb-6 rounded-sm border bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-black dark:text-white">
              Customer Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
                  Customer Name
                </label>
                <input
                  type="text"
                  name="customer_name"
                  value={invoiceData.customer_name}
                  onChange={handleInputChange}
                  required
                  className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border px-4 py-2 text-black outline-none transition disabled:cursor-default disabled:bg-gray-100 dark:text-white"
                />
              </div>
              
              <div>
                <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
                  NRIC/ID
                </label>
                <input
                  type="text"
                  name="customer_nric"
                  value={invoiceData.customer_nric}
                  onChange={handleInputChange}
                  className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border px-4 py-2 text-black outline-none transition disabled:cursor-default disabled:bg-gray-100 dark:text-white"
                />
              </div>
              
              <div>
                <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
                  Customer Email
                </label>
                <input
                  type="email"
                  name="customer_email"
                  value={invoiceData.customer_email}
                  onChange={handleInputChange}
                  className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border px-4 py-2 text-black outline-none transition disabled:cursor-default disabled:bg-gray-100 dark:text-white"
                />
              </div>
              
              <div>
                <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
                  Customer Phone
                </label>
                <input
                  type="text"
                  name="customer_contact"
                  value={invoiceData.customer_contact}
                  onChange={handleInputChange}
                  className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border px-4 py-2 text-black outline-none transition disabled:cursor-default disabled:bg-gray-100 dark:text-white"
                />
              </div>
              
              <div>
                <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
                  Installation Date
                </label>
                <input
                  type="date"
                  name="due_date"
                  value={invoiceData.due_date}
                  onChange={handleInputChange}
                  required
                  className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border px-4 py-2 text-black outline-none transition disabled:cursor-default disabled:bg-gray-100 dark:text-white"
                />
              </div>
              
              <div className="col-span-1 sm:col-span-2 lg:col-span-5">
                <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
                  Customer Address
                </label>
                <textarea
                  name="customer_address"
                  value={invoiceData.customer_address}
                  onChange={handleInputChange}
                  rows={2}
                  className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border px-4 py-2 text-black outline-none transition disabled:cursor-default disabled:bg-gray-100 dark:text-white"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Invoice Summary and Payment Tracking */}
          <div className="border-stroke dark:border-strokedark dark:bg-boxdark mb-6 rounded-sm border bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-black dark:text-white">
              Invoice Summary
            </h3>
            
            <div className="border-stroke dark:border-strokedark mb-6 rounded-sm border p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="flex flex-col space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-black dark:text-white">Invoice Number:</span>
                      <span>{invoiceData.invoice_number}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-black dark:text-white">Quotation Reference:</span>
                      <span>{invoiceData.quotation_number || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-black dark:text-white">Invoice Date:</span>
                      <span>{new Date(invoiceData.invoice_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-black dark:text-white">Due Date:</span>
                      <span>{new Date(invoiceData.due_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="md:border-l md:pl-4 border-stroke dark:border-strokedark pt-4 md:pt-0">
                  <div className="flex flex-col space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-black dark:text-white">Quotation Total:</span>
                      <span>{formatCurrency(invoiceData.quotation_total)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-black dark:text-white">Invoice Total:</span>
                      <span className="font-bold">{formatCurrency(invoiceData.total)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-black dark:text-white">Amount Paid:</span>
                      <span className="text-success">{formatCurrency(invoiceData.amount_paid)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-black dark:text-white">Balance Due:</span>
                      <span className={`font-bold ${invoiceData.balance > 0 ? 'text-danger' : 'text-success'}`}>
                        {formatCurrency(invoiceData.balance)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-5 pt-4 border-t border-stroke dark:border-strokedark flex justify-between items-center">
                <span className="font-medium text-black dark:text-white">Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  invoiceData.status === 'paid' ? 'bg-success/10 text-success' : 
                  invoiceData.status === 'partial' ? 'bg-warning/10 text-warning' : 
                  invoiceData.status === 'sent' ? 'bg-info/10 text-info' :
                  invoiceData.status === 'overdue' ? 'bg-danger/10 text-danger' :
                  'bg-gray-100 text-gray-600 dark:bg-meta-4 dark:text-gray-300'
                }`}>
                  {invoiceData.status === 'paid' ? 'Paid' : 
                   invoiceData.status === 'partial' ? 'Partially Paid' : 
                   invoiceData.status === 'sent' ? 'Sent' :
                   invoiceData.status === 'overdue' ? 'Overdue' :
                   'Draft'}
                </span>
              </div>
            </div>
            
            {/* Payment Tracking - Keep this section */}
            <div className="mt-6">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="font-medium text-black dark:text-white">Payment Records</h4>
              </div>
              
              {invoiceData.payments.length > 0 ? (
                <div className="border-stroke dark:border-strokedark mb-4 overflow-x-auto rounded-sm border">
                  <table className="w-full">
                    <thead className="dark:bg-meta-4 bg-gray-2">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-black dark:text-white">Date</th>
                        <th className="px-4 py-3 text-left font-medium text-black dark:text-white">Method</th>
                        <th className="px-4 py-3 text-left font-medium text-black dark:text-white">Reference</th>
                        <th className="px-4 py-3 text-left font-medium text-black dark:text-white">Amount</th>
                        <th className="px-4 py-3 text-left font-medium text-black dark:text-white">Notes</th>
                        <th className="px-4 py-3 text-left font-medium text-black dark:text-white">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceData.payments.map((payment, index) => (
                        <tr key={payment.id || index} className="border-stroke dark:border-strokedark border-t">
                          <td className="px-4 py-3">{new Date(payment.payment_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 capitalize flex items-center">
                            {/* Add payment method icons */}
                            {payment.payment_method === 'stripe' && (
                              <svg className="mr-2 h-5 w-5 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14.24 0L7.2 4.03l1.44 3.06 7.04-4.03z" />
                                <path d="M14.24 24L7.2 19.97l1.44-3.06 7.04 4.03z" />
                              </svg>
                            )}
                            {payment.payment_method === 'paypal' && (
                              <svg className="mr-2 h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M7.07 11.82h1.68c1.77 0 3.03-.85 3.23-2.71.22-1.98-1.09-2.71-2.65-2.71H7.07v5.42zm1.4-4.32h.41c.65 0 1.25.28 1.13 1.12-.12.84-.74 1.12-1.39 1.12h-.15v-2.24z" />
                                <path d="M20.39 11.25c-.27-1.98-1.73-2.14-3.07-2.14h-1.47v5.42h1.49c1.34 0 3.05-.16 3.05-2.14v-1.14zM17.3 13.43h-.49v-3.22h.49c.61 0 1.56.18 1.56 1.61 0 1.43-.95 1.61-1.56 1.61z" />
                              </svg>
                            )}
                            {payment.payment_method === 'billplz' && (
                              <svg className="mr-2 h-5 w-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="5" width="18" height="14" rx="2" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                            )}
                            {payment.payment_method === 'credit_card' && (
                              <svg className="mr-2 h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                <line x1="2" y1="10" x2="22" y2="10" />
                              </svg>
                            )}
                            {payment.payment_method === 'bank_transfer' && (
                              <svg className="mr-2 h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path d="M3 5a2 2 0 002-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
                                <path d="M12 9V5m0 12v-4m-5-3h10" />
                              </svg>
                            )}
                            {payment.payment_method === 'cash' && (
                              <svg className="mr-2 h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                              </svg>
                            )}
                            {payment.payment_method}
                          </td>
                          <td className="px-4 py-3">{payment.payment_reference || "-"}</td>
                          <td className="px-4 py-3 font-medium text-meta-3">{formatCurrency(payment.amount)}</td>
                          <td className="px-4 py-3 max-w-xs truncate">{payment.notes || "-"}</td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => handleRemovePayment(index)}
                              className="text-danger hover:text-danger/80 rounded p-1"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="border-stroke dark:border-strokedark mb-4 rounded-sm border p-4 text-center text-gray-500">
                  No payment records yet
                </div>
              )}
              
              {/* Add Payment Section */}
              <div className="border-stroke dark:border-strokedark rounded-sm border p-4">
                <h5 className="mb-3 font-medium text-black dark:text-white">Add Payment</h5>
                
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                      Amount
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={newPayment.amount}
                      onChange={handlePaymentInputChange}
                      min="0"
                      step="0.01"
                      className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border px-3 py-2 text-black outline-none transition dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                      Date
                    </label>
                    <input
                      type="date"
                      name="payment_date"
                      value={newPayment.payment_date}
                      onChange={handlePaymentInputChange}
                      className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border px-3 py-2 text-black outline-none transition dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                      Method
                    </label>
                    <select
                      name="payment_method"
                      value={newPayment.payment_method}
                      onChange={handlePaymentInputChange}
                      className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border px-3 py-2 text-black outline-none transition dark:text-white"
                    >
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="check">Check</option>
                      <option value="credit_card">Credit Card</option>
                      <option disabled className="font-medium text-gray-400">--- Payment Gateways ---</option>
                      <option value="stripe">Stripe</option>
                      <option value="paypal">PayPal</option>
                      <option value="billplz">BillPlz</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                      Reference
                    </label>
                    <input
                      type="text"
                      name="payment_reference"
                      value={newPayment.payment_reference}
                      onChange={handlePaymentInputChange}
                      placeholder="Receipt/Reference #"
                      className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border px-3 py-2 text-black outline-none transition dark:text-white"
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={newPayment.notes}
                    onChange={handlePaymentInputChange}
                    placeholder="Payment notes (optional)"
                    rows={2}
                    className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border px-3 py-2 text-black outline-none transition dark:text-white"
                  ></textarea>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const isGateway = ['stripe', 'paypal', 'billplz'].includes(newPayment.payment_method);
                      if (isGateway) {
                        // Set the selectedGateway and then process the payment
                        setSelectedGateway(newPayment.payment_method);
                        processGatewayPayment();
                      } else {
                        // Regular payment
                        handleAddPayment();
                      }
                    }}
                    className="bg-primary hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium text-white"
                  >
                    {['stripe', 'paypal', 'billplz'].includes(newPayment.payment_method) ? (
                      <>
                        <span className={loading ? "mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" : "hidden"}></span>
                        Process {newPayment.payment_method.charAt(0).toUpperCase() + newPayment.payment_method.slice(1)} Payment
                      </>
                    ) : (
                      "Add Payment"
                    )}
                  </button>
                </div>
              </div>
              
            </div>
          </div>

          {/* Additional Information */}
          <div className="border-stroke dark:border-strokedark dark:bg-boxdark mb-6 grid grid-cols-1 gap-6 rounded-sm border bg-white p-6 md:grid-cols-2">
            <div>
              <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
                Notes
              </label>
              <textarea
                name="notes"
                value={invoiceData.notes}
                onChange={handleInputChange}
                rows={4}
                className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border px-4 py-2 text-black outline-none transition disabled:cursor-default disabled:bg-gray-100 dark:text-white"
                placeholder="Additional notes for the customer..."
              ></textarea>
            </div>
            <div>
              <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
                Terms and Conditions
              </label>
              <textarea
                name="terms"
                value={invoiceData.terms}
                onChange={handleInputChange}
                rows={4}
                className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border px-4 py-2 text-black outline-none transition disabled:cursor-default disabled:bg-gray-100 dark:text-white"
                placeholder="Payment terms and conditions..."
              ></textarea>
            </div>
          </div>

          {/* Form Actions */}
          <div className="mb-6 flex items-center justify-end space-x-4">
            <Link
              href="/sales/invoice"
              className="border-stroke dark:border-strokedark dark:bg-meta-4 dark:hover:bg-meta-3 rounded-md border bg-gray-100 px-6 py-2.5 font-medium text-black hover:bg-gray-200 dark:text-white"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary/90 rounded-md px-6 py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Processing...
                </>
              ) : (
                "Create Invoice"
              )}
            </button>
          </div>
        </form>
      )}
    </DefaultLayout>
  );
}
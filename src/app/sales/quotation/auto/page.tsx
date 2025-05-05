'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import DefaultLayout from "@/components/Layouts/DefaultLayout";

// Task interface from the task system
interface Task {
  id: number;
  name: string;
  phone1: string | null;
  phone2: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postcode: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  customer_remark: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  source: string | null;
  nric: string | null;
  sales_id: number | null;
  interested: string | null;
  add_info: string | null;
  sales_name: string | null;
  sales_uid: string | null;
}

// Quotation item interface
interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  total: number;
}

// Quotation interface
interface Quotation {
  id: string;
  taskId: string;
  customerName: string;
  customerContact: string;
  customerAddress: string;
  quotationDate: string;
  validUntil: string;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string;
  terms: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
}

export default function QuotationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const taskId = searchParams.get('taskId');
  
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const hasFetchedData = useRef(false);
  
  // Form states
  const [items, setItems] = useState<QuotationItem[]>([
    {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unit: 'unit',
      unitPrice: 0,
      discount: 0,
      total: 0
    }
  ]);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('1. This quotation is valid for 14 days from the date of issue.\n2. 50% deposit required to confirm order.\n3. Balance payment due upon completion.');
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [validDays, setValidDays] = useState(14);
  const [editingCustomer, setEditingCustomer] = useState(false);
  
  // Calculate dates
  const today = new Date().toISOString().split('T')[0];
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validDays);
  const validUntilString = validUntil.toISOString().split('T')[0];

  // Fetch task data if taskId is provided
  useEffect(() => {
    async function fetchTaskData() {
      if (!taskId) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/sales/task?id=${taskId}`);
        if (!response.ok) throw new Error('Failed to fetch task');
        
        const responseData = await response.json();
        
        if (responseData.listTask && responseData.listTask.length > 0) {
          setTask(responseData.listTask[0]);
          
          // Try to fetch existing quotation for this task
          fetchQuotation(taskId);
        } else {
          throw new Error('No task data found');
        }
      } catch (error) {
        console.error('Error fetching task:', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (!hasFetchedData.current && taskId) {
      fetchTaskData();
      hasFetchedData.current = true;
    }
  }, [taskId]);

  // Function to fetch existing quotation
  const fetchQuotation = async (taskId: string) => {
    try {
      // This would need to be implemented in your API
      const response = await fetch(`/api/sales/quotation?taskId=${taskId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.quotation) {
          setQuotation(data.quotation);
          
          // Populate form with existing data
          setItems(data.quotation.items);
          setNotes(data.quotation.notes);
          setTerms(data.quotation.terms);
          setDiscount(data.quotation.discount);
          setTax(data.quotation.tax);
        }
      }
    } catch (error) {
      console.error('Error fetching quotation:', error);
    }
  };

  // Add a new item to the quotation
  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: 1,
        unit: 'unit',
        unitPrice: 0,
        discount: 0,
        total: 0
      }
    ]);
  };

  // Remove an item from the quotation
  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Update an item property
  const updateItem = (id: string, field: keyof QuotationItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate total when quantity, unitPrice or discount changes
        if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
          const quantity = field === 'quantity' ? value : item.quantity;
          const unitPrice = field === 'unitPrice' ? value : item.unitPrice;
          const discount = field === 'discount' ? value : item.discount;
          
          updatedItem.total = quantity * unitPrice * (1 - discount / 100);
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  // Calculate subtotal
  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  // Calculate total with discount and tax
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = subtotal * (discount / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (tax / 100);
    
    return taxableAmount + taxAmount;
  };

  // Save quotation
  const saveQuotation = async (status: 'draft' | 'sent' = 'draft') => {
    if (!taskId) return;
    
    const subtotal = calculateSubtotal();
    const total = calculateTotal();
    
    const quotationData: Quotation = {
      id: quotation?.id || crypto.randomUUID(),
      taskId,
      customerName: task?.name || '',
      customerContact: task?.phone1 || '',
      customerAddress: [task?.address_line1, task?.address_line2, task?.city, task?.state]
        .filter(Boolean)
        .join(', '),
      quotationDate: today,
      validUntil: validUntilString,
      items,
      subtotal,
      discount,
      tax,
      total,
      notes,
      terms,
      status
    };
    
    try {
      // This would need to be implemented in your API
      const response = await fetch('/api/sales/quotation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(quotationData)
      });
      
      if (!response.ok) throw new Error('Failed to save quotation');
      
      const data = await response.json();
      setQuotation(data.quotation);
      
      alert('Quotation saved successfully');
      
      // If sent, update the task status if needed
      if (status === 'sent' && task && task.status !== 'Quotation') {
        await fetch(`/api/sales/task/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: taskId,
            status: 'Quotation',
            oldStatus: task.status,
            notes: 'Quotation sent to customer',
            userName: 'Current User' // Replace with actual username
          })
        });
      }
      
    } catch (error) {
      console.error('Error saving quotation:', error);
      alert('Failed to save quotation');
    }
  };

  // Generate PDF quotation
  const generatePDF = async () => {
    if (!quotation) {
      alert('Please save the quotation first');
      return;
    }
    
    try {
      // This would need to be implemented in your API
      const response = await fetch(`/api/sales/quotation/pdf?id=${quotation.id}`, {
        method: 'GET'
      });
      
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      // Create a blob from the PDF Stream
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Open the PDF in a new tab
      window.open(url, '_blank');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    }
  };

  if (loading) {
    return (
      <DefaultLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <Breadcrumb noHeader={true} pageName={taskId ? `Quotation for Task #${taskId}` : 'New Quotation'} />
        
        <div className="mt-3 md:mt-0 flex gap-2">
          <button 
            onClick={() => saveQuotation('draft')}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition"
          >
            Save Draft
          </button>
          <button 
            onClick={() => saveQuotation('sent')}
            className="px-4 py-2 bg-success hover:bg-success/90 text-white rounded-md transition"
          >
            Save & Send
          </button>
          {quotation && (
            <button 
              onClick={generatePDF}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition"
            >
              Generate PDF
            </button>
          )}
        </div>
      </div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 gap-8">
        {/* Customer Information */}
        {task && (
          <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-black dark:text-white">Customer Information</h2>
              <button 
                onClick={() => setEditingCustomer(!editingCustomer)}
                className="inline-flex items-center text-sm font-medium text-success hover:text-success/80"
              >
                {editingCustomer ? (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Done</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                    </svg>
                    <span>Edit</span>
                  </>
                )}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-medium text-black dark:text-white mb-2">Customer Details</h5>
                <div className="space-y-1 text-sm">
                  {editingCustomer ? (
                    <>
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
                        <input
                          type="text"
                          value={task.name}
                          onChange={(e) => setTask({...task, name: e.target.value})}
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-sm outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                        />
                      </div>
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Phone</label>
                        <input
                          type="text"
                          value={task.phone1 || ''}
                          onChange={(e) => setTask({...task, phone1: e.target.value})}
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-sm outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                        />
                      </div>
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
                        <input
                          type="email"
                          value={task.email || ''}
                          onChange={(e) => setTask({...task, email: e.target.value})}
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-sm outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                        />
                      </div>
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">NRIC</label>
                        <input
                          type="text"
                          value={task.nric || ''}
                          onChange={(e) => setTask({...task, nric: e.target.value})}
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-sm outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <p><span className="font-medium">Name:</span> {task.name}</p>
                      {task.phone1 && <p><span className="font-medium">Phone:</span> {task.phone1}</p>}
                      {task.email && <p><span className="font-medium">Email:</span> {task.email}</p>}
                      {task.nric && <p><span className="font-medium">NRIC:</span> {task.nric}</p>}
                    </>
                  )}
                </div>
              </div>
              
              <div>
                <h5 className="text-sm font-medium text-black dark:text-white mb-2">Address</h5>
                <div className="space-y-1 text-sm">
                  {editingCustomer ? (
                    <>
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Address Line 1</label>
                        <input
                          type="text"
                          value={task.address_line1 || ''}
                          onChange={(e) => setTask({...task, address_line1: e.target.value})}
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-sm outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                        />
                      </div>
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Address Line 2</label>
                        <input
                          type="text"
                          value={task.address_line2 || ''}
                          onChange={(e) => setTask({...task, address_line2: e.target.value})}
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-sm outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">City</label>
                          <input
                            type="text"
                            value={task.city || ''}
                            onChange={(e) => setTask({...task, city: e.target.value})}
                            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-sm outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Postcode</label>
                          <input
                            type="text"
                            value={task.postcode || ''}
                            onChange={(e) => setTask({...task, postcode: e.target.value})}
                            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-sm outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                          />
                        </div>
                      </div>
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">State</label>
                        <input
                          type="text"
                          value={task.state || ''}
                          onChange={(e) => setTask({...task, state: e.target.value})}
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-sm outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                        />
                      </div>
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Country</label>
                        <input
                          type="text"
                          value={task.country || ''}
                          onChange={(e) => setTask({...task, country: e.target.value})}
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-sm outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {task.address_line1 && <p>{task.address_line1}</p>}
                      {task.address_line2 && <p>{task.address_line2}</p>}
                      {(task.city || task.postcode) && (
                        <p>{[task.city, task.postcode].filter(Boolean).join(', ')}</p>
                      )}
                      {task.state && <p>{task.state}</p>}
                      {task.country && <p>{task.country}</p>}
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Save changes button when in edit mode */}
            {editingCustomer && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={async () => {
                    try {
                      // Only proceed if we have a task with ID
                      if (!task || !task.id) {
                        throw new Error('No task ID available');
                      }
                      
                      // Prepare the data to update using the structure expected by the API
                      const customerData = {
                        name: task.name,
                        nric: task.nric || '',
                        phone1: task.phone1 || '',
                        phone2: task.phone2 || '',
                        email: task.email || '',
                        address_line1: task.address_line1 || '',
                        address_line2: task.address_line2 || '',
                        postcode: task.postcode || '',
                        city: task.city || '',
                        state: task.state || '',
                        country: task.country || '',
                        // Include these required fields with existing values to avoid overwriting
                        source: task.source || '',
                        interested: task.interested || '',
                        add_info: task.add_info || '',
                        status: task.status || '',
                        sales_id: task.sales_id || null
                      };
                      
                      // Send to API using PUT method
                      const response = await fetch(`/api/sales/lead/create?id=${task.id}`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(customerData),
                      });
                      
                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to update customer information');
                      }
                      
                      // If successful, toggle edit mode off
                      setEditingCustomer(false);
                      
                      // Optional: Update the quotation customer info
                      if (quotation) {
                        setQuotation({
                          ...quotation,
                          customerName: task.name,
                          customerContact: task.phone1 || '',
                          customerAddress: [task.address_line1, task.address_line2, task.city, task.state]
                            .filter(Boolean)
                            .join(', ')
                        });
                      }
                      
                      // Show success message
                      alert('Customer information updated successfully');
                      
                    } catch (error) {
                      console.error('Error updating customer information:', error);
                      alert(error instanceof Error ? error.message : 'Failed to update customer information');
                    }
                  }}
                  className="px-4 py-2 bg-success hover:bg-success/90 text-white rounded-md transition"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Quotation Details */}
        <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <h2 className="text-xl font-semibold text-black dark:text-white mb-4">Quotation Details</h2>
          
          {/* Quotation Date & Validity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-1.5">
                Quotation Date
              </label>
              <input
                type="date"
                value={today}
                disabled
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm font-medium outline-none transition disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-1.5">
                Valid For (Days)
              </label>
              <input
                type="number"
                value={validDays}
                onChange={e => setValidDays(parseInt(e.target.value) || 14)}
                min="1"
                max="90"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-1.5">
                Valid Until
              </label>
              <input
                type="date"
                value={validUntilString}
                disabled
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm font-medium outline-none transition disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input"
              />
            </div>
          </div>
          
          {/* Quotation Items */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h5 className="text-sm font-medium text-black dark:text-white">Items</h5>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Add Item
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead>
                  <tr className="bg-gray-100 dark:bg-meta-4">
                    <th className="py-3 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                      #
                    </th>
                    <th className="py-3 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="py-3 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Qty
                    </th>
                    <th className="py-3 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Unit
                    </th>
                    <th className="py-3 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Unit Price
                    </th>
                    <th className="py-3 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Disc %
                    </th>
                    <th className="py-3 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Total
                    </th>
                    <th className="py-3 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                      
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-strokedark">
                  {items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="py-2 px-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {index + 1}
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={e => updateItem(item.id, 'description', e.target.value)}
                          placeholder="Item description"
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-sm outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          min="1"
                          step="1"
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-sm outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={e => updateItem(item.id, 'unit', e.target.value)}
                          placeholder="unit"
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-sm outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-sm outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          value={item.discount}
                          onChange={e => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                          min="0"
                          max="100"
                          step="0.1"
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-sm outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          value={item.total.toFixed(2)}
                          disabled
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-sm outline-none transition disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input"
                        />
                      </td>
                      <td className="py-2 px-2">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-danger hover:text-danger/80"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Summary & Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              {/* Notes */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-black dark:text-white mb-1.5">
                  Notes
                </label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Additional notes to customer..."
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                ></textarea>
              </div>
              
              {/* Terms & Conditions */}
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-1.5">
                  Terms & Conditions
                </label>
                <textarea
                  rows={4}
                  value={terms}
                  onChange={e => setTerms(e.target.value)}
                  placeholder="Terms and conditions..."
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                ></textarea>
              </div>
            </div>
            
            <div>
              <div className="bg-gray-50 dark:bg-meta-4 p-5 rounded-md">
                <h5 className="font-medium text-black dark:text-white mb-4">Summary</h5>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="font-medium">{calculateSubtotal().toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Discount (%):</span>
                      <input
                        type="number"
                        value={discount}
                        onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-16 rounded border-[1.5px] border-stroke bg-transparent py-1 px-2 text-sm outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                      />
                    </div>
                    <span className="font-medium">{(calculateSubtotal() * (discount / 100)).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Tax (%):</span>
                      <input
                        type="number"
                        value={tax}
                        onChange={e => setTax(parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-16 rounded border-[1.5px] border-stroke bg-transparent py-1 px-2 text-sm outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                      />
                    </div>
                    <span className="font-medium">
                      {((calculateSubtotal() * (1 - discount / 100)) * (tax / 100)).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="pt-3 mt-3 border-t border-stroke dark:border-strokedark flex justify-between">
                    <span className="text-black dark:text-white font-medium">Total:</span>
                    <span className="text-black dark:text-white font-bold text-lg">
                      {calculateTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}
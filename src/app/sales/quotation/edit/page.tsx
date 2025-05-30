'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import Link from 'next/link';

// QuotationItem interface
interface QuotationItem {
  id: number;
  quotation_id: string;
  category: string;
  subcategory: string;
  product_id: number | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  note: string;
}

// Quotation interface
interface Quotation {
  id: string;
  task_id: string;
  customer_name: string;
  customerName: string;
  customer_contact: string;
  customerContact: string;
  customer_address: string;
  customerAddress: string;
  quotation_date: string;
  quotationDate: string;
  valid_until: string;
  validUntil: string;
  sales_representative: string;
  salesRepresentative: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string;
  terms: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  quote_ref: string;
  quotation_number: string;
  created_at: string;
  items: QuotationItem[];
}

export default function QuotationEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  
  const [quotation, setQuotation] = useState<Partial<Quotation>>({});
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Product data
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<Record<string, string[]>>({});
  const [products, setProducts] = useState<Record<string, Record<string, any[]>>>({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Fetch existing quotation data
  useEffect(() => {
    if (!id) {
      setError("No quotation ID provided");
      setLoading(false);
      return;
    }
    
    const fetchQuotation = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/sales/quotation?id=${id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch quotation');
        }
        
        const data = await response.json();
        if (data.quotation) {
          // Normalize the data - handle both snake_case and camelCase properties
          const normalizedQuotation = {
            id: data.quotation.id,
            task_id: data.quotation.task_id,
            customerName: data.quotation.customerName || data.quotation.customer_name,
            customerContact: data.quotation.customerContact || data.quotation.customer_contact,
            customerAddress: data.quotation.customerAddress || data.quotation.customer_address || '',
            quotationDate: data.quotation.quotationDate || data.quotation.quotation_date,
            validUntil: data.quotation.validUntil || data.quotation.valid_until,
            salesRepresentative: data.quotation.salesRepresentative || data.quotation.sales_representative,
            subtotal: data.quotation.subtotal,
            discount: data.quotation.discount || 0,
            tax: data.quotation.tax || 0,
            total: data.quotation.total,
            notes: data.quotation.notes || '',
            terms: data.quotation.terms || 'Payment is due within 30 days from the date of this quotation.',
            status: data.quotation.status,
            quote_ref: data.quotation.quote_ref,
            quotation_number: data.quotation.quotation_number,
            created_at: data.quotation.created_at,
          };
          
          setQuotation(normalizedQuotation);
          
          // Set items if available
          if (data.items && Array.isArray(data.items)) {
            setItems(data.items);
          }
        } else {
          setError('Quotation not found');
        }
      } catch (error) {
        console.error('Error fetching quotation:', error);
        setError('Failed to load quotation. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuotation();
  }, [id]);
  
  // Fetch products for item selection
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const response = await fetch('/api/sales/products');
        if (!response.ok) throw new Error('Failed to fetch products');
        
        const data = await response.json();
        
        // Organize data by category and subcategory
        setCategories(data.categories || []);
        setSubcategories(data.subcategories || {});
        setProducts(data.products || {});
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoadingProducts(false);
      }
    };
    
    fetchProducts();
  }, []);
  
  // Handle input changes for the quotation form
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle numeric values
    if (name === 'tax' || name === 'discount') {
      setQuotation(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setQuotation(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Wrap calculateSubtotal in useCallback
  const calculateSubtotal = useCallback(() => {
    return items.reduce((sum, item) => sum + (item.total || 0), 0);
  }, [items]);
  
  // Wrap calculateTotal in useCallback
  const calculateTotal = useCallback(() => {
    const subtotal = calculateSubtotal();
    const discountAmount = subtotal * ((quotation.discount || 0) / 100);
    const taxAmount = (subtotal - discountAmount) * ((quotation.tax || 0) / 100);
    return subtotal - discountAmount + taxAmount;
  }, [calculateSubtotal, quotation.discount, quotation.tax]);
  
  // Update totals when items change
  useEffect(() => {
    const subtotal = calculateSubtotal();
    const total = calculateTotal();
    
    setQuotation(prev => ({
      ...prev,
      subtotal,
      total
    }));
  }, [items, quotation.tax, quotation.discount, calculateSubtotal, calculateTotal]);
  
  // Handle item changes
  const handleItemChange = (index: number, field: keyof QuotationItem, value: any) => {
    const updatedItems = [...items];
    
    // Handle special case for product selection
    if (field === 'product_id' && value) {
      const selectedCategory = updatedItems[index].category;
      const selectedSubcategory = updatedItems[index].subcategory;
      
      // Find product in our products data structure
      const productList = products[selectedCategory]?.[selectedSubcategory] || [];
      const selectedProduct = productList.find(p => p.id === parseInt(value));
      
      if (selectedProduct) {
        updatedItems[index] = {
          ...updatedItems[index],
          product_id: parseInt(value),
          description: selectedProduct.name,
          unit_price: selectedProduct.price,
          unit: selectedProduct.unit,
          // Recalculate total
          total: (updatedItems[index].quantity || 1) * selectedProduct.price
        };
      }
    } else {
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      
      // Recalculate total if quantity or unit_price changes
      if (field === 'quantity' || field === 'unit_price') {
        updatedItems[index].total = 
          (updatedItems[index].quantity || 0) * (updatedItems[index].unit_price || 0);
      }
    }
    
    setItems(updatedItems);
  };
  
  // Add a new item to the quotation
  const addItem = () => {
    const newItem: QuotationItem = {
      id: Date.now(), // Temporary ID for frontend
      quotation_id: id || '',
      category: categories[0] || '',
      subcategory: categories[0] && subcategories[categories[0]]?.length > 0 
        ? subcategories[categories[0]][0] 
        : '',
      product_id: null,
      description: '',
      quantity: 1,
      unit: 'unit',
      unit_price: 0,
      total: 0,
      note: ''
    };
    
    setItems(prevItems => [...prevItems, newItem]);
  };
  
  // Remove an item from the quotation
  const removeItem = (index: number) => {
    setItems(prevItems => prevItems.filter((_, i) => i !== index));
  };
  
  // Save the edited quotation
  const handleSubmit = async (e: React.FormEvent, saveStatus?: 'draft' | 'sent' | 'accepted' | 'rejected') => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Prepare data for submission
      const status = saveStatus || quotation.status;
      const updatedQuotation = {
        ...quotation,
        status,
        items: items.map(item => ({
          ...item,
          // Remove temp ID for new items
          id: typeof item.id === 'number' && item.id > 1000000 ? undefined : item.id 
        }))
      };
      
      // Update existing quotation
      const response = await fetch(`/api/sales/quotation?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedQuotation)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update quotation');
      }
      
      const data = await response.json();
      setSuccess('Quotation updated successfully');
      
      // Refresh data
      if (data.quotation) {
        setQuotation(data.quotation);
      }
      
      if (data.items) {
        setItems(data.items);
      }
      
      // Redirect to list after short delay if requested
      if (saveStatus) {
        setTimeout(() => {
          router.push('/sales/quotation');
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving quotation:', error);
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  return (
    <DefaultLayout>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <Breadcrumb pageName="Edit Quotation" />
        
        <div className="mt-4 md:mt-0 flex space-x-2">
          <Link
            href="/sales/quotation"
            className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-meta-4 dark:hover:bg-meta-3 text-gray-700 dark:text-gray-300 rounded-md transition"
          >
            Back to List
          </Link>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <span className="mt-3">Loading quotation...</span>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xs border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="bg-danger/10 text-danger px-4 py-3 rounded-md">
            {error}
          </div>
          <div className="mt-4 flex justify-center">
            <Link
              href="/sales/quotation"
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition"
            >
              Return to Quotations
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {success && (
            <div className="bg-success/10 text-success px-4 py-3 rounded-md mb-6">
              {success}
            </div>
          )}
          
          {/* Quotation Header */}
          <div className="rounded-xs border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-xl font-semibold text-black dark:text-white">Quotation Information</h2>
              
              <div className="flex items-center bg-gray-50 dark:bg-meta-4 rounded-md px-3 py-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mr-2">Quotation #:</span>
                <span className="bg-transparent py-1 px-2 text-sm font-medium">
                  {quotation.quotation_number || 'Not Available'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Info */}
              <div className="bg-gray-50 dark:bg-meta-4 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-black dark:text-white mb-3">Customer Details</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      name="customerName"
                      value={quotation.customerName || ''}
                      onChange={handleChange}
                      className="w-full rounded-sm border-[1.5px] border-stroke bg-white dark:bg-boxdark py-2 px-3 text-sm outline-hidden focus:border-primary"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                      Contact Number
                    </label>
                    <input
                      type="text"
                      name="customerContact"
                      value={quotation.customerContact || ''}
                      onChange={handleChange}
                      className="w-full rounded-sm border-[1.5px] border-stroke bg-white dark:bg-boxdark py-2 px-3 text-sm outline-hidden focus:border-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                      Address
                    </label>
                    <textarea
                      name="customerAddress"
                      value={quotation.customerAddress || ''}
                      onChange={handleChange}
                      rows={3}
                      className="w-full rounded-sm border-[1.5px] border-stroke bg-white dark:bg-boxdark py-2 px-3 text-sm outline-hidden focus:border-primary"
                    ></textarea>
                  </div>
                </div>
              </div>
              
              {/* Quotation Details */}
              <div className="bg-gray-50 dark:bg-meta-4 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-black dark:text-white mb-3">Quotation Details</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                        Date
                      </label>
                      <input
                        type="date"
                        name="quotationDate"
                        value={quotation.quotationDate || ''}
                        onChange={handleChange}
                        className="w-full rounded-sm border-[1.5px] border-stroke bg-white dark:bg-boxdark py-2 px-3 text-sm outline-hidden focus:border-primary"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                        Valid Until
                      </label>
                      <input
                        type="date"
                        name="validUntil"
                        value={quotation.validUntil || ''}
                        onChange={handleChange}
                        className="w-full rounded-sm border-[1.5px] border-stroke bg-white dark:bg-boxdark py-2 px-3 text-sm outline-hidden focus:border-primary"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                      Sales Representative
                    </label>
                    <input
                      type="text"
                      name="salesRepresentative"
                      value={quotation.salesRepresentative || ''}
                      onChange={handleChange}
                      className="w-full rounded-sm border-[1.5px] border-stroke bg-white dark:bg-boxdark py-2 px-3 text-sm outline-hidden focus:border-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                      Status
                    </label>
                    <select
                      name="status"
                      value={quotation.status || 'draft'}
                      onChange={handleChange}
                      className="w-full rounded-sm border-[1.5px] border-stroke bg-white dark:bg-boxdark py-2 px-3 text-sm outline-hidden focus:border-primary"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Items Section */}
          <div className="rounded-xs border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-black dark:text-white">
                Quotation Items
              </h2>
              
              <button
                type="button"
                onClick={addItem}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition"
              >
                Add Item
              </button>
            </div>
            
            {loadingProducts ? (
              <div className="flex justify-center items-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span className="ml-2">Loading products...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-meta-4">
                      <th className="p-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                        Category / Subcategory
                      </th>
                      <th className="p-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                        Product / Description
                      </th>
                      <th className="p-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 w-24">
                        Quantity
                      </th>
                      <th className="p-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 w-24">
                        Unit
                      </th>
                      <th className="p-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400 w-32">
                        Unit Price
                      </th>
                      <th className="p-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400 w-32">
                        Total
                      </th>
                      <th className="p-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400 w-16">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-gray-500 dark:text-gray-400">
                          No items added to this quotation yet. Click &quot;Add Item&quot; to begin.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, index) => (
                        <tr key={item.id} className="border-b border-stroke dark:border-strokedark">
                          <td className="p-3">
                            <div className="grid grid-cols-1 gap-2">
                              <select
                                value={item.category || ''}
                                onChange={(e) => {
                                  // Reset subcategory when category changes
                                  const newCategory = e.target.value;
                                  const newSubcategory = subcategories[newCategory]?.[0] || '';
                                  
                                  handleItemChange(index, 'category', newCategory);
                                  handleItemChange(index, 'subcategory', newSubcategory);
                                  handleItemChange(index, 'product_id', null);
                                }}
                                className="w-full rounded-sm border-[1.5px] border-stroke bg-white dark:bg-boxdark py-1.5 px-2 text-sm outline-hidden focus:border-primary"
                              >
                                <option value="">Select Category</option>
                                {categories.map((category) => (
                                  <option key={category} value={category}>
                                    {category}
                                  </option>
                                ))}
                              </select>
                              
                              <select
                                value={item.subcategory || ''}
                                onChange={(e) => {
                                  handleItemChange(index, 'subcategory', e.target.value);
                                  handleItemChange(index, 'product_id', null);
                                }}
                                disabled={!item.category}
                                className="w-full rounded-sm border-[1.5px] border-stroke bg-white dark:bg-boxdark py-1.5 px-2 text-sm outline-hidden focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                <option value="">Select Subcategory</option>
                                {item.category && subcategories[item.category]?.map((subcategory) => (
                                  <option key={subcategory} value={subcategory}>
                                    {subcategory}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="grid grid-cols-1 gap-2">
                              <select
                                value={item.product_id || ''}
                                onChange={(e) => handleItemChange(index, 'product_id', e.target.value ? parseInt(e.target.value) : null)}
                                disabled={!item.subcategory}
                                className="w-full rounded-sm border-[1.5px] border-stroke bg-white dark:bg-boxdark py-1.5 px-2 text-sm outline-hidden focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                <option value="">Select Product</option>
                                {item.category && item.subcategory && products[item.category]?.[item.subcategory]?.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.name} - {formatCurrency(product.price)}/{product.unit}
                                  </option>
                                ))}
                              </select>
                              
                              <input
                                type="text"
                                value={item.description || ''}
                                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                placeholder="Description"
                                className="w-full rounded-sm border-[1.5px] border-stroke bg-white dark:bg-boxdark py-1.5 px-2 text-sm outline-hidden focus:border-primary"
                              />
                            </div>
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              value={item.quantity || 0}
                              onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                              min="0.01"
                              step="0.01"
                              className="w-full rounded-sm border-[1.5px] border-stroke bg-white dark:bg-boxdark py-1.5 px-2 text-sm outline-hidden focus:border-primary"
                            />
                          </td>
                          <td className="p-3">
                            <select
                              value={item.unit || 'unit'}
                              onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                              className="w-full rounded-sm border-[1.5px] border-stroke bg-white dark:bg-boxdark py-1.5 px-2 text-sm outline-hidden focus:border-primary"
                            >
                              <option value="unit">Unit</option>
                              <option value="meter">Meter</option>
                              <option value="roll">Roll</option>
                              <option value="set">Set</option>
                              <option value="pack">Pack</option>
                              <option value="box">Box</option>
                              <option value="kg">KG</option>
                              <option value="liter">Liter</option>
                              <option value="hour">Hour</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              value={item.unit_price || 0}
                              onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              className="w-full rounded-sm border-[1.5px] border-stroke bg-white dark:bg-boxdark py-1.5 px-2 text-sm outline-hidden focus:border-primary text-right"
                            />
                          </td>
                          <td className="p-3 text-right font-medium">
                            {formatCurrency(item.total || 0)}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-danger hover:text-danger/80"
                              title="Remove item"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-meta-4">
                      <td colSpan={4} className="p-3"></td>
                      <td className="p-3 text-right font-medium text-gray-900 dark:text-white">Subtotal</td>
                      <td className="p-3 text-right font-medium text-gray-900 dark:text-white">
                        {formatCurrency(quotation.subtotal || 0)}
                      </td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="p-3"></td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <span>Discount (%)</span>
                          <input
                            type="number"
                            name="discount"
                            value={quotation.discount || 0}
                            onChange={handleChange}
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-16 rounded-sm border-[1.5px] border-stroke bg-white dark:bg-boxdark py-1 px-2 text-sm outline-hidden focus:border-primary text-right"
                          />
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        {formatCurrency((quotation.subtotal || 0) * ((quotation.discount || 0) / 100))}
                      </td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="p-3"></td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <span>Tax (%)</span>
                          <input
                            type="number"
                            name="tax"
                            value={quotation.tax || 0}
                            onChange={handleChange}
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-16 rounded-sm border-[1.5px] border-stroke bg-white dark:bg-boxdark py-1 px-2 text-sm outline-hidden focus:border-primary text-right"
                          />
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        {formatCurrency(
                          ((quotation.subtotal || 0) - ((quotation.subtotal || 0) * ((quotation.discount || 0) / 100))) * 
                          ((quotation.tax || 0) / 100)
                        )}
                      </td>
                      <td></td>
                    </tr>
                    <tr className="bg-primary/5 dark:bg-primary/20 border-t-2 border-b-2 border-stroke dark:border-strokedark">
                      <td colSpan={4} className="p-3"></td>
                      <td className="p-3 text-right font-semibold text-gray-900 dark:text-white">Total</td>
                      <td className="p-3 text-right font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(quotation.total || 0)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
          
          {/* Notes & Terms */}
          <div className="rounded-xs border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={quotation.notes || ''}
                  onChange={handleChange}
                  rows={4}
                  className="w-full rounded-sm border-[1.5px] border-stroke bg-white dark:bg-boxdark py-2 px-3 text-sm outline-hidden focus:border-primary"
                  placeholder="Additional notes for the customer"
                ></textarea>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Terms & Conditions
                </label>
                <textarea
                  name="terms"
                  value={quotation.terms || ''}
                  onChange={handleChange}
                  rows={4}
                  className="w-full rounded-sm border-[1.5px] border-stroke bg-white dark:bg-boxdark py-2 px-3 text-sm outline-hidden focus:border-primary"
                  placeholder="Standard terms and conditions"
                ></textarea>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mb-6">
            <Link
              href="/sales/quotation"
              className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-meta-4 dark:hover:bg-meta-3 text-gray-700 dark:text-gray-300 rounded-md transition"
            >
              Cancel
            </Link>
            
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-md transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </div>
              ) : (
                'Save Changes'
              )}
            </button>
            
            {quotation.status === 'draft' && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e, 'sent')}
                disabled={saving}
                className="px-6 py-2.5 bg-success hover:bg-success/90 text-white rounded-md transition disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {saving ? 'Processing...' : 'Save & Mark as Sent'}
              </button>
            )}
          </div>
        </form>
      )}
    </DefaultLayout>
  );
}
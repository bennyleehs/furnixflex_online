'use client';

import { useState, useEffect } from 'react';
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';

// Product interface
interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  price: number;
  discount: number; // Add discount field
  unit: string;
  created_at?: string;
  updated_at?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<Record<string, string[]>>({});
  
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterSubcategory, setFilterSubcategory] = useState<string>('');
  
  // Form states
  const [formData, setFormData] = useState<Partial<Omit<Product, 'price'>> & { price: number | string }>({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    price: 0,
    discount: 0, // Add default discount
    unit: 'unit'
  });
  
  // New category/subcategory fields
  const [newCategory, setNewCategory] = useState('');
  const [newSubcategory, setNewSubcategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewSubcategory, setShowNewSubcategory] = useState(false);
  
  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sales/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const data = await response.json();
      setProducts(data.allProducts || []);
      setCategories(data.categories || []);
      setSubcategories(data.subcategories || {});
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Load products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);
  
  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      subcategory: '',
      price: 0,
      discount: 0, // Reset discount
      unit: 'unit'
    });
    setIsEditing(false);
    setShowNewCategory(false);
    setShowNewSubcategory(false);
    setNewCategory('');
    setNewSubcategory('');
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Use data from new category/subcategory fields if shown
      const categoryToUse = showNewCategory ? newCategory : formData.category;
      const subcategoryToUse = showNewSubcategory ? newSubcategory : formData.subcategory;
      
      if (!categoryToUse || !subcategoryToUse || !formData.name || formData.price === undefined) {
        alert('Please fill in all required fields');
        return;
      }
      
      const productData = {
        ...formData,
        category: categoryToUse,
        subcategory: subcategoryToUse,
        price: typeof formData.price === 'string' ? parseFloat(formData.price) || 0 : formData.price,
        discount: formData.discount || 0 // Ensure discount is included
      };
      
      let response;
      
      if (isEditing && formData.id) {
        // Update existing product
        response = await fetch(`/api/sales/products?id=${formData.id}`, {
          method: 'PUT',
          headers:
           {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(productData)
        });
      } else {
        // Create new product
        response = await fetch('/api/sales/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(productData)
        });
      }
      
      if (!response.ok) throw new Error('Failed to save product');
      
      // Refresh product list
      fetchProducts();
      
      // Close form and reset data
      setShowForm(false);
      resetForm();
      
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product');
    }
  };
  
  // Handle edit product
  const handleEdit = (product: Product) => {
    setFormData({
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      subcategory: product.subcategory,
      price: product.price,
      discount: product.discount || 0, // Include discount when editing
      unit: product.unit
    });
    setIsEditing(true);
    setShowForm(true);
    setShowNewCategory(false);
    setShowNewSubcategory(false);
  };
  
  // Handle delete product
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/sales/products?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete product');
      
      // Refresh product list
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };
  
  // Filter products based on search and category filters
  const filteredProducts = products.filter(product => {
    return (
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterCategory === '' || product.category === filterCategory) &&
      (filterSubcategory === '' || product.subcategory === filterSubcategory)
    );
  });
  
  return (
    <DefaultLayout>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <Breadcrumb noHeader={true} pageName="Products Management" />
        
        <div className="mt-3 md:mt-0">
          <button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition"
          >
            {showForm ? 'Cancel' : 'Add New Product'}
          </button>
        </div>
      </div>
      
      {/* Product Form */}
      {showForm && (
        <div className="mb-8 rounded-xs border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <h4 className="mb-4 text-lg font-semibold text-black dark:text-white">
            {isEditing ? 'Edit Product' : 'Add New Product'}
          </h4>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Product Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full rounded-sm border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-hidden transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary"
                  placeholder="Enter product name"
                  required
                />
              </div>
              
              {/* Product Price - Allow negative values */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Price (RM) *
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    if (inputValue === '-' || inputValue === '') {
                      // Keep the raw string value during typing
                      setFormData({...formData, price: inputValue});
                    } else {
                      // Convert to number once we have a valid number
                      setFormData({...formData, price: parseFloat(inputValue) || 0});
                    }
                 }}
                  // Removed min="0" to allow negative values
                  step="0.01"
                  className="w-full rounded-sm border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-hidden transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary"
                  placeholder="0.00"
                  required
                />
              </div>
              
              {/* Discount Percentage Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Discount (%)
                </label>
                <input
                  type="number"
                  value={formData.discount}
                  onChange={(e) => setFormData({...formData, discount: parseFloat(e.target.value) || 0})}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full rounded-sm border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-hidden transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary"
                  placeholder="0.0"
                />
              </div>
              
              {/* Category */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Category *
                </label>
                {showNewCategory ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full rounded-sm border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-hidden transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary"
                      placeholder="Enter new category"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewCategory(false)}
                      className="py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-meta-4 dark:hover:bg-meta-3 rounded-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        setFormData({
                          ...formData, 
                          category: e.target.value,
                          subcategory: '' // Reset subcategory when category changes
                        });
                      }}
                      className="w-full rounded-sm border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-hidden transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary"
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewCategory(true)}
                      className="py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-meta-4 dark:hover:bg-meta-3 rounded-sm"
                    >
                      New
                    </button>
                  </div>
                )}
              </div>
              
              {/* Subcategory */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Subcategory *
                </label>
                {showNewSubcategory ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSubcategory}
                      onChange={(e) => setNewSubcategory(e.target.value)}
                      className="w-full rounded-sm border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-hidden transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary"
                      placeholder="Enter new subcategory"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewSubcategory(false)}
                      className="py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-meta-4 dark:hover:bg-meta-3 rounded-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      value={formData.subcategory}
                      onChange={(e) => setFormData({...formData, subcategory: e.target.value})}
                      className="w-full rounded-sm border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-hidden transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary"
                      disabled={!formData.category}
                      required
                    >
                      <option value="">Select Subcategory</option>
                      {formData.category && subcategories[formData.category]?.map((subcategory) => (
                        <option key={subcategory} value={subcategory}>
                          {subcategory}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewSubcategory(true)}
                      className="py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-meta-4 dark:hover:bg-meta-3 rounded-sm"
                      disabled={!formData.category && !showNewCategory}
                    >
                      New
                    </button>
                  </div>
                )}
              </div>
              
              {/* Unit */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Unit
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  className="w-full rounded-sm border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-hidden transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary"
                >
                  <option value="unit">Unit</option>
                  <option value="meter">Meter</option>
                  <option value="roll">Roll</option>
                  <option value="set">Set</option>
                  <option value="pack">Pack</option>
                  <option value="box">Box</option>
                  <option value="kg">Kilogram</option>
                  <option value="liter">Liter</option>
                  <option value="hour">Hour</option>
                </select>
              </div>
              
              {/* Description */}
              <div className="mb-4 md:col-span-2">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full rounded-sm border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-hidden transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary"
                  placeholder="Enter product description"
                ></textarea>
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition"
              >
                {isEditing ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Search and Filter */}
      <div className="mb-6 rounded-xs border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-sm border-[1.5px] border-stroke bg-transparent py-2 px-4 text-sm outline-hidden transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setFilterSubcategory(''); // Reset subcategory filter when category changes
              }}
              className="w-full rounded-sm border-[1.5px] border-stroke bg-transparent py-2 px-4 text-sm outline-hidden transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Subcategory</label>
            <select
              value={filterSubcategory}
              onChange={(e) => setFilterSubcategory(e.target.value)}
              className="w-full rounded-sm border-[1.5px] border-stroke bg-transparent py-2 px-4 text-sm outline-hidden transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary"
              disabled={!filterCategory}
            >
              <option value="">All Subcategories</option>
              {filterCategory && subcategories[filterCategory]?.map((subcategory) => (
                <option key={subcategory} value={subcategory}>{subcategory}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterCategory('');
                setFilterSubcategory('');
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition dark:bg-meta-4 dark:hover:bg-meta-3 dark:text-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>
      
      {/* Products Table */}
      <div className="rounded-xs border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-50 dark:bg-meta-4 text-left">
                <th className="py-4 px-4 font-medium text-gray-500 dark:text-gray-400">Product</th>
                <th className="py-4 px-4 font-medium text-gray-500 dark:text-gray-400">Category</th>
                <th className="py-4 px-4 font-medium text-gray-500 dark:text-gray-400">Subcategory</th>
                <th className="py-4 px-4 font-medium text-gray-500 dark:text-gray-400 text-right">Price (RM)</th>
                <th className="py-4 px-4 font-medium text-gray-500 dark:text-gray-400 text-center">Discount</th>
                <th className="py-4 px-4 font-medium text-gray-500 dark:text-gray-400">Unit</th>
                <th className="py-4 px-4 font-medium text-gray-500 dark:text-gray-400 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-5 px-4 text-center">
                    <div className="flex items-center justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      <span className="ml-2">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-5 px-4 text-center">
                    No products found
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-stroke dark:border-strokedark">
                    <td className="py-4 px-4">
                      <h5 className="font-medium text-black dark:text-white">{product.name}</h5>
                      {product.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{product.description}</p>
                      )}
                    </td>
                    <td className="py-4 px-4">{product.category}</td>
                    <td className="py-4 px-4">{product.subcategory}</td>
                    <td className="py-4 px-4 text-right font-medium">
                      {/* Display price with different styling for negative values */}
                      <span className={product.price < 0 ? "text-danger" : ""}>
                        {parseFloat(product.price as any).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {product.discount > 0 ? (
                        <span className="bg-success/10 text-success px-2 py-1 rounded-full text-xs">
                          {product.discount}%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4">{product.unit}</td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center space-x-3.5">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-primary hover:text-primary/80"
                          title="Edit product"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-danger hover:text-danger/80"
                          title="Delete product"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
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
      </div>
    </DefaultLayout>
  );
}
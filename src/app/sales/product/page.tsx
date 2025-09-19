"use client";
import { useState, useEffect, useRef } from "react";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import usePermissions from "@/hooks/usePermissions";

// Product interface
interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  price: number;
  discount: number;
  unit: string;
  effective_start_date?: Date | null;
  effective_end_date?: Date | null;
  task_id?: string;
  created_at?: string;
  updated_at?: string;
}

const title = "Products Management";
const MENU = "2";
const SUBMENU = "1";
const PERMISSION_PREFIX = `${MENU}.${SUBMENU}`;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<Record<string, string[]>>(
    {},
  );

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Search and filter
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterSubcategory, setFilterSubcategory] = useState<string>("");

  // Form states
  const [formData, setFormData] = useState<
    Partial<Omit<Product, "price">> & {
      price: number | string;
      effective_start_date: Date | null;
      effective_end_date: Date | null;
      task_id?: string;
    }
  >({
    name: "",
    description: "",
    category: "",
    subcategory: "",
    price: 0,
    discount: 0,
    unit: "unit",
    effective_start_date: null,
    effective_end_date: null,
    task_id: "",
  });

  // New category/subcategory fields
  const [newCategory, setNewCategory] = useState("");
  const [newSubcategory, setNewSubcategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewSubcategory, setShowNewSubcategory] = useState(false);
  const [newUnit, setNewUnit] = useState("");
  const [showNewUnit, setShowNewUnit] = useState(false);

  const { canEdit, canCreate, canDelete, loadingPermissions } =
    usePermissions();

  const getMenuSubmenu = (
    permissionPrefix?: string,
  ): { menu: string; submenu: string } | null => {
    if (!permissionPrefix) {
      return null;
    }
    const parts = permissionPrefix.split(".");
    if (parts.length >= 2) {
      return { menu: parts[0], submenu: parts[1] };
    }
    return null;
  };

  const createMenuSubmenu = getMenuSubmenu(PERMISSION_PREFIX);
  const editMenuSubmenu = getMenuSubmenu(PERMISSION_PREFIX);
  const deleteMenuSubmenu = getMenuSubmenu(PERMISSION_PREFIX);
  // const monitorMenuSubmenu = getMenuSubmenu(PERMISSION_PREFIX);

  // Ref for the form
  const formRef = useRef<HTMLDivElement>(null);

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sales/products");
      if (!response.ok) throw new Error("Failed to fetch products");

      const data = await response.json();
      console.log("API Response:", data); // Check the actual structure

      // Try this if your API returns a different structure
      setProducts(
        Array.isArray(data.products)
          ? data.products
          : Array.isArray(data.allProducts)
            ? data.allProducts
            : [],
      );
      console.log("Products loaded:", data.products || data.allProducts || []);
      setCategories(data.categories || []);
      setSubcategories(data.subcategories || {});
    } catch (error) {
      console.error("Error fetching products:", error);
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
      name: "",
      description: "",
      category: "",
      subcategory: "",
      price: 0,
      discount: 0,
      unit: "unit",
      effective_start_date: null,
      effective_end_date: null,
      task_id: "",
    });
    setIsEditing(false);
    setShowNewCategory(false);
    setShowNewSubcategory(false);
    setNewCategory("");
    setNewSubcategory("");
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Use data from new category/subcategory fields if shown
      const categoryToUse = showNewCategory ? newCategory : formData.category;
      const subcategoryToUse = showNewSubcategory
        ? newSubcategory
        : formData.subcategory;
      const unitToUse = showNewUnit ? newUnit : formData.unit;

      if (
        !categoryToUse ||
        !subcategoryToUse ||
        !formData.name ||
        formData.price === undefined
      ) {
        alert("Please fill in all required fields");
        return;
      }

      const productData = {
        ...formData,
        category: categoryToUse,
        subcategory: subcategoryToUse,
        unit: unitToUse,
        price:
          typeof formData.price === "string"
            ? parseFloat(formData.price) || 0
            : formData.price,
        discount: formData.discount || 0,
        // Convert dates to ISO strings for API
        effective_start_date: formData.effective_start_date
          ? formData.effective_start_date.toISOString()
          : null,
        effective_end_date: formData.effective_end_date
          ? formData.effective_end_date.toISOString()
          : null,
      };

      let response;

      if (isEditing && formData.id) {
        // Update existing product
        response = await fetch(`/api/sales/products?id=${formData.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(productData),
        });
      } else {
        // Create new product
        response = await fetch("/api/sales/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(productData),
        });
      }

      if (!response.ok) throw new Error("Failed to save product");

      // Refresh product list
      fetchProducts();

      // Close form and reset data
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Failed to save product");
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
      discount: product.discount || 0,
      unit: product.unit,
      effective_start_date: product.effective_start_date
        ? new Date(product.effective_start_date)
        : null,
      effective_end_date: product.effective_end_date
        ? new Date(product.effective_end_date)
        : null,
      task_id: product.task_id,
    });
    setIsEditing(true);
    setShowForm(true);
    setShowNewCategory(false);
    setShowNewSubcategory(false);

    // Give React time to render the form before scrolling
    setTimeout(() => {
      if (formRef.current) {
        // Scroll the form into view with smooth behavior
        formRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        // Find the first input in the form and focus it
        const firstInput = formRef.current.querySelector(
          "input, select, textarea",
        ) as HTMLElement;
        if (firstInput) {
          firstInput.focus();
        }
      }
    }, 100);
  };

  // Handle delete product
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      const response = await fetch(`/api/sales/products?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete product");

      // Refresh product list
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product");
    }
  };

  // Filter products based on search and category filters
  const filteredProducts = products.filter((product) => {
    return (
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterCategory === "" || product.category === filterCategory) &&
      (filterSubcategory === "" || product.subcategory === filterSubcategory)
    );
  });

  return (
    <DefaultLayout>
      <div className="mb-6 flex flex-col items-center justify-between md:flex-row">
        <Breadcrumb noHeader={true} pageName={title} />

        <div className="mt-3 md:mt-0">
          {/* Add New Product button */}
          {!loadingPermissions && (
            <>
              {createMenuSubmenu &&
                canCreate(
                  createMenuSubmenu.menu,
                  createMenuSubmenu.submenu,
                ) && (
                  <button
                    onClick={() => {
                      resetForm();
                      setShowForm(!showForm);
                    }}
                    className="bg-primary hover:bg-primarydark rounded-md px-4 py-2 text-white transition"
                  >
                    {showForm ? "Cancel" : "Add New Product"}
                  </button>
                )}
            </>
          )}
        </div>
      </div>

      {/* Product Form */}
      {showForm && (
        <div
          ref={formRef}
          className={`mb-8 rounded-sm border ${
            isEditing
              ? "border-primary/50 dark:border-primary/30 shadow-lg"
              : "border-stroke dark:border-strokedark"
          } shadow-default dark:bg-boxdark bg-white p-6`}
        >
          {/* Form title with special edit indicator */}
          <h4 className="mb-4 flex items-center text-lg font-semibold text-black dark:text-white">
            {isEditing ? (
              <>
                <span className="text-primary mr-2">
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
                </span>
                Edit Product: {formData.name}
              </>
            ) : (
              "Add New Product"
            )}
          </h4>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {/* Category */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                  Category *
                </label>
                {showNewCategory ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none"
                      placeholder="Enter new category"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewCategory(false)}
                      className="dark:bg-meta-4 dark:hover:bg-meta-3 rounded bg-gray-100 px-4 py-3 hover:bg-gray-200"
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
                          subcategory: "", // Reset subcategory when category changes
                        });
                      }}
                      className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none"
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
                      className="dark:bg-meta-4 dark:hover:bg-meta-3 rounded bg-gray-100 px-4 py-3 hover:bg-gray-200"
                    >
                      New
                    </button>
                  </div>
                )}
              </div>

              {/* Subcategory */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                  Subcategory *
                </label>
                {showNewSubcategory ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSubcategory}
                      onChange={(e) => setNewSubcategory(e.target.value)}
                      className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none"
                      placeholder="Enter new subcategory"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewSubcategory(false)}
                      className="dark:bg-meta-4 dark:hover:bg-meta-3 rounded bg-gray-100 px-4 py-3 hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      value={formData.subcategory}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          subcategory: e.target.value,
                        })
                      }
                      className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none"
                      disabled={!formData.category}
                      required
                    >
                      <option value="">Select Subcategory</option>
                      {formData.category &&
                        subcategories[formData.category]?.map((subcategory) => (
                          <option key={subcategory} value={subcategory}>
                            {subcategory}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewSubcategory(true)}
                      className="dark:bg-meta-4 dark:hover:bg-meta-3 rounded bg-gray-100 px-4 py-3 hover:bg-gray-200"
                      disabled={!formData.category && !showNewCategory}
                    >
                      New
                    </button>
                  </div>
                )}
              </div>

              {/* Product Name */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none"
                  placeholder="Enter product name"
                  required
                />
              </div>

              {/* Unit */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                  Unit
                </label>
                {showNewUnit ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none"
                      placeholder="Enter new unit"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewUnit(false)}
                      className="dark:bg-meta-4 dark:hover:bg-meta-3 rounded bg-gray-100 px-4 py-3 hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      value={formData.unit}
                      onChange={(e) =>
                        setFormData({ ...formData, unit: e.target.value })
                      }
                      className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none"
                    >
                      <option value="unit">Unit</option>
                      <option value="set">Set</option>
                      <option value="feet">Feet</option>
                      <option value="trip">Trip</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewUnit(true)}
                      className="dark:bg-meta-4 dark:hover:bg-meta-3 rounded bg-gray-100 px-4 py-3 hover:bg-gray-200"
                    >
                      New
                    </button>
                  </div>
                )}
              </div>

              {/* Product Price */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                  Price (RM) *
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    if (inputValue === "-" || inputValue === "") {
                      // Keep the raw string value during typing
                      setFormData({ ...formData, price: inputValue });
                    } else {
                      // Convert to number once we have a valid number
                      setFormData({
                        ...formData,
                        price: parseFloat(inputValue) || 0,
                      });
                    }
                  }}
                  step="0.01"
                  className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Discount Percentage Field */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                  Discount (%)
                </label>
                <input
                  type="number"
                  value={formData.discount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discount: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="0"
                  max="100"
                  step="0.1"
                  className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none"
                  placeholder="0.0"
                />
              </div>

              {/* Task ID */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                  Task ID
                </label>
                <input
                  type="text"
                  value={formData.task_id || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, task_id: e.target.value })
                  }
                  className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none"
                  placeholder="Associated task ID"
                />
              </div>

              {/* Effective Duration - Start Date */}
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                      Start Date
                    </label>
                    <DatePicker
                      selected={formData.effective_start_date}
                      onChange={(date: Date | null) =>
                        setFormData({ ...formData, effective_start_date: date })
                      }
                      className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none"
                      placeholderText="Select start date"
                      dateFormat="dd/MM/yyyy"
                    />
                  </div>
                  <div>
                    <label className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                      End Date
                    </label>
                    <DatePicker
                      selected={formData.effective_end_date}
                      onChange={(date: Date | null) =>
                        setFormData({ ...formData, effective_end_date: date })
                      }
                      className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none"
                      placeholderText="Select end date"
                      dateFormat="dd/MM/yyyy"
                      minDate={formData.effective_start_date || undefined}
                    />
                  </div>
                </div>
              </div>

              {/* Effective Duration - End Date */}
              {/* <div className="mb-4"></div> */}

              {/* Add this new field block after the Task ID input field */}
              {/* Description - Now placed in the same row but spans 3 columns */}
              <div className="mb-4 md:col-span-3">
                <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none"
                  placeholder="Enter product description"
                ></textarea>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 transition hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 ${
                  isEditing
                    ? "bg-primary hover:bg-primary/90"
                    : "bg-blue-600 hover:bg-blue-700"
                } rounded-md text-white transition`}
              >
                {isEditing ? "Update Product" : "Add Product"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filter */}
      <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark mb-6 rounded-lg border bg-white p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-4 py-2 text-sm transition outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
              Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setFilterSubcategory(""); // Reset subcategory filter when category changes
              }}
              className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary dark:active:border-primary w-full rounded border-[1.5px] bg-transparent px-4 py-2 text-sm transition outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
              Subcategory
            </label>
            <select
              value={filterSubcategory}
              onChange={(e) => setFilterSubcategory(e.target.value)}
              className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary dark:active:border-primary w-full rounded border-[1.5px] bg-transparent px-4 py-2 text-sm transition outline-none"
              disabled={!filterCategory}
            >
              <option label="Choose category required" disabled></option>
              {filterCategory &&
                subcategories[filterCategory]?.map((subcategory) => (
                  <option key={subcategory} value={subcategory}>
                    {subcategory}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm("");
                setFilterCategory("");
                setFilterSubcategory("");
              }}
              className="hover:bg-primary dark:bg-meta-4 dark:hover:bg-primarydark rounded-md bg-gray-100 px-4 py-2 text-gray-700 transition hover:text-white dark:text-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-lg border bg-white px-5 pt-6 pb-2.5">
        <div className="relative max-w-full overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="dark:bg-meta-4 bg-gray-50 text-left">
                <th className="px-4 py-4 font-medium text-black dark:text-white">
                  Category
                </th>
                <th className="min-w-[180px] px-4 py-4 font-medium text-black dark:text-white">
                  Subcategory
                </th>
                <th className="min-w-[300px] px-4 py-4 font-medium text-black dark:text-white">
                  Product
                </th>
                <th className="min-w-[140px] px-4 py-4 text-right font-medium text-black dark:text-white">
                  Price (RM)
                </th>
                <th className="px-4 py-4 text-center font-medium text-black dark:text-white">
                  Discount
                </th>
                <th className="px-4 py-4 font-medium text-black dark:text-white">
                  Unit
                </th>
                <th className="px-4 py-4 font-medium text-black dark:text-white">
                  Effective Duration
                </th>
                <th className="min-w-[140px] px-4 py-4 font-medium text-black dark:text-white">
                  Task ID
                </th>
                <th className="bg-gray-2 dark:bg-meta-4 sticky right-0 z-10 min-w-[120px] px-4 py-4 text-center font-medium text-black dark:text-white">
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
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-5 text-center">
                    No products found
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="border-stroke dark:border-strokedark border-b"
                  >
                    <td className="px-4 py-4">{product.category}</td>
                    <td className="px-4 py-4">{product.subcategory}</td>
                    <td className="px-4 py-4">
                      <h5 className="font-medium text-black dark:text-white">
                        {product.name}
                      </h5>
                      {product.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {product.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right font-medium">
                      {/* Display price with different styling for negative values */}
                      <span
                        className={
                          product.price < 0
                            ? "text-danger"
                            : "text-black dark:text-white"
                        }
                      >
                        {parseFloat(product.price as any).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {product.discount > 0 ? (
                        <span className="bg-success/10 text-success rounded-full px-2 py-1 text-sm">
                          {product.discount}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">{product.unit}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        {product.effective_start_date ? (
                          <div className="mb-1">
                            <span className="text-sm">
                              {new Date(
                                product.effective_start_date,
                              ).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        ) : null}

                        {product.effective_end_date ? (
                          <div>
                            <span className="text-sm">
                              {new Date(
                                product.effective_end_date,
                              ).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        ) : null}

                        {!product.effective_start_date &&
                          !product.effective_end_date && (
                            <span className="text-xs text-gray-400">
                              &nbsp;
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {product.task_id ? (
                        <span className="bg-info/10 text-info rounded px-2 py-1 text-sm">
                          {product.task_id}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="dark:border-strokedark dark:bg-boxdark sticky right-0 z-10 border-b border-[#eee] bg-white px-4 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {!loadingPermissions && ( // Only render buttons if permissions are loaded
                          <>
                            {editMenuSubmenu &&
                              canEdit(
                                editMenuSubmenu.menu,
                                editMenuSubmenu.submenu,
                              ) && (
                                <button
                                  onClick={() => handleEdit(product)}
                                  className="text-primary hover:text-primary/80"
                                  title="Edit product"
                                >
                                  <svg
                                    className="h-5 w-5 fill-current"
                                    viewBox="0 0 576 512"
                                  >
                                    <path
                                      d="M402.3 344.9l32-32c5-5 13.7-1.5 13.7 5.7V464c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V112c0-26.5 21.5-48 48-48h273.5c7.1 0 10.7 8.6 5.7 13.7l-32 32c-1.5 1.5-3.5 2.3-5.7 2.3H48v352h352V350.5c0-2.1 .8-4.1 2.3-5.6zm156.6-201.8L296.3 405.7l-90.4 10c-26.2 2.9-48.5-19.2-45.6-45.6l10-90.4L432.9 17.1c22.9-22.9 59.9-22.9 82.7 0l43.2 43.2c22.9-22.9 22.9 60 .1 82.8zM460.1 174L402 115.9 216.2 301.8l-7.3 65.3 65.3-7.3L460.1 174zm64.8-79.7l-43.2-43.2c-4.1-4.1-10.8-4.1-14.8 0L436 82l58.1 58.1 30.9-30.9c4-4.2 4-10.8-.1-14.9z"
                                      fill=""
                                    />
                                  </svg>
                                </button>
                              )}
                            {deleteMenuSubmenu &&
                              canDelete(
                                deleteMenuSubmenu.menu,
                                deleteMenuSubmenu.submenu,
                              ) && (
                                <button
                                  onClick={() => handleDelete(product.id)}
                                  className="text-danger hover:text-danger/80"
                                  title="Delete product"
                                >
                                  <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    <line
                                      x1="10"
                                      y1="11"
                                      x2="10"
                                      y2="17"
                                    ></line>
                                    <line
                                      x1="14"
                                      y1="11"
                                      x2="14"
                                      y2="17"
                                    ></line>
                                  </svg>
                                </button>
                              )}
                          </>
                        )}
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

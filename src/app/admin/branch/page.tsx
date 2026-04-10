"use client";

import { useEffect, useState } from "react";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import usePermissions from "@/hooks/usePermissions";
import countriesData from "@/../public/data/countries.json";

const PERMISSION_PREFIX = "1.1";

interface Branch {
  id: number;
  name: string;
  ref: string;
  idd: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  postcode: string;
  city: string;
  state: string;
  country: string;
  company_name: string;
  company_reg: string;
  bank_name: string;
  bank_account: string;
  bank_swift: string;
  time_zone: string;
  currencies_code: string;
  currencies_symbol: string;
  status: string;
}

interface LocalCountry {
  name: string;
  idd: string;
  time_zone: string;
  currency_name: string;
  currency: string;
  currency_symbol: string;
  states: { name: string; cities: string[] }[];
}

export default function BranchPage() {
  const [sidebarMenu, setSidebarMenu] = useState<{ name: string; menuItems: any[] }[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);

  const [countryFilter, setCountryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [formData, setFormData] = useState({
    country: "",
    time_zone: "",
    currencies_code: "",
    currencies_symbol: "",
    idd: "",
    name: "",
    ref: "",
    phone: "",
    email: "",
    address_line1: "",
    address_line2: "",
    postcode: "",
    city: "",
    state: "",
    company_name: "",
    company_reg: "",
    bank_name: "",
    bank_account: "",
    bank_swift: "",
    status: "Active",
  });

  const { canCreate, canEdit, canDelete, loadingPermissions } =
    usePermissions();

  const sidebarCountryName = sidebarMenu[0]?.name || "";
  const matchedCountry = (countriesData.countries as LocalCountry[]).find(
    (c) => c.name === sidebarCountryName
  );
  const sidebarCountryNames = sidebarMenu.map((item: { name: string }) => item.name);

  // Load sidebar menu from API (country-aware via middleware)
  useEffect(() => {
    const loadMenu = async () => {
      try {
        const res = await fetch("/api/admin/menu_items");
        if (res.ok) {
          const data = await res.json();
          setSidebarMenu(data);
        }
      } catch (err) {
        console.error("Failed to load menu:", err);
      }
    };
    loadMenu();
  }, []);

  // Update form defaults when sidebar data loads
  useEffect(() => {
    if (sidebarCountryName && matchedCountry) {
      setFormData(prev => ({
        ...prev,
        country: sidebarCountryName,
        time_zone: matchedCountry.time_zone || "",
        currencies_code: matchedCountry.currency || "",
        currencies_symbol: matchedCountry.currency_symbol || "",
        idd: matchedCountry.idd || "",
      }));
    }
  }, [sidebarCountryName, matchedCountry]);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/branch");

      if (!res.ok) {
        throw new Error("Failed to fetch branches");
      }

      const data = await res.json();
      setBranches(data.listBranch || []);
      setFilteredBranches(data.listBranch || []);
    } catch (err) {
      setError(
        "Error fetching branches: " +
          (err instanceof Error ? err.message : String(err)),
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    let filtered = [...branches];

    if (countryFilter) {
      filtered = filtered.filter((item) => item.country === countryFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    setFilteredBranches(filtered);
  }, [countryFilter, statusFilter, branches]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const openCreateModal = () => {
    setFormData({
      country: sidebarCountryName,
      time_zone: matchedCountry?.time_zone || "",
      currencies_code: matchedCountry?.currency || "",
      currencies_symbol: matchedCountry?.currency_symbol || "",
      idd: matchedCountry?.idd || "",
      name: "",
      ref: "",
      phone: "",
      email: "",
      address_line1: "",
      address_line2: "",
      postcode: "",
      city: "",
      state: "",
      company_name: "",
      company_reg: "",
      bank_name: "",
      bank_account: "",
      bank_swift: "",
      status: "Active",
    });
    setCurrentBranch(null);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setCurrentBranch(branch);
    setFormData({
      country: branch.country || "",
      time_zone: branch.time_zone || "",
      currencies_code: branch.currencies_code || "",
      currencies_symbol: branch.currencies_symbol || "",
      idd: branch.idd || "",
      name: branch.name || "",
      ref: branch.ref || "",
      phone: branch.phone || "",
      email: branch.email || "",
      address_line1: branch.address_line1 || "",
      address_line2: branch.address_line2 || "",
      postcode: branch.postcode || "",
      city: branch.city || "",
      state: branch.state || "",
      company_name: branch.company_name || "",
      company_reg: branch.company_reg || "",
      bank_name: branch.bank_name || "",
      bank_account: branch.bank_account || "",
      bank_swift: branch.bank_swift || "",
      status: branch.status || "Active",
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const createBranch = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      const response = await fetch("/api/admin/branch/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage = responseData?.message || "Failed to create branch";
        throw new Error(errorMessage);
      }

      await fetchBranches();
      closeModal();
      setError(null);
    } catch (err) {
      setError(
        "Error creating branch: " +
          (err instanceof Error ? err.message : String(err)),
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBranch) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/branch/create?id=${currentBranch.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage = responseData?.message || "Failed to update branch";
        throw new Error(errorMessage);
      }

      await fetchBranches();
      closeModal();
      setError(null);
    } catch (err) {
      setError(
        "Error updating branch: " +
          (err instanceof Error ? err.message : String(err)),
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsHistory = async (branch: Branch) => {
    if (!confirm("Are you sure you want to mark this branch as history?")) {
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...branch,
        status: "History",
      };

      const response = await fetch(`/api/admin/branch/create?id=${branch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => null);
      if (!response.ok || responseData?.error) {
        throw new Error(responseData?.message || "Failed to mark as history");
      }

      await fetchBranches();
      setError(null);
    } catch (err) {
      setError(
        "Error marking branch as history: " +
          (err instanceof Error ? err.message : String(err)),
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (isEditMode) {
      await updateBranch(e);
      return;
    }
    await createBranch(e);
  };

  const getCountryOptions = () =>
    [...new Set(branches.map((b) => b.country))].filter(Boolean).sort();

  const getStatusOptions = () =>
    [...new Set(branches.map((b) => b.status))].filter(Boolean).sort();

  return (
    <DefaultLayout>
      <Breadcrumb pageName="Branch Management" />

      <div className="flex flex-col gap-5">
        {isModalOpen && (
          <div
            className={`rounded-sm border ${
              isEditMode
                ? "border-primary/50 dark:border-primary/30 shadow-lg"
                : "border-stroke dark:border-strokedark"
            } shadow-default dark:bg-boxdark mb-5 w-full bg-white`}
          >
            <div className="border-stroke dark:border-strokedark flex items-center justify-between border-b px-6 py-4">
              <h4 className="flex items-center text-lg font-semibold text-black dark:text-white">
                {isEditMode
                  ? `Edit Branch (${currentBranch?.id ?? ""})`
                  : "Add New Branch"}
              </h4>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="dark:bg-meta-4 dark:hover:bg-meta-3 rounded-md bg-gray-200 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-300 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="branchForm"
                  className={`px-3 py-1.5 ${
                    isEditMode
                      ? "bg-primary hover:bg-primary/90"
                      : "bg-blue-600 hover:bg-blue-700"
                  } rounded-md text-sm text-white transition`}
                >
                  {isEditMode ? "Update" : "Create"}
                </button>
              </div>
            </div>

            <form
              id="branchForm"
              onSubmit={handleSubmit}
              className="max-h-[calc(100vh-200px)] overflow-y-auto px-6 py-4"
            >
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    readOnly
                    className="border-stroke dark:border-strokedark dark:bg-form-input w-full rounded border-[1.5px] bg-gray-100 px-5 py-3 text-sm transition outline-none cursor-not-allowed dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                    Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                    REF <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="ref"
                    value={formData.ref}
                    onChange={handleChange}
                    required
                    className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none dark:text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="HQ">HQ</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Pending">Pending</option>
                    <option value="History">History</option>
                  </select>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                    IDD
                  </label>
                  <input
                    type="text"
                    name="idd"
                    value={formData.idd}
                    readOnly
                    className="border-stroke dark:border-strokedark dark:bg-form-input w-full rounded border-[1.5px] bg-gray-100 px-5 py-3 text-sm transition outline-none cursor-not-allowed dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                    Phone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                    Email
                  </label>
                  <input
                    type="text"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                    Postcode
                  </label>
                  <input
                    type="text"
                    name="postcode"
                    value={formData.postcode}
                    onChange={handleChange}
                    className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    name="address_line1"
                    value={formData.address_line1}
                    onChange={handleChange}
                    className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    name="address_line2"
                    value={formData.address_line2}
                    onChange={handleChange}
                    className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                    Time Zone
                  </label>
                  <input
                    type="text"
                    name="time_zone"
                    value={formData.time_zone}
                    onChange={handleChange}
                    className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                    Currency Code
                  </label>
                  <input
                    type="text"
                    name="currencies_code"
                    value={formData.currencies_code}
                    readOnly
                    className="border-stroke dark:border-strokedark dark:bg-form-input w-full rounded border-[1.5px] bg-gray-100 px-5 py-3 text-sm transition outline-none cursor-not-allowed dark:text-white"
                  />
                </div>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    name="currencies_symbol"
                    value={formData.currencies_symbol}
                    readOnly
                    className="border-stroke dark:border-strokedark dark:bg-form-input w-full rounded border-[1.5px] bg-gray-100 px-5 py-3 text-sm transition outline-none cursor-not-allowed dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                    Registration No.
                  </label>
                  <input
                    type="text"
                    name="company_reg"
                    value={formData.company_reg}
                    onChange={handleChange}
                    className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                    Bank Account
                  </label>
                  <input
                    type="text"
                    name="bank_account"
                    value={formData.bank_account}
                    onChange={handleChange}
                    className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                    SWIFT
                  </label>
                  <input
                    type="text"
                    name="bank_swift"
                    value={formData.bank_swift}
                    onChange={handleChange}
                    className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none dark:text-white"
                  />
                </div>
              </div>
            </form>
          </div>
        )}

        <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark w-full rounded-sm border bg-white px-5 pt-6 pb-2.5 sm:px-7.5 xl:pb-1">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[170px]">
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  className="border-stroke dark:bg-boxdark focus:border-primary dark:border-strokedark w-full rounded-lg border bg-white px-4 py-2 text-sm outline-none focus-visible:shadow-none dark:text-white"
                >
                  <option value="">All Countries</option>
                  {getCountryOptions().map((country, index) => (
                    <option key={`country-${index}`} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-[150px]">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border-stroke dark:bg-boxdark focus:border-primary dark:border-strokedark w-full rounded-lg border bg-white px-4 py-2 text-sm outline-none focus-visible:shadow-none dark:text-white"
                >
                  <option value="">All Status</option>
                  {getStatusOptions().map((status, index) => (
                    <option key={`status-${index}`} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setCountryFilter("");
                  setStatusFilter("");
                }}
                className="border-stroke dark:bg-boxdark dark:hover:bg-meta-4 rounded-lg border bg-white px-4 py-2 text-sm text-black transition-colors hover:bg-gray-50 dark:text-white"
              >
                Reset
              </button>
            </div>

            {!loadingPermissions && canCreate(PERMISSION_PREFIX) && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                <svg
                  className="mr-2 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4v16m8-8H4"
                  ></path>
                </svg>
                Add New Branch
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
            </div>
          )}

          {!loading && !error && (
            <div className="max-w-full overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-2 dark:bg-meta-4 text-left">
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      Name
                    </th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      REF
                    </th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      Phone
                    </th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      City
                    </th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      Status
                    </th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBranches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-center">
                        No branches found
                      </td>
                    </tr>
                  ) : (
                    filteredBranches.map((branch, index) => (
                      <tr
                        key={branch.id}
                        className={`${
                          index % 2 === 0
                            ? "dark:bg-boxdark bg-white"
                            : "bg-gray-1 dark:bg-meta-4"
                        }`}
                      >
                        <td className="px-4 py-3">{branch.name}</td>
                        <td className="px-4 py-3">{branch.ref}</td>
                        <td className="px-4 py-3">{branch.idd ? `${branch.idd} ` : ""}{branch.phone}</td>
                        <td className="px-4 py-3">{branch.city}</td>
                        <td className="px-4 py-3">{branch.status}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => openEditModal(branch)}
                              className="text-primary hover:text-primary/90"
                              title="Edit branch"
                              disabled={!canEdit(PERMISSION_PREFIX)}
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
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                ></path>
                              </svg>
                            </button>

                            <button
                              onClick={() => markAsHistory(branch)}
                              className="text-danger hover:text-red-700"
                              title="Mark as history"
                              disabled={!canDelete(PERMISSION_PREFIX)}
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
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
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
          )}
        </div>
      </div>
    </DefaultLayout>
  );
}

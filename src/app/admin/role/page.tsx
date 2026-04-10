"use client";
import { useEffect, useState, useRef } from "react";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import usePermissions from "@/hooks/usePermissions";

const PERMISSION_PREFIX = "2.2";

interface Role {
  id: number;
  name: string;
  status: string;
}

export default function RolePage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    status: "Active",
  });

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);

  // Permissions
  const { canCreate, canEdit, canDelete, loadingPermissions } =
    usePermissions();

  // Filter states
  const [statusFilter, setStatusFilter] = useState("");

  // Refs
  const formRef = useRef<HTMLFormElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Fetch roles data
  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/role");

      if (!res.ok) {
        throw new Error("Failed to fetch roles");
      }

      const data = await res.json();
      setRoles(data.listRole);
      setFilteredRoles(data.listRole);
    } catch (err) {
      setError(
        "Error fetching roles: " +
          (err instanceof Error ? err.message : String(err)),
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchRoles();
  }, []);

  // Handle form input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle filter changes
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  // Open modal to create new role
  const openCreateModal = () => {
    setFormData({ name: "", status: "Active" });
    setCurrentRole(null);
    setIsEditMode(false);
    setIsModalOpen(true);

    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, 150);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Create new role
  const createRole = async (e: { preventDefault: () => void }) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await fetch("/api/admin/role/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage = responseData?.message || "Failed to create role";
        throw new Error(errorMessage);
      }

      fetchRoles();
      closeModal();
      setError(null);
    } catch (err) {
      setError(
        "Error creating role: " +
          (err instanceof Error ? err.message : String(err)),
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Open modal to edit role
  const openEditModal = (role: Role) => {
    setCurrentRole(role);

    setFormData({
      name: role.name || "",
      status: role.status || "Active",
    });

    setIsEditMode(true);
    setIsModalOpen(true);

    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollTop = 0;
      }
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, 150);
  };

  // Update role
  const updateRole = async (e: { preventDefault: () => void }) => {
    e.preventDefault();

    if (!currentRole) return;

    try {
      setLoading(true);

      const response = await fetch(
        `/api/admin/role/create?id=${currentRole.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage = responseData?.message || "Failed to update role";
        throw new Error(errorMessage);
      }

      await fetchRoles();
      closeModal();
      setError(null);
    } catch (err) {
      setError(
        "Error updating role: " +
          (err instanceof Error ? err.message : String(err)),
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Mark role as history
  const markAsHistory = (role: Role) => {
    if (!confirm("Are you sure you want to mark this role as history?")) {
      return;
    }

    try {
      setLoading(true);

      const historyData = {
        name: role.name,
        status: "History",
      };

      fetch(`/api/admin/role/create?id=${role.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(historyData),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            throw new Error(data.message || "Failed to mark role as history");
          }
          fetchRoles();
          setError(null);
        })
        .catch((err) => {
          setError(
            "Error marking role as history: " +
              (err instanceof Error ? err.message : String(err)),
          );
          console.error(err);
        })
        .finally(() => {
          setLoading(false);
        });
    } catch (err) {
      setError(
        "Error preparing data: " +
          (err instanceof Error ? err.message : String(err)),
      );
      console.error(err);
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (isEditMode) {
      updateRole(e);
    } else {
      createRole(e);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setStatusFilter("");
  };

  // Get status options from data
  const getStatusOptions = () =>
    [...new Set(roles.map((r) => r.status))].filter(Boolean).sort();

  // Apply filters whenever they change
  useEffect(() => {
    if (!roles.length) return;

    let filtered = [...roles];

    if (statusFilter) {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    setFilteredRoles(filtered);
  }, [statusFilter, roles]);

  return (
    <DefaultLayout>
      <Breadcrumb pageName="Role Management" />

      <div className="flex flex-col gap-5">
        {/* Create/Edit Form Card - Displayed on top when open */}
        {isModalOpen && (
          <div
            className={`rounded-sm border ${
              isEditMode
                ? "border-primary/50 dark:border-primary/30 shadow-lg"
                : "border-stroke dark:border-strokedark"
            } shadow-default dark:bg-boxdark mb-5 w-full bg-white`}
          >
            {/* Form header with edit indicator and action buttons */}
            <div className="border-stroke dark:border-strokedark flex items-center justify-between border-b px-6 py-4">
              <h4 className="flex items-center text-lg font-semibold text-black dark:text-white">
                {isEditMode ? (
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
                    Edit Role:{" "}
                    <span className="font-bold">
                      {" "}
                      ({currentRole?.id} - {formData.name})
                    </span>
                  </>
                ) : (
                  "Add New Role"
                )}
              </h4>

              {/* Action buttons moved to header */}
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
                  form="roleForm"
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
              id="roleForm"
              ref={formRef}
              onSubmit={handleSubmit}
              className="max-h-[calc(100vh-200px)] overflow-y-auto px-6 py-4"
            >
              <div className="mb-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Name field */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                      Name <span className="text-danger">*</span>
                    </label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 text-sm transition outline-none dark:text-white"
                      required
                    />
                  </div>

                  {/* Status field */}
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
                      <option value="Inactive">Inactive</option>
                      <option value="Pending">Pending</option>
                      <option value="History">History</option>
                    </select>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Role List Card - Always displayed */}
        <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark w-full rounded-sm border bg-white px-5 pt-6 pb-2.5 sm:px-7.5 xl:pb-1">
          {/* Header and Create Button */}
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <div className="min-w-[150px]">
                <select
                  name="status"
                  value={statusFilter}
                  onChange={handleFilterChange}
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

              {/* Reset Filters Button */}
              <button
                onClick={resetFilters}
                className="border-stroke dark:bg-boxdark dark:hover:bg-meta-4 rounded-lg border bg-white px-4 py-2 text-sm text-black transition-colors hover:bg-gray-50 dark:text-white"
              >
                Reset
              </button>
            </div>

            {/* Create button */}
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
                Add New Role
              </button>
            )}
          </div>

          {/* Error and Loading states */}
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

          {/* Role Table */}
          {!loading && !error && (
            <div className="max-w-full overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-2 dark:bg-meta-4 text-left">
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      ID
                    </th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      Name
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
                  {filteredRoles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center">
                        No roles found
                      </td>
                    </tr>
                  ) : (
                    filteredRoles.map((role, index) => (
                      <tr
                        key={index}
                        className={`${
                          index % 2 === 0
                            ? "dark:bg-boxdark bg-white"
                            : "bg-gray-1 dark:bg-meta-4"
                        }`}
                      >
                        <td className="px-4 py-3">{role.id}</td>
                        <td className="px-4 py-3">{role.name}</td>
                        <td className="px-4 py-3">{role.status}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-3">
                            {/* Edit Button */}
                            <button
                              onClick={() => openEditModal(role)}
                              className="text-primary hover:text-primary/90"
                              title="Edit role"
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

                            {/* Delete Button */}
                            <button
                              onClick={() => markAsHistory(role)}
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

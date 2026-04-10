"use client";

import { useEffect, useState } from "react";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import usePermissions from "@/hooks/usePermissions";

const PERMISSION_PREFIX = "2.1";

interface Department {
  id: number;
  name: string;
  ref: string;
  status: string;
}

export default function DepartmentPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentDepartment, setCurrentDepartment] = useState<Department | null>(
    null,
  );

  const [statusFilter, setStatusFilter] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    ref: "",
    status: "Active",
  });

  const { canCreate, canEdit, canDelete, loadingPermissions } =
    usePermissions();

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/department");

      if (!res.ok) {
        throw new Error("Failed to fetch departments");
      }

      const data = await res.json();
      setDepartments(data.listDepartment || []);
      setFilteredDepartments(data.listDepartment || []);
    } catch (err) {
      setError(
        "Error fetching departments: " +
          (err instanceof Error ? err.message : String(err)),
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    let filtered = [...departments];

    if (statusFilter) {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    setFilteredDepartments(filtered);
  }, [statusFilter, departments]);

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
    setFormData({ name: "", ref: "", status: "Active" });
    setCurrentDepartment(null);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const openEditModal = (department: Department) => {
    setCurrentDepartment(department);
    setFormData({
      name: department.name || "",
      ref: department.ref || "",
      status: department.status || "Active",
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const createDepartment = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      const response = await fetch("/api/admin/department/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          responseData?.message || "Failed to create department";
        throw new Error(errorMessage);
      }

      await fetchDepartments();
      closeModal();
      setError(null);
    } catch (err) {
      setError(
        "Error creating department: " +
          (err instanceof Error ? err.message : String(err)),
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDepartment) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/department/create?id=${currentDepartment.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          responseData?.message || "Failed to update department";
        throw new Error(errorMessage);
      }

      await fetchDepartments();
      closeModal();
      setError(null);
    } catch (err) {
      setError(
        "Error updating department: " +
          (err instanceof Error ? err.message : String(err)),
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsHistory = async (department: Department) => {
    if (!confirm("Are you sure you want to mark this department as history?")) {
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: department.name,
        ref: department.ref,
        status: "History",
      };

      const response = await fetch(
        `/api/admin/department/create?id=${department.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const responseData = await response.json().catch(() => null);
      if (!response.ok || responseData?.error) {
        throw new Error(responseData?.message || "Failed to mark as history");
      }

      await fetchDepartments();
      setError(null);
    } catch (err) {
      setError(
        "Error marking department as history: " +
          (err instanceof Error ? err.message : String(err)),
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (isEditMode) {
      await updateDepartment(e);
      return;
    }
    await createDepartment(e);
  };

  const getStatusOptions = () =>
    [...new Set(departments.map((d) => d.status))].filter(Boolean).sort();

  return (
    <DefaultLayout>
      <Breadcrumb pageName="Department Management" />

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
                  ? `Edit Department (${currentDepartment?.id ?? ""})`
                  : "Add New Department"}
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
                  form="departmentForm"
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
              id="departmentForm"
              onSubmit={handleSubmit}
              className="max-h-[calc(100vh-200px)] overflow-y-auto px-6 py-4"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                    <option value="Inactive">Inactive</option>
                    <option value="Pending">Pending</option>
                    <option value="History">History</option>
                  </select>
                </div>
              </div>
            </form>
          </div>
        )}

        <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark w-full rounded-sm border bg-white px-5 pt-6 pb-2.5 sm:px-7.5 xl:pb-1">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[150px]">
                <select
                  name="status"
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
                onClick={() => setStatusFilter("")}
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
                Add New Department
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
                      ID
                    </th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      Name
                    </th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      REF
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
                  {filteredDepartments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-center">
                        No departments found
                      </td>
                    </tr>
                  ) : (
                    filteredDepartments.map((department, index) => (
                      <tr
                        key={department.id}
                        className={`${
                          index % 2 === 0
                            ? "dark:bg-boxdark bg-white"
                            : "bg-gray-1 dark:bg-meta-4"
                        }`}
                      >
                        <td className="px-4 py-3">{department.id}</td>
                        <td className="px-4 py-3">{department.name}</td>
                        <td className="px-4 py-3">{department.ref}</td>
                        <td className="px-4 py-3">{department.status}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => openEditModal(department)}
                              className="text-primary hover:text-primary/90"
                              title="Edit department"
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
                              onClick={() => markAsHistory(department)}
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

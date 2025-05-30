"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Form from "@/components/FormElements/FormUni";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";

// Enhanced Column interface
interface Column {
  title: string;
  inputType?: string;
  valueKey: string;
  options?: OptionItem[];
  dependencies?: string[]; // Fields that this field depends on
  transform?: (value: any, allValues: Record<string, any>, options?: any[]) => any; // Transform function
  readOnly?: boolean; // Add this property
  required?: boolean; // Add this property
}

// Enhanced option interface
interface OptionItem {
  value: string;
  label: string;
  meta?: Record<string, any>; // Store additional data here
}

export default function CreateEmployeePage() {
  const [branches, setBranches] = useState<{ id: string; name: string; ref: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string; ref: string }[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false);
  const searchParams = useSearchParams();
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // Add this flag to track whether we're in edit mode
  const isEditMode = Boolean(searchParams.get("id"));

  useEffect(() => {
    const id = searchParams.get("id");

    async function fetchData() {
      try {
        // First fetch reference data (always needed)
        const referenceFetches = [
          fetch("/api/admin/branch"),
          fetch("/api/admin/department"),
          fetch("/api/admin/role"),
        ];
        
        // Conditionally add employee fetch when ID exists
        let employeeData = null;
        if (id) {
          // Add employee data fetch when editing
          const dataRes = await fetch("/api/admin/employee?id=" + id);
          if (!dataRes.ok) throw new Error("Failed to fetch employee data");
          employeeData = await dataRes.json();
        }
        
        // Process reference data fetches
        const [branchesRes, departmentsRes, rolesRes] = await Promise.all(referenceFetches);
        
        // Check reference responses
        if (!branchesRes.ok) throw new Error("Failed to fetch branches");
        if (!departmentsRes.ok) throw new Error("Failed to fetch departments");
        if (!rolesRes.ok) throw new Error("Failed to fetch roles");

        // Parse reference data
        const branchesData = await branchesRes.json();
        const departmentsData = await departmentsRes.json();
        const rolesData = await rolesRes.json();

        // Filter data to include only items with status = "Active"
        const activeBranches = branchesData.listBranch.filter(
          (branch: { status: string }) => branch.status === "Active"
        );
        const activeDepartments = departmentsData.listDepartment.filter(
          (department: { status: string }) => department.status === "Active"
        );
        const activeRoles = rolesData.listRole.filter(
          (role: { status: string }) => role.status === "Active"
        );

        // Update state with fetched data
        setBranches(activeBranches);
        setDepartments(activeDepartments);
        setRoles(activeRoles);

        // Process employee data only when editing
        if (id && employeeData) {
          // Find branch_id based on branch name
            const matchingBranch: { id: string; name: string; ref: string } | undefined = activeBranches.find(
            (b: { id: string; name: string; ref: string }) => b.name === employeeData.branch
            );
          if (matchingBranch) {
            employeeData.branch_id = matchingBranch.id.toString();
            employeeData.branch_ref = matchingBranch.ref;
          }

          // Find department_id based on department name
            const matchingDepartment: { id: string; name: string; ref: string } | undefined = activeDepartments.find(
            (d: { id: string; name: string; ref: string }) => d.name === employeeData.department
            );
          if (matchingDepartment) {
            employeeData.department_id = matchingDepartment.id.toString();
            employeeData.department_ref = matchingDepartment.ref;
          }

          // Find role_id based on name
            const matchingRole: { id: string; name: string } | undefined = activeRoles.find(
            (r: { id: string; name: string }) => r.name === employeeData.role
            );
          if (matchingRole) {
            employeeData.role_id = matchingRole.id.toString();
          }

          // Set employee data for edit mode
          setData([employeeData]);
          console.log("Processed employee data:", employeeData);
        } else {
          // For create mode, initialize with empty data
          setData([]);
        }

        // Mark that initial data is loaded
        setInitialDataLoaded(true);
      } catch (err) {
        setError("Error fetching data: " + (err as Error).message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (!hasFetchedData.current) {
      fetchData();
      hasFetchedData.current = true;
    }
  }, [searchParams]);

  // Add a function to fetch the next employee number
  const fetchNextEmployeeNumber = async (branch_id: number, department_id: number) => {
    try {
      const response = await fetch(
        `/api/admin/employee/count?branch_id=${branch_id}&department_id=${department_id}`
      );
      if (!response.ok) throw new Error("Failed to fetch next employee number");
      const data = await response.json();
      return data.nextNumber;
    } catch (error) {
      console.error("Error:", error);
      return 1; // Default to 1 if there's an error
    }
  };

  // Modify the UID generation useEffect
  useEffect(() => {
    // Only proceed if both branch and department are selected AND we're not in edit mode
    if (formData.branch_id && formData.department_id && !isEditMode) {
      const updateUID = async () => {
        const nextNumber = await fetchNextEmployeeNumber(
          formData.branch_id,
          formData.department_id
        );

        // Format the number with leading zeros (e.g., 001)
        const formattedNumber = nextNumber.toString().padStart(4, "0");

        setFormData((prev) => ({
          ...prev,
          uid: `${prev.branch_ref}${prev.department_ref}${formattedNumber}`,
        }));
      };

      updateUID();
    }
  }, [formData.branch_id, formData.department_id, isEditMode]);

  // When any field changes (except from initial load), clear the initialDataLoaded flag
  useEffect(() => {
    if (initialDataLoaded && Object.keys(formData).length > 0) {
      const handler = setTimeout(() => {
        // This timeout ensures we don't clear during the first render
        setInitialDataLoaded(false);
      }, 100);

      return () => clearTimeout(handler);
    }
  }, [formData,initialDataLoaded]);

  const columns: Column[] = [
    { title: "Name", inputType: "text", valueKey: "name", required: true },
    { title: "NRIC/Passport.no", inputType: "text", valueKey: "nric" },
    { title: "Phone", inputType: "text", valueKey: "phone" },
    { title: "Email", inputType: "text", valueKey: "email" },
    { title: "Address Line 1", inputType: "text", valueKey: "address_line1" },
    { title: "Address Line 2", inputType: "text", valueKey: "address_line2" },
    { title: "Postcode", inputType: "text", valueKey: "postcode" },
    { title: "City", inputType: "text", valueKey: "city" },
    { title: "State", inputType: "text", valueKey: "state" },
    { title: "Country", inputType: "text", valueKey: "country" },
    { title: "Bank Name", inputType: "text", valueKey: "bank_name" },
    { title: "Bank Account", inputType: "text", valueKey: "bank_account" },
    {
      title: "Branch",
      inputType: "select",
      valueKey: "branch_id",
      required: true,
      options: branches.map((branch) => ({
        value: branch.id.toString(),
        label: branch.name,
        meta: {
          ref: branch.ref,
        },
      })),
      transform: (value, allValues, options) => {
        const selected = options?.find((opt) => opt.value === value);
        if (selected?.meta) {
          return {
            branch_id: value,
            branch_ref: selected.meta.ref,
            branch_name: selected.label,
            // Don't set UID here, let the useEffect handle it
          };
        }
        return { branch_id: value };
      },
    },
    {
      title: "Department",
      inputType: "select",
      valueKey: "department_id",
      required: true,
      options: departments.map((department) => ({
        value: department.id.toString(),
        label: department.name,
        meta: {
          ref: department.ref,
        },
      })),
      transform: (value, allValues, options) => {
        const selected = options?.find((opt) => opt.value === value);
        if (selected?.meta) {
          return {
            department_id: value,
            department_ref: selected.meta.ref,
            department_name: selected.label,
            // Don't set UID here, let the useEffect handle it
          };
        }
        return { department_id: value };
      },
    },
    {
      title: "Role",
      inputType: "select",
      valueKey: "role_id",
      required: true,
      options: roles.map((role) => ({
        value: role.id.toString(),
        label: role.name,
      })),
    },

    { 
      title: "UID", 
      inputType: "text", 
      valueKey: "uid", 
      readOnly: !isEditMode // Make it read-only when creating new (not in edit mode)
    },
    {
      title: "Status",
      inputType: "select",
      valueKey: "status",
      required: true,
      options: [
        { value: "Active", label: "Active" },
        { value: "Inactive", label: "Inactive" },
        { value: "Pending", label: "Pending" },
        { value: "History", label: "History" },
      ],
    },
  ];

  return (
    <DefaultLayout>
      <Breadcrumb
        pageName={data.length ? `Edit Employee (${data[0]?.id || "N/A"})` : "New Employee"}
      />
      <Form
        columns={columns}
        data={data}
        formData={formData}
        setFormData={setFormData}
        loading={loading}
        submitUrl="/api/admin/employee/create"
        redirectUrl="/admin/employee"
      />
    </DefaultLayout>
  );
}

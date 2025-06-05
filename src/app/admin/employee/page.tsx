"use client";
import { useEffect, useState, useRef } from "react";
import Tables from "@/components/Tables";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import usePermissions from "@/hooks/usePermissions";

const MENU = "1";
const SUBMENU = "4";
const PERMISSION_PREFIX = `${MENU}.${SUBMENU}`;

export default function EmployeePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false);
  const { canCreate, loadingPermissions } = usePermissions(); // Use the custom hook
  const canCreateButton = canCreate(MENU, SUBMENU);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/employee");
      if (!res.ok) throw new Error("Failed to fetch employee");

      const data = await res.json();
      // Format rows to combine data
      const formattedRows = data.listEmployee.map((employee: any) => ({
        ...employee,
        id: `${employee.id} / ${employee.uid}`,
        branch: `${employee.branch}`,
        department: `${employee.department}`,
        name: `${employee.name} / ${employee.nric}`,
        contact: `${employee.phone} / ${employee.email}`,
        address: `${employee.address_line1}, ${employee.address_line2},${employee.city}, ${employee.state}, ${employee.country}`,
        bank: `${employee.bank_name}, ${employee.bank_account}`,
        position: `${employee.branch} / ${employee.department} / ${employee.role}`,
        status: `${employee.status}`,
      }));
      setData(formattedRows); // Assign the formatted rows
    } catch (err) {
      setError("Error fetching data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasFetchedData.current) {
      fetchData();
      hasFetchedData.current = true;
    }
  }, []);

  const columns = [
    { key: "id", title: "ID / UID" },
    { key: "name", title: "Name / NRIC" }, // Use combined name and ref
    { key: "contact", title: "Contact" }, // Use combined contact
    { key: "address", title: "Address" }, // Use combined address
    { key: "bank", title: "Bank" }, // Use combined bank details
    { key: "position", title: "Position" },
    { key: "status", title: "Status" },
  ];

  return (
    <DefaultLayout>
      <Breadcrumb pageName="Employee List" />
      {loading && <div className="p-4">Loading Employee List...</div>}
      {error && <div className="p-4 text-red-500">Error: {error}</div>}
      {!loading && !error && (
        <Tables
          columns={columns}
          data={data}
          filterKeys={["branch", "department", "status"]}
          createLink="/admin/employee/create"
          showCreateButton={!loadingPermissions && canCreateButton} // Conditionally set showCreateButton
          createPermissionPrefix={PERMISSION_PREFIX}
          editPermissionPrefix={PERMISSION_PREFIX}
          deletePermissionPrefix={PERMISSION_PREFIX}
          monitorPermissionPrefix={PERMISSION_PREFIX}
        />
      )}
    </DefaultLayout>
  );
}

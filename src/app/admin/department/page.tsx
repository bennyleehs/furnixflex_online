"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Tables from "@/components/Tables";
import React, { useEffect, useState, useRef } from "react";
import usePermissions from "@/hooks/usePermissions"; //custom hook

const MENU = "1";
const SUBMENU = "0";
const PERMISSION_PREFIX = `${MENU}.${SUBMENU}`;

export default function DepartmentPage() {
  const [dept, setDept] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false); // Track if data has been fetched
  const { canCreate, loadingPermissions } = usePermissions(); // Use the custom hook
  const canCreateButton = canCreate(MENU, SUBMENU);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/department");
      if (!res.ok) throw new Error("Failed to fetch departments");

      const data = await res.json();
      // Format rows to combine data
      // const formattedRows = data.listDepartment.map((department: any) => ({
      //   ...department,
      //   name: `${department.name} `,
      //   ref: `${department.ref} `,
      //   status: `${department.status} `,
      // }));
      // setData(formattedRows); // Assign the formatted rows
      setDept(data.listDepartment); // store raw data
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
    { key: "id", title: "ID" },
    { key: "name", title: "Name" },
    { key: "ref", title: "Reference" },
    { key: "status", title: "Status" },
  ];

  const modalColumns = [
    { group: "Basic Info", key: "id", title: "ID" },
    { group: "Basic Info", key: "name", title: "Name" },
    { group: "Basic Info", key: "ref", title: "Reference Abbreviation" },
    { group: "Basic Info", key: "status", title: "Status" },
  ];

  return (
    <DefaultLayout>
      <Breadcrumb pageName="Department List" />
      {loading && <div className="p-4">Loading Departments...</div>}
      {error && <div className="p-4 text-red-500">Error: {error}</div>}
      {!loading && !error && (
        <Tables
          columns={columns}
          modalColumns={modalColumns}
          data={dept}
          createLink="/admin/department/create"
          filterKeys={["status"]}
          showCreateButton={!loadingPermissions && canCreateButton} // Conditionally set showCreateButton
          createPermissionPrefix={PERMISSION_PREFIX}
          editPermissionPrefix={PERMISSION_PREFIX}
          deletePermissionPrefix={PERMISSION_PREFIX}
          monitorPermissionPrefix={PERMISSION_PREFIX}
          infoEndpoint="/api/admin/department"
        />
      )}
    </DefaultLayout>
  );
}

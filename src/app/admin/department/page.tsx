"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Tables from "@/components/Tables";
import React, { useEffect, useState, useRef } from "react";

export default function DepartmentPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false); // Track if data has been fetched

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/department");
      if (!res.ok) throw new Error("Failed to fetch departments");

      const data = await res.json();
      // Format rows to combine data
      const formattedRows = data.listDepartment.map((department: any) => ({
        ...department,
        name: `${department.name} `,
        ref: `${department.ref} `,
        status: `${department.status} `,
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
    { key: "id", title: "ID" },
    { key: "name", title: "Name" },
    { key: "ref", title: "REF" },
    { key: "status", title: "Status" },
  ];

  return (
    <DefaultLayout>
      <Breadcrumb pageName="Department List" />
      {loading && <div className="p-4">Loading Departments...</div>}
      {error && <div className="p-4 text-red-500">Error: {error}</div>}
      {!loading && !error && (
      <Tables
        columns={columns}
        data={data}
        filterKeys={["status"]}
        createLink="/admin/department/create"
      />)}
    </DefaultLayout>
  );
}

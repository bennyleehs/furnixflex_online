"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Form from "@/components/FormElements/FormUni";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";

export default function RolePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false);
  const searchParams = useSearchParams();
  const [data, setData] = useState<Record<string, any>[]>([]);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id && !hasFetchedData.current) {
      async function fetchData() {
        try {
          const res = await fetch(`/api/admin/role?id=${id}`);
          if (!res.ok) throw new Error("Failed to fetch Role data");
          const data = await res.json();
          setData([data]);
        } catch (err) {
          setError("Error fetching Role data");
          console.error(err);
        }
      }
      fetchData();
      hasFetchedData.current = true;
    }

    setLoading(false);
  }, [searchParams]);

  const columns = [
    { title: "Name", inputType: "text", valueKey: "name" },
    {
      title: "Status",
      inputType: "select",
      valueKey: "status",
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
        pageName={data.length ? `Edit Role (${data[0]?.id || "N/A"})` : "New Role"} 
      />
      <Form
        columns={columns}
        data={data} // Pass the fetched data
  //      formData={data} // Pass the fetched data
        loading={loading}
        submitUrl="/api/admin/role/create"
        redirectUrl="/admin/role"
      />
    </DefaultLayout>
  );
}

"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import FormBranch from "@/components/FormElements/FormUni";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";

export default function DepartmentPage() {
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
          const res = await fetch(`/api/admin/department?id=${id}`);
          if (!res.ok) throw new Error("Failed to fetch Department data");
          const data = await res.json();
          setData([data]);
        } catch (err) {
          setError("Error fetching Department data");
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
    { title: "REF", inputType: "text", valueKey: "ref" },
    { title: "Status", inputType: "select", valueKey: "status",
       options: [
      { label: "Active" },
      { label: "Inactive" },
      { label: "Pending" },
      { label: "History" }
    ] },
  ];


  return (
    <DefaultLayout>
      <Breadcrumb 
        pageName={data.length ? `Edit Department (${data[0]?.id || "N/A"})` : "New Department"} 
      />
      <FormBranch
        columns={columns}
        data={data} // Pass the fetched data
        loading={loading}
        submitUrl="/api/admin/department/create"
        redirectUrl="/admin/department"
      />
    </DefaultLayout>
  );
}

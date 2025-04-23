"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import FormClock from "@/components/FormElements/FormClock";
import { useEffect, useState, useRef } from "react";

interface Branch {
  branchId: number;
  branchName: string;
}

interface Department {
  departmentId: number;
  departmentName: string;
}

export default function ClocksPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false);

  useEffect(() => {
    async function fetchBranchesDepartments() {
      try {
        const res = await fetch("/api/admin/branch_name");
        if (!res.ok) throw new Error("Failed to fetch branches");
        const branchesData = await res.json();
        setBranches(branchesData.listBranches);

        const resp = await fetch("/api/admin/department_name");
        if (!resp.ok) throw new Error("Failed to fetch departments");
        const departmentsData = await resp.json();
        setDepartments(departmentsData.listDepartments);
        
      } catch (err) {
        setError("Error fetching data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (!hasFetchedData.current) {
      fetchBranchesDepartments();
      hasFetchedData.current = true;
    }
  }, []);

    // Combine the data
    const combinedData = [...branches, ...departments];

  const columns = [
    { title: "Branch", inputType: "select", valueKey: "branchName", idKey: "branchId"},
    { title: "Department", inputType: "select", valueKey: "departmentName", idKey: "departmentId"},
    { title: "Work-Start", inputType: "time" },
    { title: "Work-End", inputType: "time" },
    { title: "Lunch-Start", inputType: "time" },
    { title: "Lunch-End", inputType: "time" },
    { title: "Allowance-In", inputType: "number", min: 0, max: 60  },
  ];

  return (
    <DefaultLayout>
      <Breadcrumb pageName="New Attendance" />
      <FormClock columns={columns} data={combinedData} loading={loading}/>
    </DefaultLayout>
  );
}

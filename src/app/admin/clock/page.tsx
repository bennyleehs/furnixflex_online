"use client";

import React, { useState, useEffect, useRef } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Tables from "@/components/Tables";

const ClockPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/admin/clock");
      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }
      const result = await response.json();
      setData(result.listClocks);
    } catch (error) {
      setError("Error fetching data");
      console.error("Error fetching data:", error);
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
    { key: "branch_name", title: "Branch" },
    { key: "department_name", title: "Department" },
    { key: "work_start", title: "Work Start" },
    { key: "work_end", title: "Work End" },
    { key: "lunch_start", title: "Lunch Start" },
    { key: "lunch_end", title: "Lunch End" },
    { key: "allowance_in", title: "Allowance In" },
    { key: "status", title: "Status" },
  ];

  return (
    <DefaultLayout>
      <Breadcrumb pageName="Clocks Fetch" />
      <Tables
        columns={columns}
        data={data}
        detailTitle="Clock Details"
        createLink="/admin/clock/create"
        deleteLink="/api/admin/clock/delete"
        fetchData={fetchData}
      />
    </DefaultLayout>
  );
};

export default ClockPage;

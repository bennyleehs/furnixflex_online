"use client";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Tables from "@/components/Tables";
import { useEffect, useState, useRef } from "react";

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false);

  const fetchData = async () => {
    // some function & queries
  };

  useEffect(() => {
    if (!hasFetchedData.current) {
      fetchData();
      hasFetchedData.current = true;
    }
  }, []);

  const columns = [
    { key: "id", title: "ID" },
    { key: "name", title: "Name / REF" },
    { key: "contact", title: "Contact" },
    { key: "address", title: "Address" },
    { key: "status", title: "Status" },
  ];

  return (
    <DefaultLayout>
      <Breadcrumb pageName="Packages" />
      <Tables
        columns={columns}
        data={packages}
        createLink="/admin/packages/create"
        filterKeys={["size"]}
      />
    </DefaultLayout>
  );
}

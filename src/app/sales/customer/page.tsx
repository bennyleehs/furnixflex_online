"use client";

import { useEffect, useState } from "react";
import Tables from "@/components/Tables";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import ComingSoon from "@/components/DisplayPage/ComingSoon";

interface Customers {
  cust_id: number;
  cust_base: string;
  cust_name: string;
  cust_address: string;
  cust_phone: string;
  cust_email: string;
}

export default function CustomerPage() {
  const [custs, setCusts] = useState<Customers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCustomer() {
      try {
        const res = await fetch("/api/sales/customer");
        if (!res.ok) throw new Error("Failed to fetch customers");

        const data = await res.json();
        setCusts(data.listCust); // Assign the fetched list
      } catch (err) {
        setError("Error fetching data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchCustomer();
  }, []);

  const columns = [
    { key: "cust_id", title: "ID" },
    { key: "cust_base", title: "Base" },
    { key: "cust_name", title: "Name" },
    { key: "cust_address", title: "Address" },
    { key: "cust_phone", title: "Phone" },
    { key: "cust_email", title: "Email" },
  ];

  // if (loading) return <p>Loading branches...</p>;
  // if (error) return <p className="text-red-500">{error}</p>;

  return (
    <DefaultLayout>
      <Breadcrumb pageName="Customer" />
      {/* <h1 className="mb-4 text-xl font-bold">Branches</h1> */}
      {/* <Tables 
        columns={columns} 
        data={custs} 
        createLink={`/sales/customer/create`}
        filterKeys={["status"]}
      /> */}
      <ComingSoon/>
    </DefaultLayout>
  );
}

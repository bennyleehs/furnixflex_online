"use client";
import { useEffect, useState, useRef } from "react";
import Tables from "@/components/Tables";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

export default function BranchPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/branch");
      if (!res.ok) throw new Error("Failed to fetch branches");

      const data = await res.json();
      // Format rows to combine data
      const formattedRows = data.listBranch.map((branch: any) => ({
        ...branch,
        name: `${branch.name} / ${branch.ref}`, // Combine name and ref
        contact: `${branch.idd} / ${branch.phone} / ${branch.email}`, // Combine phone and email
        address: `${branch.address_line1}, ${branch.address_line2}, ${branch.city}, ${branch.state}, ${branch.country}`, // Combine address fields
        country: branch.country, // Keep country as a separate field for filtering
        company: `${branch.company_name} / ${branch.company_reg}`, // Combine company name and registration
        bank: `${branch.bank_name} / ${branch.bank_account} / ${branch.bank_swift}`, // Combine bank details
        time_zone: `${branch.time_zone} / ${branch.currencies_code} (${branch.currencies_symbol})`, // Combine time zone and currency
      }));
      setBranches(formattedRows); // Assign the formatted rows

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
    { key: "name", title: "Name / REF" }, // Use combined name and ref
    { key: "contact", title: "Contact" }, // Use combined contact
    { key: "address", title: "Address" }, // Use combined address
    { key: "company", title: "Company / REG" }, // Use combined company
    { key: "bank", title: "Bank / Account / Swift" }, // Use combined bank details
    { key: "time_zone", title: "Time / Currencies" }, // Use combined time zone and currency
    { key: "status", title: "Status" },
  ];

  if (loading) return <p>Loading branches...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <DefaultLayout>
      <Breadcrumb pageName="Branch List" />
      <Tables 
        columns={columns} 
        data={branches} 
        createLink="/admin/branch/create"
        filterKeys={["country", "status"]}
      />
    </DefaultLayout>
  );
}

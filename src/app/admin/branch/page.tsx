// src/app/admin/branch/page.tsx
"use client";
import { useEffect, useState, useRef } from "react";
import Tables from "@/components/Tables";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import usePermissions from "@/hooks/usePermissions"; //custom hook

const title = "Branch";
const MENU = "1";
const SUBMENU = "0";
const PERMISSION_PREFIX = `${MENU}.${SUBMENU}`;

export default function BranchPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false);
  const { canCreate, loadingPermissions } = usePermissions(); // Use the custom hook
  const canCreateButton = canCreate(MENU, SUBMENU);

  console.log("Checking canCreate with menu:", MENU, "and submenu:", SUBMENU);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/branch");
      if (!res.ok) throw new Error("Failed to fetch branches");

      const data = await res.json();
      // Format rows to combine data
      // const formattedRows = data.listBranch.map((branch: any) => ({
      //   ...branch,
      //   name: `${branch.name} / ${branch.ref}`,
      //   contact: `${branch.idd} / ${branch.phone} / ${branch.email}`,
      //   address: `${branch.address_line1}, ${branch.address_line2}, ${branch.city}, ${branch.state}, ${branch.country}`,
      //   country: branch.country,
      //   company: `${branch.company_name} / ${branch.company_reg}`,
      //   bank: `${branch.bank_name} / ${branch.bank_account} / ${branch.bank_swift}`,
      //   time_zone: `${branch.time_zone} / ${branch.currencies_code} (${branch.currencies_symbol})`,
      // }));
      // setBranches(formattedRows); // Assign the formatted rows
      setBranches(data.listBranch); // store raw data
    } catch (err) {
      setError("Error fetching data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log(
      "BranchPage: canCreateButton value:",
      canCreateButton,
      "loadingPermissions:",
      loadingPermissions,
    );
    if (!hasFetchedData.current) {
      fetchData();
      hasFetchedData.current = true;
    }
  }, [canCreateButton, loadingPermissions]);

  // const columns = [
  //   { key: 'id', title: 'ID' },
  //   { key: 'name', title: 'Name / REF' }, // Use combined name and ref
  //   { key: 'contact', title: 'Contact' }, // Use combined contact
  //   { key: 'address', title: 'Address' }, // Use combined address
  //   { key: 'company', title: 'Company / REG' }, // Use combined company
  //   { key: 'bank', title: 'Bank / Account / Swift' }, // Use combined bank details
  //   { key: 'time_zone', title: 'Time / Currencies' }, // Use combined time zone and currency
  //   { key: 'status', title: 'Status' },
  // ];

  // const columns = [
  //   { key: "id", title: "ID" },
  //   { key: "name", title: "Name" },
  //   { key: "ref", title: "REF" },
  //   { key: "phone", title: "Phone" },
  //   { key: "city", title: "City" },
  //   { key: "status", title: "Status" },
  // ];

  const columns = [
  // { key: "id", title: "ID" },
  { key: "name", title: "Name" },
  { key: "ref", title: "REF" },
  { key: "phone", title: "Phone" },
  { key: "city", title: "City" },
  { key: "status", title: "Status" },
];

const modalColumns = [
  { group: "Basic Info", key: "id", title: "ID" },
  { group: "Basic Info", key: "name", title: "Name" },
  { group: "Basic Info", key: "ref", title: "Reference" },
  { group: "Basic Info", key: "status", title: "Status" },
  
  { group: "Contact", key: "idd", title: "Country Code" },
  { group: "Contact", key: "phone", title: "Phone" },
  { group: "Contact", key: "email", title: "Email" },
  
  { 
    group: "Address", 
    key: "full_address", 
    title: "Full Address",
    format: (_: any, row: any) => (
      <div className="whitespace-pre-line">
        {`${row.address_line1}\n${row.address_line2}\n${row.city}, ${row.state}\n${row.postcode}, ${row.country}`}
      </div>
    )
  },
  
  { group: "Company", key: "company_name", title: "Company Name" },
  { group: "Company", key: "company_reg", title: "Registration" },
  
  { group: "Bank", key: "bank_name", title: "Bank Name" },
  { group: "Bank", key: "bank_account", title: "Account Number" },
  { group: "Bank", key: "bank_swift", title: "SWIFT Code" },
  
  { group: "Settings", key: "time_zone", title: "Time Zone" },
  { group: "Settings", key: "currencies_code", title: "Currency" },
];

  return (
    <DefaultLayout>
      <Breadcrumb pageName={title} />
      {loading && <p>Loading Branches...</p>}
      {error && <p className="text-red-500">{error}</p>}
      <Tables
        columns={columns}
        modalColumns={modalColumns}
        data={branches}
        createLink="/admin/branch/create"
        filterKeys={["country", "status"]}
        showCreateButton={!loadingPermissions && canCreateButton} // Conditionally set showCreateButton
        createPermissionPrefix={PERMISSION_PREFIX}
        editPermissionPrefix={PERMISSION_PREFIX}
        deletePermissionPrefix={PERMISSION_PREFIX}
        monitorPermissionPrefix={PERMISSION_PREFIX}
        infoEndpoint="/api/admin/branch"
      />
    </DefaultLayout>
  );
}

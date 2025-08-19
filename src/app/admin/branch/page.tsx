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
      ),
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
        modalTitle="Branch"
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
